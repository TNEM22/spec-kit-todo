"""Process-wide application state: the engine, session factory and live-update manager.

Kept in one small object so tests can build an app against a separate database.
"""

import asyncio
from dataclasses import dataclass, field

from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession, async_sessionmaker

from app.core.config import Settings


@dataclass
class AppState:
    """Objects created once per application instance."""

    settings: Settings
    engine: AsyncEngine
    session_factory: async_sessionmaker[AsyncSession]
    manager: "object"  # ConnectionManager, typed loosely to avoid an import cycle
    # Serialises write units of work (read, change, commit) so position renumbering never
    # interleaves; with SQLite and a single worker this is the "last committed write wins" rule.
    write_lock: asyncio.Lock = field(default_factory=asyncio.Lock)


_state: AppState | None = None


def set_state(state: AppState) -> None:
    """Install the state for the running application."""
    global _state
    _state = state


def get_state() -> AppState:
    """Return the installed state; raises if the app has not been started."""
    if _state is None:
        raise RuntimeError("application state is not initialised")
    return _state
