"""Connection manager: open WebSockets grouped by user id (research R6).

Single process only: broadcasting is in memory, so Uvicorn must run with one worker.
"""

import logging

from fastapi import WebSocket

from app.core.metrics import metrics

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Tracks sockets per user and delivers events to everyone or to one user."""

    def __init__(self) -> None:
        """Create an empty manager."""
        self._sockets: dict[int, set[WebSocket]] = {}

    def register(self, user_id: int, websocket: WebSocket) -> None:
        """Add an accepted socket for `user_id`."""
        self._sockets.setdefault(user_id, set()).add(websocket)
        metrics.open_sockets += 1

    def unregister(self, user_id: int, websocket: WebSocket) -> None:
        """Remove a socket after it closed."""
        sockets = self._sockets.get(user_id)
        if sockets and websocket in sockets:
            sockets.discard(websocket)
            metrics.open_sockets = max(0, metrics.open_sockets - 1)
            if not sockets:
                self._sockets.pop(user_id, None)

    async def _send(self, user_id: int, websocket: WebSocket, payload: dict) -> None:
        try:
            await websocket.send_json(payload)
        except Exception:  # a dead socket must never break delivery to the others
            logger.info("dropping dead websocket for user %s", user_id)
            self.unregister(user_id, websocket)

    async def broadcast(self, payload: dict) -> None:
        """Send an event to every connected client."""
        for user_id, sockets in list(self._sockets.items()):
            for websocket in list(sockets):
                await self._send(user_id, websocket, payload)

    async def send_to_user(self, user_id: int, payload: dict) -> None:
        """Send an event only to the sockets of `user_id` (notifications, FR-031)."""
        for websocket in list(self._sockets.get(user_id, ())):
            await self._send(user_id, websocket, payload)

    def connected_user_ids(self) -> set[int]:
        """Return the ids of users with at least one open socket."""
        return set(self._sockets)
