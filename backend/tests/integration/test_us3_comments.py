import json

from sqlalchemy import create_engine, text
from starlette.testclient import TestClient

from tests.conftest import headers_for

SAM = headers_for("sam")
JORDAN = headers_for("jordan")


def audit(settings, action):
    engine = create_engine(settings.database_url.replace("+aiosqlite", ""))
    with engine.connect() as connection:
        rows = connection.execute(
            text("select actor_id, entity_id, changes from audit_entries where action = :a order by id"),
            {"a": action},
        ).all()
    engine.dispose()
    return rows


def task_id(client):
    pid = client.get("/api/v1/projects", headers=SAM).json()[0]["id"]
    board = client.get(f"/api/v1/projects/{pid}/board", headers=SAM).json()
    return pid, next(
        t["id"] for t in board["columns"]["in_progress"] if t["title"] == "Build account settings page"
    )


def test_comment_lifecycle_events_and_audit(app, settings):
    with TestClient(app) as client:
        pid, tid = task_id(client)
        with client.websocket_connect("/api/v1/ws?user=3") as watcher:
            watcher.receive_json()
            created = client.post(f"/api/v1/tasks/{tid}/comments", json={"body": "Draft"}, headers=SAM).json()
            created_event = watcher.receive_json()
            client.patch(f"/api/v1/comments/{created['id']}", json={"body": "Final"}, headers=SAM)
            updated_event = watcher.receive_json()
            client.delete(f"/api/v1/comments/{created['id']}", headers=SAM)
            deleted_event = watcher.receive_json()
        remaining = client.get(f"/api/v1/tasks/{tid}/comments", headers=JORDAN).json()

    assert created_event["type"] == "comment.created" and created_event["project_id"] == pid
    assert created_event["data"]["id"] == created["id"] and created_event["data"]["author"]["id"] == 2
    assert updated_event["type"] == "comment.updated" and updated_event["data"]["edited_at"]
    assert deleted_event["type"] == "comment.deleted"
    assert deleted_event["data"] == {"comment_id": created["id"], "task_id": tid}
    assert created["id"] not in [c["id"] for c in remaining]  # gone for every user

    assert [r[1] for r in audit(settings, "comment.created")] == [created["id"]]
    assert json.loads(audit(settings, "comment.updated")[0][2])["body"] == ["Draft", "Final"]
    deleted = audit(settings, "comment.deleted")
    assert deleted[0][0] == 2 and json.loads(deleted[0][2]) == {"body": "Final"}  # the audit keeps the text


def test_a_forbidden_edit_sends_no_event(app):
    with TestClient(app) as client:
        _, tid = task_id(client)
        comment = client.post(f"/api/v1/tasks/{tid}/comments", json={"body": "Mine"}, headers=SAM).json()
        with client.websocket_connect("/api/v1/ws?user=3") as watcher:
            watcher.receive_json()
            refused = client.patch(f"/api/v1/comments/{comment['id']}", json={"body": "x"}, headers=JORDAN)
            assert refused.status_code == 403
            watcher.send_json({"type": "ping"})
            assert watcher.receive_json() == {"type": "pong"}
