"""Domain boundaries (Constitution III): a service may use only its own ORM models.

Other domains are reached through their service functions, never their tables. Enums defined next to
a model (for example `AuditAction`) are plain constants, not tables, and may be shared.
"""

import ast
import enum
import importlib
from pathlib import Path

import pytest

SERVICES = Path(__file__).resolve().parents[2] / "app" / "services"
OWN_MODEL = {
    "users": "app.models.user",
    "projects": "app.models.project",
    "tasks": "app.models.task",
    "comments": "app.models.comment",
    "notifications": "app.models.notification",
    "audit": "app.models.audit",
}


def model_imports(path: Path):
    """Yield (module, name) for every `from app.models... import name` in a file."""
    tree = ast.parse(path.read_text(encoding="utf-8"))
    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom) and node.module and node.module.startswith("app.models"):
            for alias in node.names:
                yield node.module, alias.name
        if isinstance(node, ast.Import):
            for alias in node.names:
                assert not alias.name.startswith("app.models"), f"{path.name}: use `from ... import`"


@pytest.mark.parametrize("domain", sorted(OWN_MODEL))
def test_service_imports_only_its_own_orm_models(domain):
    own = OWN_MODEL[domain]
    for module, name in model_imports(SERVICES / f"{domain}.py"):
        if module == own:
            continue
        member = getattr(importlib.import_module(module), name)
        assert isinstance(member, type) and issubclass(member, enum.Enum), (
            f"services/{domain}.py imports {name} from {module}: only enums may cross domains"
        )


def test_events_service_touches_no_models():
    assert list(model_imports(SERVICES / "events.py")) == []


def test_every_service_module_is_covered_by_this_test():
    modules = {p.stem for p in SERVICES.glob("*.py") if p.stem != "__init__"}
    assert modules == set(OWN_MODEL) | {"events"}, "add new services to OWN_MODEL"
