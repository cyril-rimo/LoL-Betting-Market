import httpx
import asyncio
from fastapi import WebSocket
from typing import List
from config import Config


class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []
        self.cloudflare_url = Config.C_WORKER_URL
        # We initialize the client here for connection pooling
        self.http_client = httpx.AsyncClient()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        """Broadcasts to local clients AND the Cloudflare Worker."""
        # 1. Local Broadcast Logic (Existing)
        for ws in list(self.active_connections):
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(ws)

        # 2. Cloudflare Relay Logic (New)
        if self.cloudflare_url:
            # We use create_task so the local app doesn't wait for the cloud
            asyncio.create_task(self._send_to_cloudflare(message))

    async def _send_to_cloudflare(self, message: dict):
        """
        Sends any message to the Cloudflare Worker.
        Automatically detects match cards and sets X-Type header.
        """

        # Detect match card by presence of matchId
        is_match_card = "matchId" in message

        headers = {}
        if is_match_card:
            headers["X-Type"] = "match"

        try:
            resp = await self.http_client.post(
                self.cloudflare_url, headers=headers, json=message, timeout=10
            )
            resp.raise_for_status()

        except Exception as e:
            if hasattr(e, "response"):
                print(f"Status: {e.response.status_code}")
                print(f"Body: {e.response.text}")
            print(f"[Cloudflare Relay Error] {e}")

    async def close(self):
        """Call this when shutting down your app."""
        await self.http_client.aclose()


async def main():
    wsManager = WebSocketManager()

    # 2. Simulate the Market Creation Event
    test_event = {
        "type": "market_created",
        "url": "https://manifold.markets/test-run",
        "champion": "Aatrox",
    }

    # 3. Fire the broadcast
    await wsManager.broadcast(test_event)

    # 4. Wait a moment for the async task to finish
    await asyncio.sleep(2)
    await wsManager.http_client.aclose()


if __name__ == "__main__":
    asyncio.run(main())
