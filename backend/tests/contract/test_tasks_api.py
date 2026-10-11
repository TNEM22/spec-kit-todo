from sqlalchemy import select

from app.models.audit import AuditEntry
from tests.conftest import headers_for

SAM = headers_for("sam")
FAMILY = "\U0001f468‍\U0001f469‍\U0001f467"


async def project_id(client) -> int:
    return (await client.get("/api/v1/projects", headers=SAM)).json()[0]["id"]


async def create(client, pid, **body):
    return await client.post(f"/api/v1/projects/{pid}/tasks", json=body, headers=SAM)


async def refusals(db):
    rows = await db.execute(select(AuditEntry).where(AuditEntry.action == "request.refused"))
    return list(rows.scalars())


async def test_create_task_goes_to_the_bottom_of_todo(client):
    pid = await project_id(client)
    board = (await client.get(f"/api/v1/projects/{pid}/board", headers=SAM)).json()
    todo_count = len(board["columns"]["todo"])
    response = await create(client, pid, title="  Write release notes  ", assignee_id=5)
    assert response.status_code == 201
    task = response.json()
    assert task["title"] == "Write release notes"  # trimmed
    assert task["column"] == "todo" and task["position"] == todo_count
    assert task["assignee"]["display_name"] == "Taylor Brooks"
    assert task["description"] is None and task["comment_count"] == 0


async def test_title_limits_in_characters(client):
    pid = await project_id(client)
    assert (await create(client, pid, title="a" * 200)).status_code == 201
    assert (await create(client, pid, title=FAMILY * 200)).status_code == 201  # 200 user-perceived chars
    for bad in ("", "   ", "\t \n", "a" * 201, FAMILY * 201):
        response = await create(client, pid, title=bad)
        assert response.status_code == 422, repr(bad)
        fields = response.json()["error"]["fields"]
        assert fields[0]["field"] == "title" and "1 to 200 characters" in fields[0]["message"]


async def test_description_limit_and_empty_becomes_null(client):
    pid = await project_id(client)
    assert (await create(client, pid, title="x", description="d" * 5000)).status_code == 201
    response = await create(client, pid, title="x", description="d" * 5001)
    assert response.status_code == 422 and response.json()["error"]["fields"][0]["field"] == "description"
    empty = await create(client, pid, title="x", description="   ")
    assert empty.json()["description"] is None


async def test_markup_is_stored_exactly_as_typed(client):
    pid = await project_id(client)
    text = '<script>alert("x")</script> & <b>bold</b>'
    response = await create(client, pid, title=text)
    assert response.status_code == 201 and response.json()["title"] == text
    fetched = await client.get(f"/api/v1/tasks/{response.json()['id']}", headers=SAM)
    assert fetched.json()["title"] == text


async def test_unknown_assignee_and_unknown_fields_are_422(client):
    pid = await project_id(client)
    response = await create(client, pid, title="x", assignee_id=99)
    assert response.status_code == 422
    assert response.json()["error"]["fields"][0]["field"] == "assignee_id"
    for body in ({"title": "x", "column": "done"}, {"title": "x", "id": 5}, {}):
        assert (await create(client, pid, **body)).status_code == 422


async def test_every_422_writes_a_refusal_without_the_submitted_values(client, db):
    pid = await project_id(client)
    secret = "TOP-SECRET-TITLE-" + "x" * 300
    await create(client, pid, title=secret)
    rows = await refusals(db)
    assert len(rows) == 1
    row = rows[0]
    assert row.reason == "validation_error" and row.actor_id == 2
    assert row.route == "POST /projects/{project_id}/tasks"
    assert row.changes is None and "TOP-SECRET" not in repr(row.__dict__)


async def test_create_in_unknown_project_is_404(client):
    assert (await create(client, 9999, title="x")).status_code == 404


async def test_get_task(client):
    pid = await project_id(client)
    task = (await create(client, pid, title="Look me up")).json()
    response = await client.get(f"/api/v1/tasks/{task['id']}", headers=SAM)
    assert response.status_code == 200 and response.json()["title"] == "Look me up"
    assert (await client.get("/api/v1/tasks/9999", headers=SAM)).status_code == 404


async def test_patch_updates_fields_and_null_clears_the_assignee(client):
    pid = await project_id(client)
    task = (await create(client, pid, title="Old", assignee_id=2)).json()
    url = f"/api/v1/tasks/{task['id']}"
    updated = (await client.patch(url, json={"title": "New", "description": "More"}, headers=SAM)).json()
    assert updated["title"] == "New" and updated["description"] == "More"
    assert updated["assignee"]["display_name"] == "Sam Lee"
    cleared = (await client.patch(url, json={"assignee_id": None}, headers=SAM)).json()
    assert cleared["assignee"] is None and cleared["title"] == "New"
    reassigned = (await client.patch(url, json={"assignee_id": 4}, headers=SAM)).json()
    assert reassigned["assignee"]["display_name"] == "Riley Chen"
    no_description = (await client.patch(url, json={"description": ""}, headers=SAM)).json()
    assert no_description["description"] is None


async def test_patch_rejects_empty_body_null_title_and_bad_values(client):
    pid = await project_id(client)
    task = (await create(client, pid, title="Keep")).json()
    url = f"/api/v1/tasks/{task['id']}"
    for body in ({}, {"title": None}, {"title": ""}, {"assignee_id": 99}, {"position": 3}):
        response = await client.patch(url, json=body, headers=SAM)
        assert response.status_code == 422, body
    assert (await client.get(url, headers=SAM)).json()["title"] == "Keep"
    assert (await client.patch("/api/v1/tasks/9999", json={"title": "x"}, headers=SAM)).status_code == 404
