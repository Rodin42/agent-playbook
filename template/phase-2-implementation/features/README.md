# Features

One folder per feature. Everything about a feature — its thinking and its record — lives
together here.

## Start a feature

1. A `feature-plan.md` entry reaches **Ready** in Phase 1.
2. The orchestrator seeds the folder from `_template/` on the feature's first run
   (`factory run product-strategist <slug>`); by hand it is
   `cp -r phase-2-implementation/features/_template phase-2-implementation/features/<slug>`.
3. Each role sets `feature:` and `plan_ref:` in the artifact it writes.
4. Work top to bottom: `brainstorming` → `online-research` → `edge-case-analysis` →
   `architecture-analysis` → `masterplan` → `implementation-plan` → `implementation`.

## What's in a feature folder

| File | Produced by | Purpose |
| --- | --- | --- |
| `brainstorming.md` | product-strategist, ux-strategist | Shape the solution space. |
| `online-research.md` | ux-strategist | Prior art, libraries, pitfalls. |
| `edge-case-analysis.md` | test-strategist | Failure modes + acceptance criteria. |
| `architecture-analysis.md` | architect, deployment-strategist | Fit, boundaries, rollout. |
| `masterplan.md` | rodin-twin | The build instruction: what to deliver, constraints, build order. |
| `implementation-plan.md` | senior-developer | The plan of change the implementer executes. |
| `implementation.md` | implementer (+ review/QA sections) | What was built + the review/QA/post-merge record. |

`_template/` is the canonical starting point — improve the template and every future
feature benefits. Don't edit `_template/` for a specific feature.

## Artifact status vocabulary

Every discovery artifact (`brainstorming`, `online-research`, `edge-case-analysis`,
`architecture-analysis`, `masterplan`, `implementation-plan`) carries one `status:`
field with the same four values:

| Value | Meaning | Who moves it |
| --- | --- | --- |
| `draft` | being written; nobody downstream may rely on it | the owning role (template default) |
| `in-review` | written; awaiting the twin | the owning role at the end of its run; a second author keeps it here |
| `final` | accepted — the consuming role may read it | `rodin-twin` for the four discovery docs when it writes the masterplan; `rodin-twin` for its own masterplan; `senior-developer` for the implementation plan |
| `superseded` | replaced by a newer artifact of the same kind | whoever replaces it |

`implementation.md` keeps its own lifecycle (`in-progress | in-review | qa | merged`):
`implementer` → `in-review`; `adversarial-reviewer`'s pass verdict → `qa`; `promoter`
records `pr:`; `post-pull-request-qa` → `merged`. A fail verdict routes back and the
status returns to `in-review`.

The whole contract — role → target file → status after, verdict lines, who may escalate —
is `runtime/steps.yaml`. The console derives every pipeline station from these fields and
the orchestrator marks a run `ok` only when the contract holds; never from an exit code.

**The plan entry:** the operator marks it **Ready** (console or by hand); the orchestrator
flips it to **In progress** on the feature's first phase-2 run; `post-pull-request-qa`
sets **Shipped**.
