# ADR 0003 — Gapless Integer Position for Task Ordering

**Date**: 2026-10-11  
**Status**: Accepted  
**Deciders**: Project maintainers  
**Constitution reference**: Principle III (ORM-only access)

## Context

Tasks on the board must maintain a stable, user-visible order within each column. Users can move
tasks between columns and to specific positions within a column. The ordering must survive concurrent
moves.

## Decision

Each task stores a **`position` integer (≥ 0)** that is gapless within `(project_id, column)`. When
a task is moved:

1. The task is removed from its source column list.
2. The target column list (after the removal, if same column) is spliced at the requested index.
3. Both affected column lists are renumbered `0..n-1` in a single database transaction.

The column and position constraints are checked with a database check constraint and an index on
`(project_id, column, position)`. Concurrent moves resolve as last-write-wins: each move reads the
current list, renumbers, and commits. The frontend applies the server's final order from the
`task.moved` event.

## Consequences

**Positive**
- Simple integer comparison gives a deterministic sort order.
- Renumbering is O(n) within one column but n is bounded by the project size.
- No fractional arithmetic or rebalancing needed.

**Negative / Trade-offs**
- Concurrent moves can cause multiple rows to be updated in one transaction.
- Optimistic UI moves are shown immediately and may be reordered by the server's `task.moved`
  event if two users move the same card simultaneously.

## Alternatives Considered

| Alternative | Why rejected |
|-------------|-------------|
| Fractional ordering (e.g. 1.0, 1.5, 2.0) | Requires periodic rebalancing; more complex than needed for this scale. |
| Linked list (prev/next pointers) | Updates two rows per move; queries require traversal. |

