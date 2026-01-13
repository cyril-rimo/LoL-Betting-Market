import os, json, time
import requests, urllib3
from typing import Optional, Dict, List
from urllib.parse import quote
from datetime import timedelta
from config import Config

# wriot.py


# Disable SSL warnings for the local Riot API
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
DEBUG = True if Config.ENVIRONMENT == "development" else False


class RiotClient:
    """
    Minimal Riot Games API client.
    - Reads API key from `auth.txt` by default (single line with the key).
    - get_game_id_from_web(region, summoner_name): uses Summoner V4 + Spectator V4 to return gameId.
    - get_local_game_info(): queries the local Live Client Data API (127.0.0.1:2999).
    """

    def __init__(self, timeout: float = 5.0):
        self.api_key = Config.RIOT_API_KEY
        self.timeout = timeout
        self.session = requests.Session()
        if self.api_key:
            self.session.headers.update({"X-Riot-Token": self.api_key})
        self.tagline = Config.TAGLINE
        self.region = Config.REGION
        self.summoner_name = Config.SUMMONER_NAME
        self._puuid = self._get_puuid()

        print(
            f"RiotClient initialized with region {self.region} and summoner {self.summoner_name}."
        )

    def _web_base(self, region: str) -> str:
        region = region.lower()
        return f"https://{region}.api.riotgames.com"

    def _get_puuid(self) -> str:
        """Return the PUUID for a Riot ID (game name + tag line)."""

        if not self.summoner_name or not self.tagline:
            raise ValueError("summoner_name and tagline are required")

        game = quote(self.summoner_name, safe="")
        tag = quote(self.tagline, safe="")
        url = f"{self._web_base(self.region)}/riot/account/v1/accounts/by-riot-id/{game}/{tag}"

        resp = self.session.get(url, timeout=self.timeout)
        resp.raise_for_status()
        data = resp.json()
        puuid = data.get("puuid")
        if not puuid:
            raise ValueError("PUUID not found in Riot response")
        return puuid

    def get_live_match_id(self, retries=5) -> Optional[int]:
        """Continuously poll until a 200 is returned from the spectator endpoint, then return gameId."""

        url = f"{self._web_base('na1')}/lol/spectator/v5/active-games/by-summoner/{self._puuid}"

        while retries > 0:
            resp = self.session.get(url, timeout=self.timeout)
            if resp.status_code == 200:
                data = resp.json()
                game_id = data.get("gameId")
                if game_id:
                    return game_id
                else:
                    raise ValueError("gameId not found in Riot response")
            elif resp.status_code == 404:
                print("Player is not currently in a live match. Retrying...")
            else:
                print(f"Error: {resp.status_code} - {resp.text}")
            retries -= 1
            time.sleep(181)  # Wait 3 minutes before retrying
        return None

    def get_recent_match(self) -> Dict:
        """Fetch the most recent match for the player using Match V5 API."""

        url = f"{self._web_base(self.region)}/lol/match/v5/matches/by-puuid/{self._puuid}/ids?start=0&count=1"  # Gets list of match ids by puuid
        resp = self.session.get(url, timeout=self.timeout)
        resp.raise_for_status()
        match_ids = resp.json()
        if not match_ids:
            raise ValueError("No recent matches found for the player")

        match_id = match_ids[0]
        match_url = f"{self._web_base(self.region)}/lol/match/v5/matches/{match_id}"  # Get match by match id
        match_resp = self.session.get(match_url, timeout=self.timeout)
        match_resp.raise_for_status()
        return match_resp.json()

    def get_game_result(self, match_data: dict) -> str:
        # assume match_data is the info part of the match data
        win = None
        for participant in match_data.get("participants", []):
            if participant.get("puuid") == self._puuid:
                win = participant.get("win")
                break

        return win


