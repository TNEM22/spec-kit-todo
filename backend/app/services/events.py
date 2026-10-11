"""Event publishing: services queue events and they are sent only after the commit (research R6).

Usage in a service: `events.queue(session, Event(...))`, and in the router `await
events.commit_and_publish(session)`. If the transaction rolls back, queued events are dropped.
"""

from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import request_id_var
from app.core.state import get_state
from app.schemas.events import Event

_KEY = "queued_events"


def queue(
    session: AsyncSession,
    type_: str,
    *,
    actor_id: int | None,
    project_id: int | None,
    data: dict[str, Any],
    recipient_id: int | None = None,
) -> None:
    """Queue an event. `recipient_id` set means "send only to this user"; None means broadcast."""
    event = Event(
        type=type_,
        actor_id=actor_id,
        project_id=project_id,
        request_id=request_id_var.get(),
        data=data,
    )
    session.info.setdefault(_KEY, []).append((recipient_id, event))


async def commit_and_publish(session: AsyncSession) -> None:
    """Commit the transaction, then deliver the queued events."""
    pending: list[tuple[int | None, Event]] = session.info.pop(_KEY, [])
    await session.commit()
    manager = get_state().manager
    for recipient_id, event in pending:
        payload = event.model_dump(mode="json")
        if recipient_id is None:
            await manager.broadcast(payload)
        else:
            await manager.send_to_user(recipient_id, payload)
