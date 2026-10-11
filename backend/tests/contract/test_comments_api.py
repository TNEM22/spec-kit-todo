from sqlalchemy import select

from app.models.audit import AuditEntry
from tests.conftest import headers_for

SAM = headers_for("sam")
ALEX = headers_for("alex")
RILEY = headers_for("riley")
FAMILY = "\U0001f468‍\U0001f469‍\U0001f467"


async def settings_task_id(client) -> int:
    """The seeded task 'Build account settings page' has two comments (Alex, then Riley)."""
    pid = (await client.get("/api/v1/projects", headers=SAM)).json()[0]["id"]
    board = (await client.get(f"/api/v1/projects/{pid}/board", headers=SAM)).json()
    return next(
        t["id"] for t in board["columns"]["in_progress"] if t["title"] == "Build account settings page"
    )


async def post(client, task_id, body, headers=SAM):
    return await client.post(f"/api/v1/tasks/{task_id}/comments", json={"body": body}, headers=headers)


async def test_list_is_oldest_first_with_author_and_time(client):
    task_id = await settings_task_id(client)
    comments = (await client.get(f"/api/v1/tasks/{task_id}/comments", headers=SAM)).json()
    assert [c["author"]["display_name"] for c in comments] == ["Alex Morgan", "Riley Chen"]
    assert comments[0]["body"] == "Please match the layout of the billing settings page."
    assert comments[0]["edited_at"] is None and comments[0]["created_at"]
    assert {"id", "task_id", "author", "body", "created_at", "edited_at"} == set(comments[0])


async def test_new_comment_is_last_and_authored_by_the_selected_user(client):
    task_id = await settings_task_id(client)
    response = await post(client, task_id, "  Started on the form.  ")
    assert response.status_code == 201
    created = response.json()
    assert created["body"] == "Started on the form." and created["author"]["display_name"] == "Sam Lee"
    comments = (await client.get(f"/api/v1/tasks/{task_id}/comments", headers=SAM)).json()
    assert comments[-1]["id"] == created["id"] and len(comments) == 3


async def test_author_cannot_be_forged_in_the_body(client):
    task_id = await settings_task_id(client)
    response = await client.post(
        f"/api/v1/tasks/{task_id}/comments", json={"body": "hi", "author_id": 1}, headers=SAM
    )
    assert response.status_code == 422


async def test_body_limits_in_characters(client):
    task_id = await settings_task_id(client)
    assert (await post(client, task_id, "a" * 2000)).status_code == 201
    assert (await post(client, task_id, FAMILY * 2000)).status_code == 201
    for bad in ("", "  \n\t", "a" * 2001, FAMILY * 2001):
        response = await post(client, task_id, bad)
        assert response.status_code == 422, repr(bad[:20])
        assert response.json()["error"]["fields"][0]["field"] == "body"


async def test_non_author_cannot_edit_or_delete_even_the_product_manager(client, db):
    task_id = await settings_task_id(client)
    comment = (await post(client, task_id, "Mine", SAM)).json()
    url = f"/api/v1/comments/{comment['id']}"
    for headers in (ALEX, RILEY):
        edit = await client.patch(url, json={"body": "Hacked"}, headers=headers)
        assert edit.status_code == 403 and edit.json()["error"]["code"] == "not_comment_author"
        assert (await client.delete(url, headers=headers)).status_code == 403
    comments = (await client.get(f"/api/v1/tasks/{task_id}/comments", headers=SAM)).json()
    assert [c["body"] for c in comments if c["id"] == comment["id"]] == ["Mine"]
    rows = (
        (await db.execute(select(AuditEntry).where(AuditEntry.action == "request.refused"))).scalars().all()
    )
    assert len(rows) == 4 and all(r.reason == "not_comment_author" for r in rows)
    assert {r.actor_id for r in rows} == {1, 4} and rows[0].route == "PATCH /comments/{comment_id}"
    assert all(r.changes is None for r in rows)


async def test_author_edits_and_deletes(client):
    task_id = await settings_task_id(client)
    comment = (await post(client, task_id, "First")).json()
    url = f"/api/v1/comments/{comment['id']}"
    edited = (await client.patch(url, json={"body": "Second"}, headers=SAM)).json()
    assert edited["body"] == "Second" and edited["edited_at"] is not None
    assert (await client.delete(url, headers=SAM)).status_code == 204
    listing = (await client.get(f"/api/v1/tasks/{task_id}/comments", headers=SAM)).json()
    assert comment["id"] not in [c["id"] for c in listing]
    assert (await client.delete(url, headers=SAM)).status_code == 404


async def test_edit_validates_body(client):
    task_id = await settings_task_id(client)
    comment = (await post(client, task_id, "Keep me")).json()
    url = f"/api/v1/comments/{comment['id']}"
    for body in ({"body": ""}, {"body": "a" * 2001}, {}, {"body": "x", "edited_at": None}):
        assert (await client.patch(url, json=body, headers=SAM)).status_code == 422, body


async def test_unknown_ids_return_404(client):
    assert (await client.get("/api/v1/tasks/9999/comments", headers=SAM)).status_code == 404
    assert (await post(client, 9999, "x")).status_code == 404
    assert (await client.patch("/api/v1/comments/9999", json={"body": "x"}, headers=SAM)).status_code == 404
    assert (await client.delete("/api/v1/comments/9999", headers=SAM)).status_code == 404


async def test_comment_count_appears_on_tasks(client):
    task_id = await settings_task_id(client)
    assert (await client.get(f"/api/v1/tasks/{task_id}", headers=SAM)).json()["comment_count"] == 2
    await post(client, task_id, "More")
    assert (await client.get(f"/api/v1/tasks/{task_id}", headers=SAM)).json()["comment_count"] == 3