class LoLEventListener:
    def __init__(self, queue):
        self.queue = queue
        self.url = "https://127.0.0.1:2999/liveclientdata/eventdata"
        self.seen_event_ids = set()
        self.is_running = True
        self.start_time = self.end_time = -1.0

    def format_timestamp(self, seconds: float) -> str:
        """Converts raw seconds into a MM:SS format."""
        return str(timedelta(seconds=int(seconds)))[2:]

    def format_event(self, event: dict, **kwargs) -> dict:
        return {**event, **kwargs}

    def listen(self, interval=1.0):
        ingame = False
        print(f"[*] Monitoring game events every {interval}s...")

        try:
            while self.is_running:
                try:
                    response = requests.get(self.url, verify=False, timeout=2)

                    if response.status_code == 200:
                        ingame = True
                        data = response.json()
                        events = data.get("Events", [])

                        for event in events:
                            event_id = event.get("EventID")

                            # Skip events we've already processed
                            if event_id in self.seen_event_ids:
                                continue

                            name = event.get("EventName")

                            # Mark event as seen
                            self.seen_event_ids.add(event_id)

                            # Handle GameStart
                            if name == "GameStart":
                                self.start_time = int(time.time() * 1000)
                                newEvent = self.format_event(
                                    event,
                                    StartTime=self.start_time,
                                    ChampionName=get_current_champion(
                                        riotId=Config.RIOT_ID
                                    ),  # hard-coded
                                )
                                self.queue.put(newEvent)

                            # Handle GameEnd
                            elif name == "GameEnd":
                                self.end_time = int(time.time() * 1000)
                                newEvent = self.format_event(
                                    event,
                                    StartTime=self.start_time,
                                    EndTime=self.end_time,
                                    Reason="GameEnd event",
                                )
                                self.queue.put(newEvent)
                                self.is_running = False
                                break

                            # Normal event
                            else:
                                self.queue.put(event)

                    time.sleep(5.0)

                except requests.exceptions.ConnectionError:
                    if ingame:
                        print("Match ended (Connection lost).")
                        break
                    else:
                        print("[!] Waiting for League of Legends game to start...")
                        time.sleep(60)

                except KeyboardInterrupt:
                    print("\n[!] Stopping listener.")
                    break

                except Exception as e:

                    if isinstance(e, requests.exceptions.Timeout) or isinstance(
                        e, TimeoutError
                    ):
                        print(f"{e}. Retrying...")
                        time.sleep(2)
                        continue
                    print(f"A real error occurred: {e}")

        finally:
            # Ensure end_time is set
            if self.end_time < 0.0:
                self.end_time = int(time.time() * 1000)

            # Emit final shutdown event
            self.queue.put(
                {
                    "EventName": "ListenerStopped",
                    "EventID": -1,
                    "StartTime": self.start_time,
                    "EndTime": self.end_time,
                    "Reason": "Listener has stopped.",
                }
            )  # hard-coded to follow normal event standards


def get_current_champion(riotId):
    try:
        r = requests.get(
            "https://127.0.0.1:2999/liveclientdata/allgamedata",
            verify=False,
            timeout=1,
        )
        r.raise_for_status()  # catches non-200 responses

        data = r.json()
        players = data.get("allPlayers")

        if DEBUG:
            with open("allgamedata.json", "w", encoding="utf-8") as f:
                json.dump(data, f, indent=4)

        for p in players:
            if p.get("riotId") == riotId:
                return p.get("championName")

        return None

    except (requests.exceptions.RequestException, ValueError):
        # RequestException covers ConnectionError, Timeout, HTTPError, etc.
        # ValueError covers JSON decode errors
        return None


def verify_match(start_time_ms: float, end_time_ms: float, match_info: Dict) -> bool:
    """
    Verify if the match start time falls within the listened time frame.

    Args:
        start_time_ms: Epoch timestamp (milliseconds) when the script started listening.
        end_time_ms: Epoch timestamp (milliseconds) when the script detected game end.
        match_info: The 'info' dictionary from Riot's Match-V5 API.
    """
    # Riot's gameStartTimestamp is in milliseconds. Convert to seconds.
    # Note: 'gameCreation' is also available, but 'gameStartTimestamp'
    # is generally more accurate for when the players actually spawn.
    riot_start_ms = match_info.get("gameStartTimestamp")
    if not riot_start_ms:
        return False

    # 120-second buffer to account for loading screens or API delay
    buffer_ms = 120 * 1000

    # Check if the Riot start time is within our window (with buffer)
    within_window = abs(riot_start_ms - start_time_ms) <= buffer_ms

    # if is_after_start and is_before_end:
    if within_window:
        # print(f"✅ Match Verified: Riot Start ({riot_start_ms}) matches our window.")
        return True
    else:
        # print(
        #     f"❌ Match Mismatch: Riot Start ({riot_start_ms}) is outside."
        #     f"our window ({start_time_ms-buffer_ms}, {start_time_ms+buffer_ms})."
        # )
        return False
