import pytest

from tests.conftest import headers_for

ALEX = headers_for("alex")
SAM = headers_for("sam")
JORDAN = headers_for("jordan")


async def project_id(client) -> int:
    return (await client.get("/api/v1/projects", headers=SAM)).json()[0]["id"]


async def assign_to_sam(client, title, actor=ALEX):
    pid = await project_id(client)
    response = await client.post(
        f"/api/v1/projects/{pid}/tasks", json={"title": title, "assignee_id": 2}, headers=actor
    )
    assert response.status_code == 201
    return response.json()


async def test_list_is_newest_first_with_unread_count(client):
    await assign_to_sam(client, "First")
    await assign_to_sam(client, "Second")
    response = await client.get("/api/v1/notifications", headers=SAM)
    assert response.status_code == 200
    body = response.json()
    assert body["unread_count"] == 2
    assert [n["task_title"] for n in body["items"]] == ["Second", "First"]
    note = body["items"][0]
    assert note["type"] == "task_assigned" and note["read"] is False
    assert note["actor"]["display_name"] == "Alex Morgan"
    assert note["project"]["name"] == "Customer Portal"
    assert set(note) == {
        "id",
        "type",
        "actor",
        "project",
        "task_id",
        "task_title",
        "to_column",
        "comment_preview",
        "created_at",
        "read",
    }


async def test_each_user_sees_only_their_own_notifications(client):
    await assign_to_sam(client, "For Sam")
    assert (await client.get("/api/v1/notifications", headers=JORDAN)).json() == {
        "items": [],
        "unread_count": 0,
    }
    assert (await client.get("/api/v1/notifications", headers=ALEX)).json()["items"] == []


async def test_limit_is_between_1_and_100(client):
    for i in range(3):
        await assign_to_sam(client, f"T{i}")
    assert len((await client.get("/api/v1/notifications?limit=2", headers=SAM)).json()["items"]) == 2
    for bad in ("0", "101", "abc"):
        assert (await client.get(f"/api/v1/notifications?limit={bad}", headers=SAM)).status_code == 422


async def test_mark_read_is_idempotent_and_updates_the_count(client):
    await assign_to_sam(client, "One")
    await assign_to_sam(client, "Two")
    items = (await client.get("/api/v1/notifications", headers=SAM)).json()["items"]
    first = await client.post(f"/api/v1/notifications/{items[0]['id']}/read", headers=SAM)
    assert first.status_code == 200 and first.json()["read"] is True
    again = await client.post(f"/api/v1/notifications/{items[0]['id']}/read", headers=SAM)
    assert again.status_code == 200 and again.json()["read"] is True
    assert (await client.get("/api/v1/notifications", headers=SAM)).json()["unread_count"] == 1


async def test_read_all_returns_zero(client):
    await assign_to_sam(client, "One")
    await assign_to_sam(client, "Two")
    response = await client.post("/api/v1/notifications/read-all", headers=SAM)
    assert response.status_code == 200 and response.json() == {"unread_count": 0}
    body = (await client.get("/api/v1/notifications", headers=SAM)).json()
    assert body["unread_count"] == 0 and all(n["read"] for n in body["items"])


async def test_another_users_notification_is_404_and_stays_unread(client):
    await assign_to_sam(client, "Private")
    note_id = (await client.get("/api/v1/notifications", headers=SAM)).json()["items"][0]["id"]
    response = await client.post(f"/api/v1/notifications/{note_id}/read", headers=JORDAN)
    assert response.status_code == 404 and response.json()["error"]["code"] == "not_found"
    assert (await client.post("/api/v1/notifications/9999/read", headers=JORDAN)).status_code == 404
    assert (await client.get("/api/v1/notifications", headers=SAM)).json()["unread_count"] == 1
    # read-all by someone else does not touch Sam's notifications
    await client.post("/api/v1/notifications/read-all", headers=JORDAN)
    assert (await client.get("/api/v1/notifications", headers=SAM)).json()["unread_count"] == 1


@pytest.mark.parametrize("method", ["post", "put", "patch", "delete"])
async def test_notifications_cannot_be_created_edited_or_deleted(client, method):
    await assign_to_sam(client, "x")
    note_id = (await client.get("/api/v1/notifications", headers=SAM)).json()["items"][0]["id"]
    assert (await getattr(client, method)("/api/v1/notifications", headers=SAM)).status_code in (405, 422)
    if method != "post":
        response = await getattr(client, method)(f"/api/v1/notifications/{note_id}", headers=SAM)
        assert response.status_code in (404, 405)


async def test_notifications_require_a_selected_user(client):
    assert (await client.get("/api/v1/notifications")).status_code == 401
    assert (await client.post("/api/v1/notifications/read-all")).status_code == 401
