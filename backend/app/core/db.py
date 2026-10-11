"""Async database engine, sessions and column types.

SQLite is opened in WAL mode with foreign keys enforced. All data access uses the ORM so the
database can be changed by editing `DATABASE_URL` (research R3).
"""

from collections.abc import AsyncIterator
from datetime import UTC, datetime

from sqlalchemy import DateTime, event
from sqlalchemy.engine import Engine
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.types import TypeDecorator


class UTCDateTime(TypeDecorator[datetime]):
    """Store timezone-aware UTC datetimes, also on SQLite which drops tzinfo."""

    impl = DateTime(timezone=True)
    cache_ok = True

    def process_bind_param(self, value: datetime | None, dialect) -> datetime | None:
        """Convert to UTC before writing; reject naive values."""
        if value is None:
            return None
        if value.tzinfo is None:
            raise ValueError("naive datetime not allowed; use timezone-aware UTC")
        return value.astimezone(UTC)

    def process_result_value(self, value: datetime | None, dialect) -> datetime | None:
        """Return values as timezone-aware UTC."""
        if value is None:
            return None
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value.astimezone(UTC)


def utcnow() -> datetime:
    """Return the current time as timezone-aware UTC."""
    return datetime.now(UTC)


def _set_sqlite_pragmas(dbapi_connection, _record) -> None:
    """Apply the SQLite settings required by the plan on every new connection."""
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.execute("PRAGMA busy_timeout=5000")
    cursor.execute("PRAGMA synchronous=NORMAL")
    cursor.close()


def make_engine(database_url: str) -> AsyncEngine:
    """Create an async engine, applying SQLite pragmas when the URL is SQLite."""
    engine = create_async_engine(database_url, future=True)
    if engine.dialect.name == "sqlite":
        event.listen(engine.sync_engine, "connect", _set_sqlite_pragmas)
    return engine


def make_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    """Create the session factory used by the app and the tests."""
    return async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncIterator[AsyncSession]:
    """FastAPI dependency: yield a session bound to the app's engine and close it afterwards."""
    from app.core.state import get_state  # local import avoids a cycle at import time

    factory = get_state().session_factory
    async with factory() as session:
        yield session


__all__ = ["Engine", "UTCDateTime", "get_session", "make_engine", "make_session_factory", "utcnow"]
