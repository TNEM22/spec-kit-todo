"""Application factory: routers under /api/v1, middleware, error handlers and startup seeding."""

from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import Settings, get_settings
from app.core.db import make_engine, make_session_factory
from app.core.errors import install_error_handlers
from app.core.logging import configure_logging
from app.core.middleware import RequestContextMiddleware
from app.core.state import AppState, set_state
from app.realtime.manager import ConnectionManager
from app.routers import comments, health, notifications, projects, tasks, users, ws
from app.seed.sample_data import seed_sample_data


def create_app(settings: Settings | None = None) -> FastAPI:
    """Build the FastAPI application. Tests pass their own settings (a separate database)."""
    settings = settings or get_settings()
    configure_logging(settings.log_level)
    engine = make_engine(settings.database_url)
    state = AppState(
        settings=settings,
        engine=engine,
        session_factory=make_session_factory(engine),
        manager=ConnectionManager(),
    )
    set_state(state)

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        async with state.session_factory() as session:
            await seed_sample_data(session)
        yield
        await engine.dispose()

    app = FastAPI(
        title="Taskify API",
        version="1.0.0",
        # Clean operation ids (e.g. "move_task") give the generated Angular client readable method names.
        generate_unique_id_function=lambda route: route.name,
        openapi_url="/api/v1/openapi.json",
        docs_url="/api/v1/docs",
        redoc_url=None,
        lifespan=lifespan,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["Content-Type", "X-Taskify-User", "X-Request-ID"],
        expose_headers=["X-Request-ID"],
    )
    app.add_middleware(RequestContextMiddleware)
    install_error_handlers(app)

    api = APIRouter(prefix="/api/v1")
    api.include_router(health.router, tags=["health"])
    api.include_router(users.router, tags=["users"])
    api.include_router(projects.router, tags=["projects"])
    api.include_router(tasks.router, tags=["tasks"])
    api.include_router(comments.router, tags=["comments"])
    api.include_router(notifications.router, tags=["notifications"])
    api.include_router(ws.router, tags=["realtime"])
    app.include_router(api)
    return app
