---
id: masterplan
kind: artifact-template
phase: 2
authored_by: rodin-twin     # the requester's human-twin (their AI-double)
reads: [substrate.md, architecture.md, feature-plan.md, "features/*/*"]
consumed_by: [senior-developer]
---

# Masterplan — <product>

> This is a **template for an artifact**, not a role. After the Phase 1 PRs are merged,
> the **requester's human-twin** (`rodin-twin`) writes one `masterplan.md`
> into the repo by synthesizing everything accumulated in Phase 1 (the analysis docs +
> the plan docs), in the requester's own priorities and red lines. It is the build
> instruction the pipeline consumes: the senior-developer reads it before choosing
> code changes.
>
> **One masterplan per project.** It lives here, at the top of Phase 2 — not in the
> feature folders. `rodin-twin` updates it whenever the set of Ready features changes,
> so it always reflects the current build order. Every feature's `senior-developer`
> reads it before planning.
>
> Keep it short — it sequences the work, it does not re-explain it.

## Build order
<!-- the Ready features in the order to build them, one-line reason each -->

## Dependencies & shared work
<!-- what must exist before what; foundational/shared changes several features need -->

## Per-feature target
<!-- for each feature: what "done" delivers, and the key constraint it must honor -->

## Sequencing notes
<!-- ordering that reduces rework or blast radius; anything the builders must not miss -->
