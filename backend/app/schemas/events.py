"""WebSocket event envelope (contracts/websocket.md)."""

import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.core.db import utcnow


class Event(BaseModel):
    """One message pushed to clients. `request_id` is the REST request that caused it."""

    type: str
    event_id: str = Field(default_factory=lambda: uuid.uuid4().hex)
    occurred_at: datetime = Field(default_factory=utcnow)
    actor_id: int | None = None
    project_id: int | None = None
    request_id: str | None = None
    data: dict[str, Any] = Field(default_factory=dict)
