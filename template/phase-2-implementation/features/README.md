# Features

One folder per feature. Everything about a feature — its thinking and its record — lives
together here.

## Start a feature

1. A `feature-plan.md` entry reaches **Ready** in Phase 1.
2. Copy the template to a new folder named for the feature (kebab-case slug):
   ```bash
   cp -r phase-2-implementation/features/_template phase-2-implementation/features/<feature-slug>
   ```
3. Set the feature-plan `ID` and slug at the top of each copied artifact so the trail is linked.
4. Work top to bottom: `brainstorming` → `online-research` → `edge-case-analysis` →
   `architecture-analysis` → `masterplan` → `implementation-plan` → `implementation`.

## What's in a feature folder

| File | Produced by | Purpose |
| --- | --- | --- |
| `brainstorming.md` | product-strategist, ux-strategist | Shape the solution space. |
| `online-research.md` | any AI role | Prior art, libraries, pitfalls. |
| `edge-case-analysis.md` | test-strategist, ux-strategist | Failure modes + acceptance criteria. |
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
| `draft` | being written; nobody downstream may rely on it | the authoring role |
| `in-review` | written; awaiting the twin / reviewing role | the authoring role |
| `final` | accepted — the consuming role may read it | the twin or reviewing role |
| `superseded` | replaced by a newer artifact of the same kind | whoever replaces it |

`implementation.md` keeps its own lifecycle (`in-progress | in-review | qa | merged`)
because it tracks the build, not a document. The console derives every pipeline station
from exactly these fields (BUILD-PLAN §2.1); the orchestrator marks a run `ok` only when
the role's `writes:` artifact exists and its status advanced.
