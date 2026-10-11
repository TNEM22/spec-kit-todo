"""WebSocket endpoint `/api/v1/ws?user=<id>` (contracts/websocket.md).

Server to client only. The handshake checks the `Origin` (blocks cross-site WebSocket hijacking) and
the user id. Clients may only send `ping`; everything else is ignored and never executed.
"""

import asyncio
import json
import uuid

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.state import get_state
from app.models.audit import RefusalReason
from app.services import audit, users

router = APIRouter()

IDLE_SECONDS = 60
CLOSE_IDLE = 4408


async def _refuse(
    websocket: WebSocket, code: int, reason: RefusalReason, actor_id: int | None, request_id: str
) -> None:
    """Audit the refusal (no submitted values), then accept and close with an application code.

    The audit entry is written first so a client that disconnects immediately cannot cancel it.
    """
    await audit.record_refusal(reason, "WS /ws", actor_id, request_id)
    await websocket.accept()
    await websocket.close(code=code, reason=reason.value)


@router.websocket("/ws")
async def live_updates(websocket: WebSocket) -> None:
    """Deliver board events and the user's own notifications."""
    state = get_state()
    request_id = uuid.uuid4().hex

    origin = websocket.headers.get("origin")
    if origin is not None and origin not in state.settings.cors_origins:
        await _refuse(websocket, 4403, RefusalReason.origin_not_allowed, None, request_id)
        return

    raw = websocket.query_params.get("user", "")
    user = None
    if raw.isascii() and raw.isdigit():
        async with state.session_factory() as session:  # type: AsyncSession
            user = await users.get_user(session, int(raw))
    if user is None:
        await _refuse(websocket, 4401, RefusalReason.user_required, None, request_id)
        return

    await websocket.accept()
    manager = state.manager
    manager.register(user.id, websocket)
    try:
        await websocket.send_json({"type": "hello", "data": {"user_id": user.id}})
        while True:
            try:
                text = await asyncio.wait_for(websocket.receive_text(), IDLE_SECONDS)
            except TimeoutError:
                await websocket.close(code=CLOSE_IDLE, reason="idle")
                return
            try:
                message = json.loads(text)
            except ValueError:
                continue  # ignore anything that is not JSON
            if isinstance(message, dict) and message.get("type") == "ping":
                await websocket.send_json({"type": "pong"})
            # every other message is ignored
    except WebSocketDisconnect:
        pass
    finally:
        manager.unregister(user.id, websocket)
