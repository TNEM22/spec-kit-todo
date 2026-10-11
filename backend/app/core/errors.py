"""Domain errors and the single error envelope (FR-020, FR-024, research R8).

Every error response is `{"error": {"code", "message", "fields"?}, "request_id"}`. Messages never
carry stack traces, database or file details, or ids other than project and task numbers.
Refusals (401, 403, 422) are written to the audit log without the submitted values (FR-023).
"""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.core.middleware import SECURITY_HEADERS
from app.models.audit import RefusalReason
from app.services import audit

logger = logging.getLogger(__name__)

API_PREFIX = "/api/v1"


class DomainError(Exception):
    """Base class for errors that map directly to an HTTP response."""

    status = 400
    code = "bad_request"
    message = "The request could not be processed."

    def __init__(self, message: str | None = None) -> None:
        """Create the error, optionally overriding the default message."""
        super().__init__(message or self.message)
        self.detail = message or self.message


class UserRequired(DomainError):
    """No valid selected user was sent (FR-005)."""

    status = 401
    code = "user_required"
    message = "Select a user to continue."


class NotCommentAuthor(DomainError):
    """Only a comment's author may change it (FR-019)."""

    status = 403
    code = "not_comment_author"
    message = "You can only change your own comments."


class NotFound(DomainError):
    """The project, task, comment or notification does not exist (or is not yours)."""

    status = 404
    code = "not_found"
    message = "That item no longer exists."


class FieldProblem(DomainError):
    """A value is well-formed but not acceptable (e.g., an unknown assignee); reported as a 422."""

    status = 422
    code = "validation_error"
    message = "Some fields are invalid."

    def __init__(self, field: str, message: str) -> None:
        """Create the error for one field."""
        super().__init__(self.message)
        self.fields = [{"field": field, "message": message}]


class ProjectNameTaken(DomainError):
    """Another project already uses this name, ignoring letter case."""

    status = 409
    code = "project_name_taken"
    message = "A project with this name already exists. Choose a different name."

    def __init__(self, name: str) -> None:
        """Create the error; the field message names the taken project."""
        super().__init__(self.message)
        self.fields = [
            {"field": "name", "message": f'A project named "{name}" already exists. Choose a different name.'}
        ]


_REFUSALS = {
    401: RefusalReason.user_required,
    403: RefusalReason.not_comment_author,
    422: RefusalReason.validation_error,
}


def _route_template(request: Request) -> str:
    """Method plus route template without the API prefix, e.g. `PATCH /comments/{comment_id}`."""
    route = request.scope.get("route")
    path = getattr(route, "path", None) or request.url.path
    if path.startswith(API_PREFIX):
        path = path[len(API_PREFIX) :] or "/"
    return f"{request.method} {path}"


def _request_id(request: Request) -> str | None:
    return getattr(request.state, "request_id", None)


def _envelope(
    request: Request, status: int, code: str, message: str, fields: list[dict] | None = None
) -> JSONResponse:
    body: dict = {"error": {"code": code, "message": message}, "request_id": _request_id(request)}
    if fields:
        body["error"]["fields"] = fields
    headers = {"x-request-id": _request_id(request) or ""}
    headers.update(SECURITY_HEADERS)
    return JSONResponse(body, status_code=status, headers=headers)


def _label(field: str) -> str:
    return field.replace("_", " ").capitalize()


def _field_errors(exc: RequestValidationError) -> list[dict]:
    """Turn pydantic errors into one entry per problem, naming the field and the rule."""
    result: list[dict] = []
    for err in exc.errors():
        loc = [str(part) for part in err.get("loc", ())]
        if loc and loc[0] in ("body", "query", "path"):
            loc = loc[1:]  # drop only the leading location marker; a field may itself be named "body"
        field = ".".join(loc) or "request"
        kind = err.get("type", "")
        message = str(err.get("msg", "Invalid value."))
        if kind == "value_error" and message.startswith("Value error, "):
            message = message[len("Value error, ") :]
        elif kind == "missing":
            message = f"{_label(field)} is required."
        elif kind == "extra_forbidden":
            message = f"{_label(field)} is not a known field."
        elif kind in ("string_type", "string_too_short"):
            message = f"{_label(field)} is required. Enter text."
        else:
            message = f"{_label(field)}: {message}"
        result.append({"field": field, "message": message})
    return result


def install_error_handlers(app: FastAPI) -> None:
    """Register the handlers that produce the error envelope."""

    @app.exception_handler(DomainError)
    async def domain_error(request: Request, exc: DomainError):
        reason = _REFUSALS.get(exc.status)
        if reason is not None:
            await audit.record_refusal(
                reason,
                _route_template(request),
                getattr(request.state, "actor_id", None),
                _request_id(request),
            )
        return _envelope(request, exc.status, exc.code, exc.detail, getattr(exc, "fields", None))

    @app.exception_handler(RequestValidationError)
    async def validation_error(request: Request, exc: RequestValidationError):
        errors = exc.errors()
        if errors and all(err.get("loc", ("",))[0] == "path" for err in errors):
            # a malformed id in the URL can never match an item: same answer as a missing one
            return _envelope(request, 404, NotFound.code, NotFound.message)
        fields = _field_errors(exc)
        await audit.record_refusal(
            RefusalReason.validation_error,
            _route_template(request),
            getattr(request.state, "actor_id", None),
            _request_id(request),
        )
        return _envelope(request, 422, "validation_error", "Some fields are invalid.", fields)

    @app.exception_handler(StarletteHTTPException)
    async def http_error(request: Request, exc: StarletteHTTPException):
        codes = {404: ("not_found", NotFound.message), 405: ("method_not_allowed", "Method not allowed.")}
        code, message = codes.get(exc.status_code, ("http_error", "The request could not be processed."))
        return _envelope(request, exc.status_code, code, message)

    @app.exception_handler(Exception)
    async def unexpected_error(request: Request, exc: Exception):
        logger.exception("unhandled error on %s", _route_template(request))
        return _envelope(request, 500, "internal_error", "Something went wrong. Try again.")
