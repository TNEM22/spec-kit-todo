"""Schemas shared by every endpoint: the strict base model and the error envelope."""

from pydantic import BaseModel, ConfigDict


class StrictModel(BaseModel):
    """Base for request bodies: unknown fields are rejected (Constitution II)."""

    model_config = ConfigDict(extra="forbid")


class FieldError(BaseModel):
    """One validation problem, naming the field and the rule broken."""

    field: str
    message: str


class ErrorBody(BaseModel):
    """The `error` object inside every error response."""

    code: str
    message: str
    fields: list[FieldError] | None = None


class ErrorEnvelope(BaseModel):
    """Shape of every error response (contracts/rest-api.md)."""

    error: ErrorBody
    request_id: str | None = None
