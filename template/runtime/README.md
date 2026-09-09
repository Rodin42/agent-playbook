# runtime/ — what the orchestrator writes here, and how

The factory's execution layer for this project. Everything in this folder is either
config (committed) or the run trail (partly committed). The console renders these files;
it never owns them.

| Path | Written by | Committed | Purpose |
| --- | --- | --- | --- |
| `factory.defaults.yaml` | template | yes | shipped defaults; `/factory.config.yaml` overrides key by key |
| `sandbox.Dockerfile` | operator (Stage 3) | yes | the image `factory template build` turns into the e2b template named in `factory.config.yaml` → `sandbox.e2b.template` |
| `runs/<id>.json` | orchestrator | yes (next commit on the branch) | one record per role run — schema below |
| `logs/<id>.log` | orchestrator | **no** (gitignored) | the run's log: prompt size, harness command, harness result, verdict |
| `flags/<id>.md` | twin / orchestrator | yes | escalations for the operator — schema below |
| `decisions.log` | console / orchestrator | yes | JSONL, one line per operator or twin decision |

## One run = `factory run <role> <feature>`

1. Create a sandbox from the project template; inject secrets from `.env` as env vars only.
2. Clone the repo, check out `feature/<slug>` (created from `main_branch` if new).
3. Seed `phase-2-implementation/features/<slug>/` from `_template/` if missing.
4. Compose the prompt: step instruction + the role doc + every resolved `reads:` file.
   Resolution: bare names → `phase-1-product-development/<name>`; `features/<slug>/…` →
   `phase-2-implementation/features/<slug>/…`; `<slug>` substituted; any other `<…>` entry
   is an external input, not a file.
5. Run the harness headless: `claude -p --model <model> --output-format json
   --dangerously-skip-permissions < prompt.md` (cwd = repo). Exit code is informational.
6. **Verdict by contract**, never by exit code: `steps.yaml` names the role's targets and
   the status each must carry afterwards (or the literal verdict line for gate sections).
   Every target must exist, parse, have no placeholders in its frontmatter, and at least
   one must have changed. A role with `escalate: true` may instead leave a new
   `flags/<id>.md`: the run is then `escalated`, not failed.
7. Write `runs/<id>.json` into the checkout, commit `factory: <role> <slug>` with trailers
   `Factory-Role:` and `Factory-Run:`, push the feature branch, refresh the feature
   worktree, destroy the sandbox.

## Branch policy — where each write goes

| Write | Branch | Reaches `main` via |
| --- | --- | --- |
| feature artifacts, code, tests | `feature/<slug>` | the feature's pull request |
| `feature-plan.md` edits made during a feature run | `feature/<slug>` | the same PR (plan status travels with the feature) |
| `runs/<id>.json`, `flags/<id>.md` written during a feature run | `feature/<slug>` | the same PR |
| Phase-3 housekeeping (no feature) | `factory/housekeeping-<date>` | its own PR |
| console actions (approve, resolve flag) | the operator's checkout, pushed as a PR by the console (M3) | PR |

Sandboxes never push `main`. Only the operator merges.

## Where the console reads

The console derives from the operator's checkout. Because sandbox commits land on
`origin/feature/<slug>`, the orchestrator keeps a git worktree per feature at
`.factory/worktrees/<slug>/` (gitignored), reset to the branch tip after every run, and the
console reads a feature folder from there when it exists. Run records and logs are written
to the checkout's `runtime/` directly.

## `runs/<id>.json`

```json
{ "id": "20260909T101500-product-strategist-ingest-folder",
  "feature": "ingest-folder", "role": "product-strategist", "step": 1,
  "harness": "claude-code", "model": "haiku", "sandbox": "<e2b id>",
  "started": "2026-09-09T10:15:00Z", "ended": "2026-09-09T10:17:40Z",
  "status": "running | ok | failed | stopped | escalated",
  "cost_usd": 0.02, "tokens": { "in": 18000, "out": 2100 },
  "reason": null, "branch": "feature/ingest-folder", "commit": "<sha>" }
```

`id` = `<UTC timestamp>-<role>-<slug>` (sortable, collision-free across parallel runs).
`step` = 1 for phase-1 roles, 2 for phase-2, 3 for phase-3. `reason` is set on failure.

## `flags/<id>.md`

```markdown
---
id: flag-2026-09-05-0007          # unique, sortable
type: sign-off | red-line | triage | rollback | system
step: 1 | 2 | 3
feature: F-006                    # optional for system flags
title: "New dependency — nodemailer"
created: 2026-09-05T09:12:00Z
status: open | resolved
recommendation: approve           # the twin's pick, a key from Options
---
## Question
## Options
- **approve** — …
- **reject** — …
## Blocked until answered
```

The console resolves a flag by appending `## Decision`, flipping `status: resolved`,
and committing `console: resolve <id> (<choice>)`.
