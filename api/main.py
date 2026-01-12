from wmanifold import ManifoldClient
from wriot import RiotClient, LoLEventListener, verify_match, get_current_champion
from multiprocessing import Queue
from fastapi import FastAPI, WebSocket
from wsManager import WebSocketManager
from threading import Thread
import time, json, asyncio
from config import Config

DEBUG = True if Config.ENVIRONMENT == "development" else False
app = FastAPI()
wsManager = WebSocketManager()

event_loop = None  # avoid NameError
event_queue = Queue()  # new queue for event listener. see below.

riot_client = RiotClient()
manifold_client = ManifoldClient()
listener = LoLEventListener(queue=event_queue)


@app.on_event("startup")
async def startup():
    """
    Generates event loop upon app start (see Uvicorn) and
    appends listener and react threads to it.
    """
    global event_loop
    event_loop = asyncio.get_running_loop()  # gets existing loop

    # ensure the app's event loop is used
    t1 = Thread(target=listener.listen, daemon=True)
    t2 = Thread(
        target=react, args=(event_queue, riot_client, manifold_client), daemon=True
    )

    t1.start()
    t2.start()


# when another application (i.e. React frontend) navigates to the /ws endpoint
# the backend app accepts the websocket connection, acknowledging this.
#
# push-based websocket endpoint allows frontend to connect, which
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    wsManager.active_connections.append(websocket)
    print("Client connected")

    try:
        # Keep the connection alive forever
        while True:
            await asyncio.sleep(3600)  # sleep instead of waiting for messages
    except Exception:
        print("Client disconnected")
    finally:
        if websocket in wsManager.active_connections:
            wsManager.active_connections.remove(websocket)


@app.on_event("shutdown")
async def shutdown_event():
    for ws in wsManager.active_connections:
        await ws.close()


# Create reactor pattern to handle events
def react(queue, riot_client=None, manifold_client=None):
    # Debugging features, particularly logging
    log = None
    if DEBUG:
        log = open("event_log.txt", "a")

    # try block A closes the log after the program execution
    try:
        market_id = None  # market id for the to-be-created market

        # reactor loop
        while True:
            event = queue.get()  # queue provided by a listener object

            # debugging feature to write events to log
            if log:
                log.write(json.dumps(event) + "\n")
                log.flush()

            # Assumes that every event has an "EventName", "EventID"
            event_name = event.get("EventName")
            event_id = event.get("EventID", -1)  # safe default

            # GameStart missing but other events arriving
            alternative_condition = (event_id >= 1) and (market_id is None)

            # --- MARKET CREATION ---
            if event_name == "GameStart" and market_id is None:
                champion = event.get(
                    "ChampionName"
                )  # GameStart event has a "ChampionName" field
                market_id = manifold_client.create_league_market(champion_name=champion)

                market_url = manifold_client.get_market_url(market_id)

                if log:

                    log.write(
                        f"Created Market with ID: {market_id}\nView at {market_url}\n"
                    )
                    log.flush()

                asyncio.run_coroutine_threadsafe(
                    wsManager.broadcast_after_client(
                        {
                            "type": "market_created",
                            "url": market_url,
                        }
                    ),
                    event_loop,
                )

            elif alternative_condition:
                champion = get_current_champion(
                    riotId="SirAgathon#NA1"
                )  # get champion name using alternative method
                market_id = manifold_client.create_league_market(champion_name=champion)

                if log:
                    market_url = manifold_client.get_market_url(market_id)
                    log.write(
                        f"Created Market with ID: {market_id}\nView at {market_url}\n"
                    )
                    log.flush()

                asyncio.run_coroutine_threadsafe(
                    wsManager.broadcast_after_client(
                        {
                            "type": "market_created",
                            "url": market_url,
                        }
                    ),
                    event_loop,
                )

            # --- GAME END / LISTENER STOP ---
            if event_name in ("GameEnd", "ListenerStopped"):
                asyncio.run_coroutine_threadsafe(
                    wsManager.broadcast_after_client({"type": "STOP"}),
                    event_loop,
                )  # message to reset the front end page
                print("Listener stopped. Waiting 45 seconds...")
                time.sleep(45)

                # Assume GameEnd event has "StartTime" and "EndTime"
                start_time = event.get("StartTime")
                end_time = event.get("EndTime")

                if market_id is None:
                    if log:
                        log.write("ERROR: No market created before GameEnd.\n")
                    return

                # Get match information and resolve the betting market on manifold
                resolved = False
                while not resolved:
                    match_info = riot_client.get_recent_match().get("info", {})

                    # Check if the match from the web api matches the match just played using the StartTime or EndTime fields
                    is_valid_match = verify_match(
                        start_time,
                        end_time,
                        match_info,
                    )

                    if is_valid_match:
                        try:
                            result = riot_client.get_game_result(match_info)
                            gameID = match_info.get("gameId", "Unknown")

                            # Add game history for participants to verify match outcome
                            manifold_client.post_closing_remarks(
                                market_id,
                                f"View game details https://www.leagueofgraphs.com/match/NA/{gameID}.",
                            )
                        except AttributeError as e:
                            manifold_client.post_closing_remarks(
                                market_id, "Game details will be uploaded shortly."
                            )
                        finally:
                            # Resolve the manifold market with the result
                            manifold_client.resolve_league_market(market_id, result)
                            resolved = True

                    time.sleep(30)

                if DEBUG:
                    print("React thread exiting due to ListenerStopped event")
                break

    finally:
        if log:
            log.close()


if __name__ == "__main__":
    import uvicorn

    # Start FastAPI server in main thread
    uvicorn.run("main:app", host="0.0.0.0", port=8000)
