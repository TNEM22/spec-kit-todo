"""The committed OpenAPI document must match the app (provider/consumer contract check, research R10).

If this fails, regenerate it with:
    python -m app.scripts.export_openapi   (in backend/)
    npm run api:generate                   (in frontend/)
"""

import json

from app.scripts.export_openapi import TARGET, build_schema


def test_committed_openapi_matches_the_application():
    committed = json.loads(TARGET.read_text(encoding="utf-8"))
    assert committed == build_schema(), "frontend openapi.json is out of date; re-export and regenerate"


def test_contract_exposes_every_documented_endpoint():
    paths = build_schema()["paths"]
    expected = {
        ("/api/v1/health", "get"),
        ("/api/v1/metrics", "get"),
        ("/api/v1/users", "get"),
        ("/api/v1/users/me", "get"),
        ("/api/v1/projects", "get"),
        ("/api/v1/projects", "post"),
        ("/api/v1/projects/{project_id}", "get"),
        ("/api/v1/projects/{project_id}/board", "get"),
        ("/api/v1/projects/{project_id}/tasks", "post"),
        ("/api/v1/tasks/{task_id}", "get"),
        ("/api/v1/tasks/{task_id}", "patch"),
        ("/api/v1/tasks/{task_id}/move", "post"),
        ("/api/v1/tasks/{task_id}/comments", "get"),
        ("/api/v1/tasks/{task_id}/comments", "post"),
        ("/api/v1/comments/{comment_id}", "patch"),
        ("/api/v1/comments/{comment_id}", "delete"),
        ("/api/v1/notifications", "get"),
        ("/api/v1/notifications/read-all", "post"),
        ("/api/v1/notifications/{notification_id}/read", "post"),
    }
    found = {(path, method) for path, item in paths.items() for method in item}
    assert expected <= found
    # nothing outside the contract: no user mutation, no project or task deletion, no notification writes
    assert found - expected == set()
