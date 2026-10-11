"""Text rules shared by every request schema (FR-020, research R14).

Input is NFC-normalised and trimmed (spaces, tabs, line breaks, non-breaking spaces). Lengths count
user-perceived characters (grapheme clusters), so an emoji counts as one. Whitespace-only is empty.
"""

import unicodedata
from typing import Annotated

import regex
from pydantic import AfterValidator, BeforeValidator, StringConstraints  # noqa: F401

_GRAPHEME = regex.compile(r"\X")


def clean(text: str) -> str:
    """NFC-normalise and trim a string."""
    return unicodedata.normalize("NFC", text).strip()


def grapheme_length(text: str) -> int:
    """Count user-perceived characters in `text`."""
    return len(_GRAPHEME.findall(text))


def truncate_graphemes(text: str, limit: int) -> str:
    """Return the first `limit` user-perceived characters of `text`."""
    return "".join(_GRAPHEME.findall(text)[:limit])


def _required(maximum: int, label: str):
    """Build a validator for required text of 1..maximum characters."""

    def check(value: str) -> str:
        cleaned = clean(value)
        if not cleaned:
            raise ValueError(f"{label} is required. Enter 1 to {maximum} characters.")
        if grapheme_length(cleaned) > maximum:
            raise ValueError(f"{label} is too long. Enter 1 to {maximum} characters.")
        return cleaned

    return check


def _optional(maximum: int, label: str):
    """Build a validator for optional text of up to `maximum` characters."""

    def check(value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = clean(value)
        if not cleaned:
            return None
        if grapheme_length(cleaned) > maximum:
            raise ValueError(f"{label} is too long. Enter up to {maximum} characters.")
        return cleaned

    return check


def RequiredText(maximum: int, label: str = "This field"):  # noqa: N802 - used like a type
    """Annotated str: required, 1..maximum user-perceived characters after trimming."""
    return Annotated[str, AfterValidator(_required(maximum, label))]


def OptionalText(maximum: int, label: str = "This field"):  # noqa: N802 - used like a type
    """Annotated optional str: up to `maximum` characters, empty becomes None."""
    return Annotated[str | None, AfterValidator(_optional(maximum, label))]
