import asyncio
import shutil
from pathlib import Path

import httpx
import pytest
import pytest_asyncio
from alembic.config import Config

from alembic import command
from app.core.config import Settings
from app.core.db import make_engine, make_session_factory
from app.main import create_app
from app.seed.sample_data import seed_sample_data

BACKEND = Path(__file__).resolve().parents[1]
USER_IDS = {"alex": 1, "sam": 2, "jordan": 3, "riley": 4, "taylor": 5}
ALLOWED_ORIGIN = "http://localhost:4200"


def headers_for(user_name: str) -> dict[str, str]:
    """Headers that select a user by first name, e.g. `headers_for("sam")`."""
    return {"X-Taskify-User": str(USER_IDS[user_name.lower()])}


@pytest.fixture(scope="session")
def template_db(tmp_path_factory) -> Path:
    """A migrated and seeded database file, built once and copied for every test."""
    path = tmp_path_factory.mktemp("template") / "template.db"
    url = f"sqlite+aiosqlite:///{path.as_posix()}"
    config = Config(str(BACKEND / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND / "alembic"))
    config.set_main_option("sqlalchemy.url", url)
    command.upgrade(config, "head")

    async def seed() -> None:
        engine = make_engine(url)
        async with make_session_factory(engine)() as session:
            await seed_sample_data(session)
        await engine.dispose()

    asyncio.run(seed())
    return path


@pytest.fixture
def settings(template_db, tmp_path) -> Settings:
    """Settings pointing at a private copy of the seeded database."""
    target = tmp_path / "test.db"
    shutil.copy(template_db, target)
    return Settings(database_url=f"sqlite+aiosqlite:///{target.as_posix()}", cors_origins=[ALLOWED_ORIGIN])


@pytest.fixture
def app(settings):
    """A fresh application bound to the private test database."""
    return create_app(settings)


@pytest_asyncio.fixture
async def client(app):
    """Async HTTP client; unexpected server errors become 500 responses instead of raising."""
    from app.core.state import get_state

    transport = httpx.ASGITransport(app=app, raise_app_exceptions=False)
    async with httpx.AsyncClient(transport=transport, base_url="http://test") as http:
        yield http
    await get_state().engine.dispose()


@pytest_asyncio.fixture
async def db(app):
    """A database session on the test database for assertions."""
    from app.core.state import get_state

    async with get_state().session_factory() as session:
        yield session
    # close pooled connections inside this test's event loop, so no worker thread outlives it
    await get_state().engine.dispose()
