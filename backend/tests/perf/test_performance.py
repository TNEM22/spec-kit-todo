"""Timing checks on the 200-task "Performance Board" with five connected clients.

Run with `pytest -m perf`. Conditions match the spec: one machine, up to five open windows, a board
of up to 200 tasks (SC-003, SC-007, SC-009).
"""

import asyncio
import time
from contextlib import ExitStack

import pytest
from starlette.testclient import TestClient

from app.core.db import make_engine, make_session_factory
from app.seed.sample_data import seed_performance_board
from tests.conftest import headers_for

pytestmark = pytest.mark.perf

ALEX = headers_for("alex")


@pytest.fixture
def perf_app(app, settings):
    """The test app with the 200-task Performance Board added."""

    async def seed():
        engine = make_engine(settings.database_url)
        async with make_session_factory(engine)() as session:
            await seed_performance_board(session)
        await engine.dispose()

    asyncio.run(seed())
    return app


def collect(ws, wanted: set[str], limit: int = 8) -> dict[str, dict]:
    """Read events until every type in `wanted` has arrived (their order is not guaranteed)."""
    found: dict[str, dict] = {}
    for _ in range(limit):
        event = ws.receive_json()
        if event["type"] in wanted:
            found[event["type"]] = event
        if wanted <= set(found):
            return found
    raise AssertionError(f"missing {wanted - set(found)}; saw {sorted(found)}")


def test_board_load_move_and_live_delivery_are_fast_enough(perf_app):
    with TestClient(perf_app) as client:
        projects = client.get("/api/v1/projects", headers=ALEX).json()
        board_id = next(p["id"] for p in projects if p["name"] == "Performance Board")
        assert sum(next(p for p in projects if p["id"] == board_id)["counts"].values()) == 200

        started = time.perf_counter()
        board = client.get(f"/api/v1/projects/{board_id}/board", headers=ALEX).json()
        assert time.perf_counter() - started < 3.0, "board load must be under 3 s (SC-007)"
        assert sum(len(tasks) for tasks in board["columns"].values()) == 200

        # Sam (user 2) owns every 6th task; Alex moves one of Sam's tasks, five windows are open.
        sams = [
            t
            for tasks in board["columns"].values()
            for t in tasks
            if t["assignee"] and t["assignee"]["id"] == 2
        ]
        with ExitStack() as stack:
            sockets = {
                uid: stack.enter_context(client.websocket_connect(f"/api/v1/ws?user={uid}"))
                for uid in range(1, 6)
            }
            for ws in sockets.values():
                ws.receive_json()  # hello

            started = time.perf_counter()
            response = client.post(
                f"/api/v1/tasks/{sams[0]['id']}/move",
                json={"column": "in_review", "position": 0},
                headers=ALEX,
            )
            move_seconds = time.perf_counter() - started
            assert response.status_code == 200 and move_seconds < 1.0, "a move must answer under 1 s (SC-007)"

            for uid, ws in sockets.items():
                # Sam (user 2) also gets a notification; everyone else only the board event.
                wanted = {"task.moved", "notification.created"} if uid == 2 else {"task.moved"}
                events = collect(ws, wanted)
                elapsed = time.perf_counter() - started
                assert elapsed < 2.0, f"user {uid}: live events must arrive under 2 s (SC-003, SC-009)"
                assert events["task.moved"]["data"]["task"]["id"] == sams[0]["id"]
                if uid == 2:
                    assert events["notification.created"]["data"]["unread_count"] == 1
