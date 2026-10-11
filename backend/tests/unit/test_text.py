import pytest
from pydantic import BaseModel, ValidationError

from app.core.text import OptionalText, RequiredText, clean, grapheme_length

FAMILY = "\U0001f468‍\U0001f469‍\U0001f467"  # one user-perceived character


class Title(BaseModel):
    title: RequiredText(200, "Title")
    note: OptionalText(10, "Note") = None


def test_family_emoji_counts_as_one_character():
    assert grapheme_length(FAMILY) == 1
    assert len(FAMILY) == 5  # code points, which is why the validator must not use len()


def test_two_hundred_emoji_pass_and_two_hundred_one_fail():
    assert Title(title=FAMILY * 200).title == FAMILY * 200
    with pytest.raises(ValidationError) as error:
        Title(title=FAMILY * 201)
    assert "Title is too long. Enter 1 to 200 characters." in str(error.value)


def test_ordinary_text_limit():
    assert Title(title="a" * 200)
    with pytest.raises(ValidationError):
        Title(title="a" * 201)


def test_tabs_line_breaks_and_non_breaking_spaces_are_trimmed():
    assert clean("\t   Hello \n\r ") == "Hello"
    assert Title(title=" \tWrite release notes\n ").title == "Write release notes"


def test_whitespace_only_is_empty_and_rejected():
    with pytest.raises(ValidationError) as error:
        Title(title=" \t \n ")
    assert "Title is required. Enter 1 to 200 characters." in str(error.value)


def test_optional_text_turns_empty_into_none_and_keeps_inner_text():
    assert Title(title="x", note="  \n ").note is None
    assert Title(title="x", note=" a\nb ").note == "a\nb"
    with pytest.raises(ValidationError):
        Title(title="x", note="12345678901")


def test_text_is_nfc_normalised():
    decomposed = "é"  # e + combining acute
    assert clean(decomposed) == "é"
    assert Title(title=decomposed).title == "é"
