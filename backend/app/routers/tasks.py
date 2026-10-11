"""Task endpoints (FR-009 to FR-016)."""

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.db import get_session
from app.core.identity import require_user
from app.models.user import User
from app.schemas.task import MoveRequest, TaskCreate, TaskOut, TaskUpdate
from app.services import tasks

router = APIRouter(dependencies=[Depends(require_user)])


@router.post("/tasks/{task_id}/move", response_model=TaskOut)
async def move_task(
    task_id: int,
    body: MoveRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_user),
):
    """Move a task to a column. `position` is the target index; omit it to put the task at the bottom."""
    task = await tasks.move_task(session, task_id, body.column.value, body.position, actor_id=user.id)
    return (await tasks.to_out(session, [task]))[task.id]


@router.post("/projects/{project_id}/tasks", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
async def create_task(
    project_id: int,
    body: TaskCreate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_user),
):
    """Create a task at the bottom of To Do, optionally assigned to one of the five users."""
    task = await tasks.create_task(
        session,
        project_id,
        actor_id=user.id,
        title=body.title,
        description=body.description,
        assignee_id=body.assignee_id,
    )
    return (await tasks.to_out(session, [task]))[task.id]


@router.get("/tasks/{task_id}", response_model=TaskOut)
async def get_task(task_id: int, session: AsyncSession = Depends(get_session)):
    """Return one task."""
    task = await tasks.get_task(session, task_id)
    return (await tasks.to_out(session, [task]))[task.id]


@router.patch("/tasks/{task_id}", response_model=TaskOut)
async def update_task(
    task_id: int,
    body: TaskUpdate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_user),
):
    """Change a task's title, description or assignee; `assignee_id: null` clears the assignee."""
    task = await tasks.update_task(
        session, task_id, actor_id=user.id, fields=body.model_dump(exclude_unset=True)
    )
    return (await tasks.to_out(session, [task]))[task.id]
