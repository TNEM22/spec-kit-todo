from sqlalchemy import create_engine, text
from starlette.testclient import TestClient

from tests.conftest import headers_for

ALEX = headers_for("alex")
SAM = headers_for("sam")
JORDAN = headers_for("jordan")


def audit_actions(settings):
    engine = create_engine(settings.database_url.replace("+aiosqlite", ""))
    with engine.connect() as connection:
        rows = connection.execute(text("select action from audit_entries")).all()
    engine.dispose()
    return [r[0] for r in rows]


def settings_task(client):
    pid = client.get("/api/v1/projects", headers=SAM).json()[0]["id"]
    board = client.get(f"/api/v1/projects/{pid}/board", headers=SAM).json()
    return pid, next(
        t for t in board["columns"]["in_progress"] if t["title"] == "Build account settings page"
    )


def drain_until(ws, wanted_type, limit=6):
    """Read events until one of `wanted_type` arrives; returns (event, skipped_types)."""
    skipped = []
    for _ in range(limit):
        event = ws.receive_json()
        if event["type"] == wanted_type:
            return event, skipped
        skipped.append(event["type"])
    raise AssertionError(f"no {wanted_type}; saw {skipped}")


def test_only_the_recipient_receives_notification_events(app):
    with TestClient(app) as client:
        pid, task = settings_task(client)  # assigned to Sam
        with (
            client.websocket_connect("/api/v1/ws?user=2") as sam_ws,
            client.websocket_connect("/api/v1/ws?user=3") as jordan_ws,
        ):
            sam_ws.receive_json()
            jordan_ws.receive_json()
            client.post(f"/api/v1/tasks/{task['id']}/comments", json={"body": "ping Sam"}, headers=ALEX)
            sam_event, _ = drain_until(sam_ws, "notification.created")
            _, jordan_saw = drain_until(jordan_ws, "comment.created")
            jordan_ws.send_json({"type": "ping"})
            assert jordan_ws.receive_json() == {"type": "pong"}  # no notification.created for Jordan
            assert "notification.created" not in jordan_saw
    note = sam_event["data"]["notification"]
    assert sam_event["data"]["unread_count"] == 1
    assert note["type"] == "task_commented" and note["actor"]["display_name"] == "Alex Morgan"
    assert note["comment_preview"] == "ping Sam" and note["read"] is False
    assert sam_event["project_id"] == pid and sam_event["actor_id"] == 1


def test_marking_read_reaches_the_users_other_window(app):
    with TestClient(app) as client:
        _, task = settings_task(client)
        client.post(f"/api/v1/tasks/{task['id']}/comments", json={"body": "one"}, headers=ALEX)
        client.post(f"/api/v1/tasks/{task['id']}/comments", json={"body": "two"}, headers=ALEX)
        items = client.get("/api/v1/notifications", headers=SAM).json()["items"]
        with client.websocket_connect("/api/v1/ws?user=2") as other_window:
            other_window.receive_json()
            client.post(f"/api/v1/notifications/{items[0]['id']}/read", headers=SAM)
            first = other_window.receive_json()
            client.post("/api/v1/notifications/read-all", headers=SAM)
            second = other_window.receive_json()
    assert first["type"] == "notifications.read" and first["project_id"] is None
    assert first["data"] == {"ids": [items[0]["id"]], "unread_count": 1}
    assert second["data"] == {"ids": "all", "unread_count": 0}


def test_deleting_a_comment_clears_its_preview_but_keeps_the_notification(app):
    with TestClient(app) as client:
        _, task = settings_task(client)
        comment = client.post(
            f"/api/v1/tasks/{task['id']}/comments", json={"body": "secret words"}, headers=ALEX
        ).json()
        before = client.get("/api/v1/notifications", headers=SAM).json()["items"][0]
        assert before["comment_preview"] == "secret words"
        client.delete(f"/api/v1/comments/{comment['id']}", headers=ALEX)
        after = client.get("/api/v1/notifications", headers=SAM).json()["items"][0]
    assert after["id"] == before["id"] and after["comment_preview"] is None
    assert after["task_id"] == task["id"]  # still opens the task


def test_notifications_are_never_audited(app, settings):
    with TestClient(app) as client:
        _, task = settings_task(client)
        client.post(f"/api/v1/tasks/{task['id']}/comments", json={"body": "hi"}, headers=ALEX)
        items = client.get("/api/v1/notifications", headers=SAM).json()["items"]
        client.post(f"/api/v1/notifications/{items[0]['id']}/read", headers=SAM)
        client.post("/api/v1/notifications/read-all", headers=SAM)
    actions = audit_actions(settings)
    assert actions == ["comment.created"]  # nothing for creating or reading notifications


def test_move_and_assignment_notifications_over_the_wire(app):
    with TestClient(app) as client:
        pid, task = settings_task(client)
        with client.websocket_connect("/api/v1/ws?user=2") as sam_ws:
            sam_ws.receive_json()
            client.post(f"/api/v1/tasks/{task['id']}/move", json={"column": "in_review"}, headers=JORDAN)
            moved, _ = drain_until(sam_ws, "notification.created")
            new_task = client.post(
                f"/api/v1/projects/{pid}/tasks", json={"title": "For Sam", "assignee_id": 2}, headers=ALEX
            ).json()
            assigned, _ = drain_until(sam_ws, "notification.created")
    assert moved["data"]["notification"]["type"] == "task_moved"
    assert moved["data"]["notification"]["to_column"] == "in_review"
    assert assigned["data"]["notification"]["type"] == "task_assigned"
    assert assigned["data"]["notification"]["task_id"] == new_task["id"]
    assert assigned["data"]["unread_count"] == 2
