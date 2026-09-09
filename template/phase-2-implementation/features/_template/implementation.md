---
id: implementation
kind: artifact
phase: 2
feature: "<feature-slug>"
plan_ref: "F-NNN"
authors: [implementer]
status: in-progress   # in-progress | in-review | qa | merged
branch: "feature/<feature-slug>"
pr:            # set by promoter: the PR number, e.g. 42
merged_at:     # set by post-pull-request-qa: ISO timestamp
---

# Implementation — `<feature name>`

> The build record and the running trail of review → QA → merge. One artifact, four
> sections, filled in by the pipeline roles in order.

## What was built
A reviewer-friendly summary: the change, the approach, and how it maps to the discovery
docs. Link them:
`brainstorming` · `online-research` · `edge-case-analysis` · `architecture-analysis`.

## Key decisions & deviations
Where the build differed from the plan, and why. If the plan was wrong, note that it was
updated — don't diverge silently.

## How to verify
The steps a reviewer runs to see it work, and what was tested at each level.

## Checklist (author self-review before handoff)
- [ ] Acceptance criteria met and tested.
- [ ] No new `substrate.md` non-negotiable violated.
- [ ] Diff scoped to this feature; no drive-by changes.
- [ ] Local checks green (lint, type, test, build).
- [ ] No secrets in code, logs, or this doc.

---

## Adversarial review
_Filled by `adversarial-reviewer`. Heading is machine-read — do not rename._ Findings most-severe first._

| Severity | Finding | Failing scenario | Status |
| --- | --- | --- | --- |
| | | | open / fixed / accepted |

_Last line of this section, literally one of (machine-read):_ `**Verdict:** pass` · `**Verdict:** fail → implementer — <reason>` · `**Verdict:** fail → senior-developer — <reason>`

---

## Pre-PR QA
_Filled by `pre-pull-request-qa`. Heading is machine-read — do not rename._ Each item pass/fail with evidence._

- [ ] Builds clean · [ ] Suite green · [ ] Acceptance criteria demonstrated
- [ ] Review findings resolved · [ ] Substrate red lines respected · [ ] No secrets
- [ ] Observability present · [ ] Docs updated · [ ] Diff scoped

_Last line of this section, literally one of (machine-read):_ `**Verdict:** pass` · `**Verdict:** fail → implementer — <reason>` · `**Verdict:** fail → senior-developer — <reason>` · `**Verdict:** fail → test-strategist — <reason>`

---

## Post-merge
_Filled by `post-pull-request-qa`. Heading is machine-read — do not rename._

- **Deploy/rollout result:** `<...>`
- **Health over the watch window:** `<error rate, latency, key metric>`
- **Success metric status:** `<moving? baseline set?>`
- **Follow-ups → feature-plan (Source: Phase 3):** `<...>`
