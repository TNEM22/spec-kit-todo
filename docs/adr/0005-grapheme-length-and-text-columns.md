# ADR 0005 — Grapheme-Cluster Length Counting for Text Fields

**Date**: 2026-10-11  
**Status**: Accepted  
**Deciders**: Project maintainers  
**Constitution reference**: Principle II (Validate All Inputs)

## Context

Taskify stores user-entered text in several columns (task titles, descriptions, comment bodies,
project names). The maximum length must be enforced consistently on both the server and the client.
Naive byte or UTF-16 code-unit counting penalises users who type emoji or characters outside the
Basic Multilingual Plane: a single family emoji (👨‍👩‍👧) is 8 UTF-16 code units and 11 UTF-8 bytes,
but is perceived by the user as one character.

## Decision

All text field limits are enforced in **user-perceived characters (Unicode grapheme clusters)**:

- **Server**: the `regex` library's `\X` pattern counts grapheme clusters.
  The `RequiredText(max)` and `OptionalText(max)` Pydantic annotated types reuse this counter.
- **Client**: `Intl.Segmenter(undefined, { granularity: "grapheme" })` counts grapheme clusters in
  Angular. The `requiredText(max)` and `optionalText(max)` validator functions in
  `core/text/grapheme-length.ts` mirror the server rules exactly, including NFC normalisation and
  whitespace trimming.
- **Storage**: columns are sized generously in bytes (SQLite `TEXT` is unlimited; the limit is
  enforced by Pydantic, not the schema).
- **Trimming**: both sides NFC-normalise, then call `str.strip()` / `String.prototype.trim()`,
  which removes spaces, tabs, line breaks and non-breaking spaces. Whitespace-only input is treated
  as empty.
- **Error messages** are identical on both sides so a server 422 message can be shown under the
  same field as the client error: "Title is required. Enter 1 to 200 characters."

## Consequences

**Positive**
- Users who type emoji or accented characters count them fairly.
- The client and server enforce identical rules, so a server 422 is rare and only occurs if the
  client check was bypassed.

**Negative / Trade-offs**
- `Intl.Segmenter` is a relatively recent API; a code-point fallback (`Array.from`) is provided
  for environments that lack it.
- The `regex` Python package is an additional dependency over the standard `re` module.

