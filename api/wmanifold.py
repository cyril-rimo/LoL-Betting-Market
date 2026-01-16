import requests
import time
from config import Config


class ManifoldClient:
    def __init__(self):
        self.base_url = "https://api.manifold.markets/v0"
        self.session = requests.Session()
        self.timeout = 5.0

        self.api_key = Config.MANIFOLD_API_KEY  # get the api key from the auth file

        self.headers = {
            "Authorization": f"Key {self.api_key}",
            "Content-Type": "application/json",
        }  # headers for api requests
        print("ManifoldClient initialized.")

    def get_market(self, market_id: str) -> dict:
        """Retrieve a market JSON object from the Manifold API."""
        url = f"{self.BASE_URL}/market/{market_id}"
        resp = requests.get(url, timeout=10)

        if resp.status_code != 200:
            raise RuntimeError(
                f"Failed to fetch market {market_id}: {resp.status_code}"
            )

        return resp.json()

    def is_market_resolved(self, market_id: str) -> bool:
        """
        Fetch the market from the API and determine whether it is resolved.

        A market is considered resolved if:
        - `isResolved` is True, OR
        - `resolution` is a non-null string, OR
        - `resolutionTime` exists and is non-null.
        """

        market = self.get_market(market_id)

        # 1. Explicit flag
        if market.get("isResolved") is True:
            return True

        # 2. Resolution string (YES, NO, MKT, CANCEL, etc.)
        if market.get("resolution"):
            return True

        # 3. Resolution timestamp
        if market.get("resolutionTime"):
            return True

        return False

    def create_league_market(self, champion_name: str) -> str:
        url = "https://api.manifold.markets/v0/market"

        description = """
        <p>Created by a bot by Cyril Rimo.</p>
        <p>You can view my live game here: <a href="https://op.gg/lol/summoners/na/SirAgathon-NA1/ingame">OP.GG</a>.</p>
        <p>You can self-host your own bot too: <a href="https://github.com/cyril-rimo/LoL-Betting-Market">GitHub</a>.</p>
        <p>See my demo: <a href="https://cyril-rimo.pages.dev/">cyril-rimo.pages.dev</a>.</p>
        """

        payload = {
            "outcomeType": "BINARY",
            "question": f"Will I win my next League of Legends match as {champion_name}?",
            "descriptionHtml": description,
            "initialProb": 50,
            "visibility": "public",
            "liquidityTier": 100,
            "closeTime": int(time.time() * 1000) + 14 * 60 * 1000,  # 14 min from now
        }

        resp = requests.post(url, json=payload, headers=self.headers)
        market = resp.json()
        return market["id"]

    def resolve_league_market(self, id, result):
        url = f"https://api.manifold.markets/v0/market/{id}/resolve"
        payload = {"outcome": "YES" if result else "NO"}
        resp = requests.post(url, json=payload, headers=self.headers)
        print(f"Market Resolved! ID: {id}, Result: {result}")

    def post_closing_remarks(self, id, remarks):
        url = f"https://api.manifold.markets/v0/comment"
        payload = {"contractId": id, "html": remarks}
        resp = requests.post(url, json=payload, headers=self.headers)
        print(f"Posted closing remarks for Market ID: {id}")

    def get_market_url(self, id):
        url = f"https://api.manifold.markets/v0/market/{id}"
        resp = requests.get(url, headers=self.headers)
        return resp.json().get("url")
