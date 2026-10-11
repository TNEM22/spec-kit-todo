import pytest
from sqlalchemy import create_engine, text
from starlette.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from tests.conftest import ALLOWED_ORIGIN


def audit(settings):
    engine = create_engine(settings.database_url.replace("+aiosqlite", ""))
    with engine.connect() as connection:
        rows = connection.execute(
            text("select reason, route, actor_id, changes from audit_entries order by id")
        ).all()
    engine.dispose()
    return rows


def test_valid_handshake_receives_hello_and_pong(app):
    with TestClient(app) as client:
        with client.websocket_connect("/api/v1/ws?user=2", headers={"origin": ALLOWED_ORIGIN}) as ws:
            assert ws.receive_json() == {"type": "hello", "data": {"user_id": 2}}
            ws.send_json({"type": "ping"})
            assert ws.receive_json() == {"type": "pong"}


def test_unknown_client_messages_are_ignored(app):
    with TestClient(app) as client:
        with client.websocket_connect("/api/v1/ws?user=2") as ws:
            ws.receive_json()
            ws.send_text("not json")
            ws.send_json({"type": "delete_everything"})
            ws.send_json({"type": "ping"})
            assert ws.receive_json() == {"type": "pong"}  # nothing else was answered


def test_disallowed_origin_is_closed_with_4403_and_audited(app, settings):
    with TestClient(app) as client:
        with client.websocket_connect("/api/v1/ws?user=2", headers={"origin": "http://evil.example"}) as ws:
            with pytest.raises(WebSocketDisconnect) as error:
                ws.receive_json()
            assert error.value.code == 4403
    rows = audit(settings)
    assert ("origin_not_allowed", "WS /ws", None, None) in rows


@pytest.mark.parametrize("query", ["user=99", "user=abc", ""])
def test_unknown_or_missing_user_is_closed_with_4401_and_audited(app, settings, query):
    with TestClient(app) as client:
        with client.websocket_connect(f"/api/v1/ws?{query}") as ws:
            with pytest.raises(WebSocketDisconnect) as error:
                ws.receive_json()
            assert error.value.code == 4401
    assert any(r[0] == "user_required" and r[1] == "WS /ws" for r in audit(settings))
