import json

from sqlalchemy import select

from app.models.audit import AuditEntry
from tests.conftest import headers_for


async def audit_rows(db):
    return list((await db.execute(select(AuditEntry).order_by(AuditEntry.id))).scalars())


async def test_missing_user_header_returns_401_envelope(client, db):
    response = await client.get("/api/v1/users/me")
    assert response.status_code == 401
    body = response.json()
    assert body["error"]["code"] == "user_required"
    assert body["request_id"] and response.headers["x-request-id"] == body["request_id"]
    rows = await audit_rows(db)
    assert len(rows) == 1
    assert rows[0].action == "request.refused" and rows[0].reason == "user_required"
    assert rows[0].route == "GET /users/me" and rows[0].changes is None and rows[0].actor_id is None


async def test_malformed_and_unknown_user_headers_are_401(client, db):
    for value in ("abc", "-1", "1.5", "", "99"):
        response = await client.get("/api/v1/users/me", headers={"X-Taskify-User": value})
        assert response.status_code == 401, value
        assert response.json()["error"]["code"] == "user_required"
    assert len(await audit_rows(db)) == 5


async def test_valid_user_is_accepted(client):
    response = await client.get("/api/v1/users/me", headers=headers_for("sam"))
    assert response.status_code == 200
    assert response.json()["display_name"] == "Sam Lee"


async def test_users_list_is_public_and_product_manager_first(client):
    response = await client.get("/api/v1/users")
    assert response.status_code == 200
    users = response.json()
    assert [u["display_name"] for u in users][0] == "Alex Morgan"
    assert len(users) == 5


async def test_request_id_is_echoed_when_valid(client):
    response = await client.get("/api/v1/health", headers={"X-Request-ID": "trace-12345678"})
    assert response.headers["x-request-id"] == "trace-12345678"


async def test_security_headers_present(client):
    response = await client.get("/api/v1/health")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
    assert response.headers["referrer-policy"] == "no-referrer"
    assert "default-src 'none'" in response.headers["content-security-policy"]


async def test_unexpected_error_returns_generic_500_without_stack_trace(app, client):
    @app.get("/api/v1/_boom")
    async def boom():
        raise RuntimeError("secret database detail /var/lib/x.db")

    response = await client.get("/api/v1/_boom")
    assert response.status_code == 500
    text = response.text
    assert json.loads(text)["error"]["code"] == "internal_error"
    assert "secret" not in text and "Traceback" not in text and ".db" not in text


async def test_unknown_route_uses_the_envelope(client):
    response = await client.get("/api/v1/nope")
    assert response.status_code == 404
    assert response.json()["error"]["code"] == "not_found"


async def test_health_reports_database_ok(client):
    response = await client.get("/api/v1/health")
    assert response.json() == {"status": "ok", "database": "ok"}
    metrics = await client.get("/api/v1/metrics")
    assert metrics.status_code == 200 and "requests" in metrics.json()
