---
id: feature-plan
kind: artifact
phase: 1
authority: gate
reads: [substrate.md, architecture.md]
writes: []
handoff_to: [senior-developer, product-strategist]
---

# Feature Plan

> The prioritized backlog. Every entry that reaches **Ready** becomes a Phase 2 feature
> folder. Owned by `product-strategist`; scored with the AI roles; gated by `rodin-twin`.

## Backlog

| ID | Feature | Problem it solves | Priority | Status | Feature folder |
| --- | --- | --- | --- | --- | --- |
| F-001 | `<name>` | `<user problem>` | P1 | Idea / Ready / In progress / Shipped | `features/<slug>/` |

**Status legend:** `Idea` → `Shaping` → `Ready` (passes Definition of Ready) →
`In progress` (Phase 2) → `Shipped` → `Observing` (Phase 3).

## Entry format

Copy this block per feature. Keep it to the point — depth belongs in the Phase 2
`brainstorming.md`, this is the seed.

### F-NNN · `<feature name>`

- **PO (owner):** who proposed it and answers product questions, and how to reach them.
- **Problem / user:** who hurts, and how. Not the solution.
- **Hypothesis:** we believe `<change>` will cause `<outcome>` for `<user>`.
- **Success metric:** what Phase 3 will observe to confirm it worked.
- **Scope:** what's in / what's **explicitly out**.
- **Depends on:** F-IDs that must ship (or be partially built) first — or "—".
- **Shared work needed:** things several features need, to be built **once, first**
  (e.g. a notification service) — the guard against two parallel features building the
  same thing twice.
- **Substrate impact:** respects `substrate.md`? If not, link the ADR.
- **Priority & why:** P0–P3 with a one-line justification.
- **Answered in advance:** the PO's calls on the predictable questions, written at
  intake while the PO is present: what's out of scope, the one constraint that matters
  most, what "good enough for v1" looks like.
- **Open questions → PO:** the async queue. Agents append questions here during shaping
  and discovery; answers land back here. An unanswered question parks the entry.
- **Sign-off:** `rodin-twin` — required before **Ready**.
- **Source:** stakeholder / Phase 3 finding / research (link it).

## Prioritization

State the rule so ranking is not vibes. Suggested default: score **Impact**,
**Confidence**, and **Effort** (1–5 each); rank by `Impact × Confidence ÷ Effort`.
Ties broken by the `product-strategist`, contested calls escalated to Rodin.

## Feedback loop from Phase 3

New entries frequently originate as Phase 3 findings — a recurring error in
`log-analysis`, a gap surfaced by `github-diff-report`, or an opportunity from
`ecosystem-watch`. Tag those entries **Source: Phase 3** so the loop is visible.
