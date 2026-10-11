import pytest

from tests.conftest import headers_for

ALEX = headers_for("alex")
SAM = headers_for("sam")


async def first_project_id(client) -> int:
    response = await client.get("/api/v1/projects", headers=SAM)
    return response.json()[0]["id"]


async def test_users_endpoints(client):
    users = (await client.get("/api/v1/users")).json()
    assert [u["display_name"] for u in users][0] == "Alex Morgan" and len(users) == 5
    assert (await client.get("/api/v1/users/me", headers=SAM)).json()["display_name"] == "Sam Lee"


@pytest.mark.parametrize("method", ["post", "put", "patch", "delete"])
async def test_no_endpoint_creates_edits_or_deletes_users(client, method):
    for path in ("/api/v1/users", "/api/v1/users/1"):
        response = await getattr(client, method)(path, headers=SAM)
        assert response.status_code in (404, 405), (method, path)
    # the collection path exists for GET only, so write methods there are 405
    assert (await getattr(client, method)("/api/v1/users", headers=SAM)).status_code == 405


async def test_projects_list_has_counts_and_assigned_to_me(client):
    response = await client.get("/api/v1/projects", headers=SAM)
    assert response.status_code == 200
    projects = response.json()
    assert [p["name"] for p in projects] == ["Customer Portal", "Billing Revamp", "Internal Tools"]
    portal = projects[0]
    assert set(portal["counts"]) == {"todo", "in_progress", "in_review", "done"}
    assert sum(portal["counts"].values()) >= 20
    assert portal["assigned_to_me"] == 4  # Sam: build settings, email toggles, search filters, sessions
    alex = (await client.get("/api/v1/projects", headers=ALEX)).json()[0]
    assert alex["assigned_to_me"] == 4  # Alex: screenshots, error codes, onboarding copy, survey


async def test_projects_require_a_selected_user(client):
    assert (await client.get("/api/v1/projects")).status_code == 401
    assert (await client.get("/api/v1/projects/1/board")).status_code == 401


async def test_get_project(client):
    pid = await first_project_id(client)
    response = await client.get(f"/api/v1/projects/{pid}", headers=SAM)
    assert response.status_code == 200 and response.json()["name"] == "Customer Portal"


async def test_board_has_four_columns_ordered_by_position(client):
    pid = await first_project_id(client)
    board = (await client.get(f"/api/v1/projects/{pid}/board", headers=SAM)).json()
    assert list(board["columns"]) == ["todo", "in_progress", "in_review", "done"]
    for tasks in board["columns"].values():
        assert [t["position"] for t in tasks] == list(range(len(tasks)))
    task = board["columns"]["in_progress"][0]
    assert task["title"] == "Build account settings page"
    assert task["assignee"]["display_name"] == "Sam Lee"
    assert task["comment_count"] == 2
    assert set(task) >= {
        "id",
        "project_id",
        "title",
        "description",
        "column",
        "position",
        "assignee",
        "created_at",
        "updated_at",
        "comment_count",
    }


async def test_unassigned_task_has_null_assignee(client):
    pid = await first_project_id(client)
    board = (await client.get(f"/api/v1/projects/{pid}/board", headers=SAM)).json()
    assert board["columns"]["todo"][0]["assignee"] is None


async def test_move_validates_column_and_position(client):
    pid = await first_project_id(client)
    board = (await client.get(f"/api/v1/projects/{pid}/board", headers=SAM)).json()
    task_id = board["columns"]["todo"][0]["id"]
    for body in (
        {"column": "blocked"},
        {"column": "done", "position": -1},
        {"column": "done", "position": 1.5},
        {"position": 0},
        {"column": "done", "extra": 1},
    ):
        response = await client.post(f"/api/v1/tasks/{task_id}/move", json=body, headers=SAM)
        assert response.status_code == 422, body
        assert response.json()["error"]["code"] == "validation_error"
        assert response.json()["error"]["fields"]


async def test_move_returns_the_task_with_final_placement(client):
    pid = await first_project_id(client)
    board = (await client.get(f"/api/v1/projects/{pid}/board", headers=SAM)).json()
    task = board["columns"]["todo"][0]
    response = await client.post(
        f"/api/v1/tasks/{task['id']}/move", json={"column": "in_review", "position": 0}, headers=SAM
    )
    assert response.status_code == 200
    moved = response.json()
    assert moved["id"] == task["id"] and moved["column"] == "in_review" and moved["position"] == 0


async def test_unknown_ids_return_404(client):
    assert (await client.get("/api/v1/projects/9999", headers=SAM)).status_code == 404
    assert (await client.get("/api/v1/projects/9999/board", headers=SAM)).status_code == 404
    assert (await client.get("/api/v1/projects/abc/board", headers=SAM)).status_code == 404
    response = await client.post("/api/v1/tasks/9999/move", json={"column": "done"}, headers=SAM)
    assert response.status_code == 404 and response.json()["error"]["code"] == "not_found"
    assert (
        await client.post("/api/v1/tasks/0/move", json={"column": "done"}, headers=SAM)
    ).status_code == 404
