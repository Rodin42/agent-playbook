---
id: masterplan
kind: artifact
phase: 2
feature: "vipps-login"
plan_ref: "F-005"
authored_by: rodin-twin     # the requester's human-twin
reads: [substrate.md, architecture.md, feature-plan.md, "features/<slug>/*"]
consumed_by: [senior-developer]
status: final
---

# Masterplan — `vipps login`

> **One masterplan per feature**, written by `rodin-twin` after the four discovery docs
> are complete and before the `senior-developer` plans. It synthesizes the discovery into
> the **build instruction** — what this build must deliver and in what order, in Rodin's
> priorities and red lines. Sequencing the build is a priorities decision, not a
> specialist one; that is why the twin writes it.
>
> Cross-feature order and shared work do **not** live here — they live in
> `feature-plan.md` (the **Depends on** and **Shared work needed** fields of each entry).
> This doc is only about *this* feature.
>
> Keep it short — it sequences the work, it does not re-explain the discovery.

## What this build must deliver

The outcome in a few lines, tied to the feature-plan hypothesis and the acceptance
criteria in `edge-case-analysis.md`. Not a restatement — the twin's reading of what
matters most.

## Key constraints

The 2–4 things the build must honor, in priority order (from the discovery docs, the
substrate, and the PO's **Answered in advance**). When they conflict, the higher wins.

- `<...>`

## Build order within the feature

The order of work, one-line reason each. Riskiest or most-unknown part first, so
surprises come early.

1. `<part>` — `<why this order>`

## Sequencing notes

Anything the builders must not miss: what must exist before what, where the blast
radius is, what to leave for last.
