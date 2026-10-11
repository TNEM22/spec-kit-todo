"""Public health and metrics endpoints (Constitution V)."""

from fastapi import APIRouter, Depends
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.metrics import metrics

router = APIRouter()


@router.get("/health")
async def health(session: AsyncSession = Depends(get_session)):
    """Report that the app is up and the database is reachable."""
    try:
        await session.execute(text("SELECT 1"))
    except Exception:
        return JSONResponse({"status": "error", "database": "unreachable"}, status_code=503)
    return {"status": "ok", "database": "ok"}


@router.get("/metrics")
async def get_metrics():
    """Return in-process counters as JSON."""
    return metrics.snapshot()
