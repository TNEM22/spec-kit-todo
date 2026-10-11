"""`python -m app.scripts.export_openapi`: write the OpenAPI document for the frontend client."""

import json
from pathlib import Path

from app.core.config import Settings
from app.main import create_app

TARGET = Path(__file__).resolve().parents[3] / "frontend" / "src" / "app" / "core" / "api" / "openapi.json"


def build_schema() -> dict:
    """Return the OpenAPI document of the application (no database access needed)."""
    return create_app(Settings(database_url="sqlite+aiosqlite:///:memory:")).openapi()


def main() -> None:
    """Write the document with stable formatting so drift is easy to see in diffs."""
    TARGET.parent.mkdir(parents=True, exist_ok=True)
    TARGET.write_text(json.dumps(build_schema(), indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(f"wrote {TARGET}")


if __name__ == "__main__":
    main()
