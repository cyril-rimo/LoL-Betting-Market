import asyncio
from fastapi import FastAPI, WebSocket
import uvicorn

app = FastAPI()

active_connections = []


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    active_connections.append(websocket)
    # print("Active connections:", len(active_connections))
    print("Client connected")

    try:
        while True:
            await websocket.receive_text()
    except:
        active_connections.remove(websocket)
        print("Client disconnected")


async def broadcast_loop():
    # Wait until at least one client connects
    while True:
        if active_connections:
            message = {
                "type": "market_created",
                "url": "https://manifold.markets/CyrilRimo/will-i-win-my-next-league-of-legend-h9zs9yqPss?r=Q3lyaWxSaW1v",
            }

            print("Broadcasting:", message)

            if len(active_connections) > 0:
                for ws in active_connections:
                    try:
                        await ws.send_json(message)
                    except Exception as e:
                        print("Send failed:", e)
            else:
                print("No client to connect to.")

        await asyncio.sleep(3)  # broadcast every 3 seconds


@app.on_event("startup")
async def startup_event():
    asyncio.create_task(broadcast_loop())


if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8000)
