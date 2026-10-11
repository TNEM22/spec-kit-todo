"""Audit domain: owns `audit_entries` (FR-023). Never exposed through the API or UI.

Changes are recorded in the caller's transaction. Refused requests are recorded in their own short
transaction, because the failed request's transaction is rolled back. Submitted values are never
stored for refused requests.
"""

import json
from typing import Any

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import request_id_var
from app.core.state import get_state
from app.models.audit import AuditAction, AuditEntry, RefusalReason


def record_change(
    session: AsyncSession,
    actor_id: int,
    action: AuditAction,
    entity_type: str,
    entity_id: int,
    changes: dict[str, Any] | None = None,
) -> None:
    """Add an audit entry to the caller's transaction."""
    session.add(
        AuditEntry(
            actor_id=actor_id,
            action=action.value,
            entity_type=entity_type,
            entity_id=entity_id,
            changes=json.dumps(changes, ensure_ascii=False) if changes is not None else None,
            request_id=request_id_var.get(),
        )
    )


async def record_refusal(
    reason: RefusalReason,
    route_template: str,
    actor_id: int | None,
    request_id: str | None,
) -> None:
    """Record a refused request in its own transaction. Never stores submitted values."""
    factory = get_state().session_factory
    async with factory() as session:
        session.add(
            AuditEntry(
                actor_id=actor_id,
                action=AuditAction.request_refused.value,
                reason=reason.value,
                route=route_template[:120],
                changes=None,
                request_id=request_id,
            )
        )
        await session.commit()
