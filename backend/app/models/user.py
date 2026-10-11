"""User model, owned by the `users` domain. Users are fixed sample data (FR-001, FR-004)."""

import enum

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Role(enum.StrEnum):
    """The two roles in this phase; roles are informational only."""

    product_manager = "product_manager"
    engineer = "engineer"


class User(Base):
    """One of the five predefined team members."""

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=False)  # Assigned by seed
    display_name: Mapped[str] = mapped_column(String(60), unique=True)  # Required, unique
    role: Mapped[Role] = mapped_column(String(20))  # Required
    initials: Mapped[str] = mapped_column(String(3))  # Required; shown in avatars
    avatar_color: Mapped[str] = mapped_column(String(7))  # Hex color from design/tokens.md
