import json

from sqlalchemy import select
from starlette.testclient import TestClient

from app.models.audit import AuditEntry
from tests.conftest import headers_for

SAM = headers_for("sam")
ALEX = headers_for("alex")
FAMILY = "\U0001f468‍\U0001f469‍\U0001f467"


async def create(client, **body):
    return await client.post("/api/v1/projects", json=body, headers=SAM)


async def test_new_project_appears_for_everyone_with_an_empty_board(client):
    response = await create(client, name="  Mobile App  ", description="Companion app.")
    assert response.status_code == 201
    project = response.json()
    assert project["name"] == "Mobile App" and project["description"] == "Companion app."
    for headers in (SAM, ALEX):
        names = [p["name"] for p in (await client.get("/api/v1/projects", headers=headers)).json()]
        assert names[-1] == "Mobile App"
    board = (await client.get(f"/api/v1/projects/{project['id']}/board", headers=ALEX)).json()
    assert list(board["columns"]) == ["todo", "in_progress", "in_review", "done"]
    assert all(tasks == [] for tasks in board["columns"].values())


async def test_duplicate_name_ignoring_case_is_409(client):
    assert (await create(client, name="Mobile App")).status_code == 201
    for name in (
        "mobile app",
        "MOBILE APP",
        "  Mobile   App".replace("   ", " "),
        "Customer Portal",
        "customer portal",
    ):
        response = await create(client, name=name)
        assert response.status_code == 409, name
        error = response.json()["error"]
        assert error["code"] == "project_name_taken"
        assert error["fields"][0]["field"] == "name"
        assert "already exists" in error["fields"][0]["message"]


async def test_name_limits_in_characters(client):
    assert (await create(client, name="n" * 100)).status_code == 201
    assert (await create(client, name=FAMILY * 100)).status_code == 201
    for bad in ("", "   ", "\t ", "n" * 101, FAMILY * 101):
        response = await create(client, name=bad)
        assert response.status_code == 422, repr(bad[:10])
        field = response.json()["error"]["fields"][0]
        assert field["field"] == "name" and "1 to 100 characters" in field["message"]


async def test_description_limit_and_empty_becomes_null(client):
    assert (await create(client, name="A", description="d" * 1000)).status_code == 201
    too_long = await create(client, name="B", description="d" * 1001)
    assert too_long.status_code == 422 and too_long.json()["error"]["fields"][0]["field"] == "description"
    assert (await create(client, name="C", description="  ")).json()["description"] is None
    assert (await create(client, name="D")).json()["description"] is None


async def test_unknown_fields_are_rejected(client):
    assert (await create(client, name="X", id=9)).status_code == 422
    assert (await create(client)).status_code == 422


async def test_creating_a_project_requires_a_selected_user(client):
    assert (await client.post("/api/v1/projects", json={"name": "X"})).status_code == 401


async def test_created_project_is_audited(client, db):
    project = (await create(client, name="Audited")).json()
    rows = (
        (await db.execute(select(AuditEntry).where(AuditEntry.action == "project.created"))).scalars().all()
    )
    assert len(rows) == 1 and rows[0].actor_id == 2 and rows[0].entity_id == project["id"]
    assert json.loads(rows[0].changes)["name"] == "Audited"


def test_project_created_event_is_broadcast(app):
    with TestClient(app) as client:
        with client.websocket_connect("/api/v1/ws?user=3") as watcher:
            watcher.receive_json()
            response = client.post("/api/v1/projects", json={"name": "Live"}, headers=SAM)
            event = watcher.receive_json()
    assert event["type"] == "project.created" and event["actor_id"] == 2
    assert event["data"]["id"] == response.json()["id"] and event["data"]["name"] == "Live"
