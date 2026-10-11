import asyncio

from sqlalchemy import create_engine, text
from starlette.testclient import TestClient

from tests.conftest import headers_for

SAM = headers_for("sam")
ALEX = headers_for("alex")


def board(client, headers=SAM):
    pid = client.get("/api/v1/projects", headers=headers).json()[0]["id"]
    return pid, client.get(f"/api/v1/projects/{pid}/board", headers=headers).json()


def test_move_persists_and_other_clients_receive_the_event(app):
    with TestClient(app) as client:
        pid, data = board(client)
        task = data["columns"]["todo"][1]
        with client.websocket_connect("/api/v1/ws?user=3") as other:  # Jordan watches the board
            other.receive_json()  # hello
            response = client.post(
                f"/api/v1/tasks/{task['id']}/move",
                json={"column": "in_review", "position": 0},
                headers={**SAM, "X-Request-ID": "trace-abcdef12"},
            )
            assert response.status_code == 200
            event = other.receive_json()
        assert event["type"] == "task.moved"
        assert event["actor_id"] == 2 and event["project_id"] == pid
        assert event["request_id"] == "trace-abcdef12"
        assert event["data"]["from_column"] == "todo"
        assert event["data"]["task"]["id"] == task["id"]
        assert event["data"]["task"]["column"] == "in_review"
        columns = event["data"]["columns"]
        assert columns["in_review"][0] == task["id"]
        assert task["id"] not in columns["todo"]
        # persisted: a fresh read shows the same order
        _, again = board(client)
        assert [t["id"] for t in again["columns"]["in_review"]] == columns["in_review"]


def test_audit_row_is_written_for_a_move(app, settings):
    with TestClient(app) as client:
        _, data = board(client)
        task_id = data["columns"]["todo"][0]["id"]
        client.post(f"/api/v1/tasks/{task_id}/move", json={"column": "done"}, headers=SAM)
    engine = create_engine(settings.database_url.replace("+aiosqlite", ""))
    with engine.connect() as connection:
        rows = connection.execute(
            text("select actor_id, entity_id, changes from audit_entries where action = 'task.moved'")
        ).all()
    engine.dispose()
    assert len(rows) == 1 and rows[0][0] == 2 and rows[0][1] == task_id


async def test_concurrent_moves_end_in_a_consistent_last_write_wins_order(client):
    pid = (await client.get("/api/v1/projects", headers=SAM)).json()[0]["id"]
    data = (await client.get(f"/api/v1/projects/{pid}/board", headers=SAM)).json()
    a, b = data["columns"]["todo"][0]["id"], data["columns"]["todo"][1]["id"]

    async def move(task_id, user):
        return await client.post(
            f"/api/v1/tasks/{task_id}/move", json={"column": "in_progress", "position": 0}, headers=user
        )

    first, second = await asyncio.gather(move(a, SAM), move(b, ALEX))
    assert first.status_code == 200 and second.status_code == 200
    final = (await client.get(f"/api/v1/projects/{pid}/board", headers=SAM)).json()
    for tasks in final["columns"].values():
        assert [t["position"] for t in tasks] == list(range(len(tasks)))  # still gapless
    ids = [t["id"] for t in final["columns"]["in_progress"]]
    assert ids.index(a) != ids.index(b) and {a, b} <= set(ids)
    assert a not in [t["id"] for t in final["columns"]["todo"]]
