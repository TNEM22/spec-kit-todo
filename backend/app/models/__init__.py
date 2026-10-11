"""SQLAlchemy models, one module per owning domain.

Importing this package registers every table on the shared metadata (used by Alembic and tests).
"""

from app.models.audit import AuditEntry
from app.models.base import Base
from app.models.comment import Comment
from app.models.notification import Notification
from app.models.project import Project
from app.models.task import Task
from app.models.user import User

__all__ = ["AuditEntry", "Base", "Comment", "Notification", "Project", "Task", "User"]
