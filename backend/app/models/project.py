"""Project model, owned by the `projects` domain."""

from datetime import datetime

from sqlalchemy import Text
from sqlalchemy.orm import Mapped, mapped_column

from app.core.db import UTCDateTime, utcnow
from app.models.base import Base


class Project(Base):
    """A container for tasks with one board of four fixed columns."""

    __tablename__ = "projects"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(Text)  # Required, trimmed, 1-100 characters
    # casefold() of the trimmed name; enforces case-insensitive uniqueness portably.
    name_key: Mapped[str] = mapped_column(Text, unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)  # <= 1,000 characters
    created_at: Mapped[datetime] = mapped_column(UTCDateTime, default=utcnow)
