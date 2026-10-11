import json

from sqlalchemy import create_engine, text
from starlette.testclient import TestClient

from tests.conftest import headers_for

SAM = headers_for("sam")
ALEX = headers_for("alex")


def audit_rows(settings):
    engine = create_engine(settings.database_url.replace("+aiosqlite", ""))
    with engine.connect() as connection:
        rows = connection.execute(
            text("select action, actor_id, entity_id, changes from audit_entries order by id")
        ).all()
    engine.dispose()
    return rows


def test_create_assign_update_with_audit_and_events(app, settings):
    with TestClient(app) as client:
        pid = client.get("/api/v1/projects", headers=SAM).json()[0]["id"]
        with client.websocket_connect("/api/v1/ws?user=3") as watcher:
            watcher.receive_json()  # hello
            created = client.post(
                f"/api/v1/projects/{pid}/tasks",
                json={"title": "Write release notes", "assignee_id": 5},
                headers=SAM,
            ).json()
            created_event = watcher.receive_json()
            task_id = created["id"]
            client.patch(f"/api/v1/tasks/{task_id}", json={"assignee_id": 4}, headers=ALEX)
            assigned_event = watcher.receive_json()
            client.patch(f"/api/v1/tasks/{task_id}", json={"title": "Release notes v2"}, headers=ALEX)
            renamed_event = watcher.receive_json()
            client.patch(f"/api/v1/tasks/{task_id}", json={"assignee_id": None}, headers=ALEX)
            cleared_event = watcher.receive_json()

    assert created_event["type"] == "task.created" and created_event["data"]["id"] == task_id
    assert created_event["actor_id"] == 2 and created_event["project_id"] == pid
    assert assigned_event["type"] == "task.updated"
    assert assigned_event["data"]["assignee"]["display_name"] == "Riley Chen"
    assert renamed_event["data"]["title"] == "Release notes v2"
    assert cleared_event["data"]["assignee"] is None

    rows = [r for r in audit_rows(settings) if r[2] == task_id]
    assert [r[0] for r in rows] == [
        "task.created",
        "task.assigned",  # created with an assignee
        "task.assigned",  # reassigned
        "task.updated",  # renamed
        "task.assigned",  # cleared
    ]
    assert rows[0][1] == 2 and rows[1][1] == 2 and rows[2][1] == 1
    assert json.loads(rows[2][3]) == {"assignee_id": [5, 4]}
    assert json.loads(rows[3][3])["title"] == ["Write release notes", "Release notes v2"]


def test_a_patch_that_changes_nothing_writes_no_audit_and_no_event(app, settings):
    with TestClient(app) as client:
        pid = client.get("/api/v1/projects", headers=SAM).json()[0]["id"]
        task = client.post(f"/api/v1/projects/{pid}/tasks", json={"title": "Same"}, headers=SAM).json()
        before = len(audit_rows(settings))
        with client.websocket_connect("/api/v1/ws?user=3") as watcher:
            watcher.receive_json()
            same = client.patch(f"/api/v1/tasks/{task['id']}", json={"title": "Same"}, headers=SAM)
            assert same.status_code == 200
            watcher.send_json({"type": "ping"})
            assert watcher.receive_json() == {"type": "pong"}  # no task.updated arrived first
    assert len(audit_rows(settings)) == before
