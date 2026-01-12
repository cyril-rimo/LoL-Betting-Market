from fastapi import WebSocket
from typing import List
import asyncio


class WebSocketManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for ws in list(self.active_connections):
            try:
                await ws.send_json(message)
            except Exception:
                self.disconnect(ws)

    async def wait_for_client(self, sec=0.1):
        while len(self.active_connections) == 0:
            await asyncio.sleep(sec)

    async def broadcast_after_client(self, message):
        await self.wait_for_client()

        # Now safely broadcast
        await self.broadcast(message)
