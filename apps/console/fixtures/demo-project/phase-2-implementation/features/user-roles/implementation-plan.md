---
id: implementation-plan
kind: artifact
phase: 2
feature: "user-roles"
plan_ref: "F-003"
authors: [senior-developer]
consumed_by: [implementer]
status: final
---

# Implementation Plan — `user roles & permissions`

> The senior-developer's **plan of change**: which parts of the code change and why, so
> the implementer can execute without re-deciding anything. Written after the masterplan
> and the four discovery docs; kept honest by the fail-routing rule — if a review finds
> the *plan* wrong, this doc comes back here and is updated, never silently diverged from.

## Files / areas to change — and why

| Area / file | Change | Why (traces to) |
| --- | --- | --- |
| `<path>` | `<what changes>` | `<edge-case #, criterion, or masterplan constraint>` |

## Approach

The smallest coherent approach, in small testable steps. Sequence them.

1. `<step>`
2. `<step>`

## Pre-refactor (if any)

The change that makes the change easy — done first, as its own commit(s). "None" is a
valid answer; say it explicitly.

## Test surface

What gets tested at which level, per the `test-strategist` plan in
`edge-case-analysis.md`. Every acceptance criterion maps to a concrete change **and** a test.

| Criterion / case | Test level | Where |
| --- | --- | --- |
| `<AC>` | unit / integration / e2e | `<test file/area>` |

## Out of scope

Explicit. Drive-by temptations named here so the diff stays scoped.

- `<...>`

## Rejected alternatives — and why

The implementer inherits the reasoning, not just the verdict.

- `<alternative>` — `<why not>`
