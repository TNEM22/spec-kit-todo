"""Request id, security headers and request metrics (research R12, R13)."""

import re
import time
import uuid

from starlette.types import ASGIApp, Message, Receive, Scope, Send

from app.core.logging import request_id_var
from app.core.metrics import metrics

_ID_OK = re.compile(r"^[A-Za-z0-9._-]{8,64}$")

SECURITY_HEADERS = {
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
    "x-frame-options": "DENY",
    "content-security-policy": "default-src 'none'",
}


class RequestContextMiddleware:
    """Set the request id, add security headers and record metrics for HTTP requests."""

    def __init__(self, app: ASGIApp) -> None:
        """Wrap the ASGI app."""
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        """Handle one ASGI call; non-HTTP scopes pass through untouched."""
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        incoming = dict(scope["headers"]).get(b"x-request-id", b"").decode("latin-1")
        request_id = incoming if _ID_OK.match(incoming) else uuid.uuid4().hex
        scope.setdefault("state", {})["request_id"] = request_id
        token = request_id_var.set(request_id)
        started = time.perf_counter()
        status_holder = {"status": 500}

        async def send_wrapper(message: Message) -> None:
            if message["type"] == "http.response.start":
                status_holder["status"] = message["status"]
                managed = {b"x-request-id", *(name.encode() for name in SECURITY_HEADERS)}
                # replace, never duplicate, headers an error handler already set
                headers = [h for h in message.get("headers", []) if h[0].lower() not in managed]
                headers.append((b"x-request-id", request_id.encode()))
                is_docs = scope.get("path", "").startswith("/api/v1/docs")
                for name, value in SECURITY_HEADERS.items():
                    # Swagger UI needs scripts and styles, so the docs page skips the strict CSP.
                    if is_docs and name == "content-security-policy":
                        continue
                    headers.append((name.encode(), value.encode()))
                message["headers"] = headers
            await send(message)

        try:
            await self.app(scope, receive, send_wrapper)
        finally:
            route = scope.get("route")
            template = getattr(route, "path", scope.get("path", ""))
            metrics.record(
                scope["method"], template, status_holder["status"], (time.perf_counter() - started) * 1000
            )
            request_id_var.reset(token)
