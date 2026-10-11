"""Comment model, owned by the `comments` domain."""

from datetime import datetime

from sqlalchemy import ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import UTCDateTime, utcnow
from app.models.base import Base


class Comment(Base):
    """A message on a task; only its author may edit or delete it (FR-019)."""

    __tablename__ = "comments"

    id: Mapped[int] = mapped_column(primary_key=True)
    task_id: Mapped[int] = mapped_column(ForeignKey("tasks.id"), index=True)
    # Set from the selected user, never from the request body.
    author_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    body: Mapped[str] = mapped_column(Text)  # Required, trimmed, 1-2,000 characters
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
    edited_at: Mapped[datetime | None] = mapped_column(UTCDateTime, nullable=True)
