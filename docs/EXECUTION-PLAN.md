# EXECUTION-PLAN — build the console in one go

Approved 2026-09-06 by the operator: *"make the best solution you can without asking me
on the way."* This file is the contract for that run **and** the resume point if
context is cleared. Keep the tracker current; append decisions as they are made.

## Operating rules
1. **Autonomous.** No check-ins. Every judgment call is taken, recorded in §Decisions,
   and stays revisable — nothing here is irreversible (no merges, no deploys, no
   writes to any project repo except fixtures under this monorepo).
2. **One commit per step, pushed immediately** (`push_after_commit`, D6). Prefixes:
   `factory:` for repo/orchestrator/core, `console:` for the console.
3. **Stack as locked** (BUILD-PLAN §1): Node 22+, TypeScript, npm workspaces, Hono,
   vanilla TS + esbuild, no database, localhost only, port 4571.
4. **Truth is the repo.** Every rendered element derives from files; refresh rebuilds.
5. **Tests are the brain's contract:** status derivation and flag parsing are
   table-driven unit tests; the fixture project is the integration test.
6. **Scope of this run:** **M1 complete** (read-only, multi-project) → **M2** (feature
   drawer + quality-of-life). **M3–M6 are not built in this run**: they write to
   project repos and run `gh` under the operator's credentials — the operator walks
   the M1/M2 journey on the fixture first (BUILD-PLAN §4 manual gate), then M3 starts.

## Progress tracker  (☐ todo · ◐ in progress · ☑ done — update on every commit)

| # | Step | Commit prefix | State |
| --- | --- | --- | --- |
| S0 | Reconcile docs (this file, BUILD-PLAN §2.1 vocabulary, RECONCILE-STATE, CHANGES D9, tokens, CONTEXT, templates) | — | ☑ |
| S1 | Restructure: repo root = monorepo; playbook → `template/`; docs → `docs/`; fixture seed → `apps/console/fixtures/playbook-baseline/`; drop `front-end/`, stale files, `template/.git` | `factory: monorepo skeleton` | ☐ |
| S2 | Workspace tooling: root `package.json` (workspaces, scripts lint/typecheck/test/build), base `tsconfig`, vitest, esbuild, minimal eslint | `factory: workspace tooling` | ☐ |
| S3 | `packages/core`: contracts as TS types (BUILD-PLAN §2), frontmatter reader, workspace loader, feature-plan parser, artifact + station derivation, flag parser, run registry + decision log readers, pre-work checks; table-driven tests | `factory: core derivation + tests` | ☐ |
| S4 | Fixture: `apps/console/fixtures/demo-project/` = template + 3 synthetic features in varied states + 1 finished + flags + runs + log + decisions + `fixtures/workspace.yaml` | `console: demo fixture` | ☐ |
| S5 | `packages/orchestrator`: `factory` CLI — `ui` real, `new` real, `run/next/stop/template build` exit 2 | `factory: cli (ui, new)` | ☐ |
| S6 | `apps/console/server`: Hono, JSON API per view, SSE via chokidar, static client, presence-only `.env` check | `console: server + SSE` | ☐ |
| S7 | `apps/console/client`: the mockup grown up — shell, project selector, top strip, nav with live badges, every M1 view from the API, SSE refresh | `console: client M1` | ☐ |
| S8 | M1 acceptance: run against the fixture; API smoke script; `factory new` into a temp workspace renders the A12 setup-checklist state; `rm -rf` server dir loses nothing | `console: M1 acceptance` | ☐ |
| S9 | Monorepo CI (`.github/workflows/ci.yml`: lint, typecheck, test, build) + README | `factory: ci` | ☐ |
| S10 | M2: feature drawer (artifact trail, tasks, questions, costs, branch/PR, runs both ways), relative times, hover paths, keyboard `g1/g2/g3`, station tooltips, mobile layout for escalation views | `console: M2` | ☐ |
| S11 | Close-out: tracker + `docs/SESSION-2026-09-06.md`, final push, summary for the operator | `docs: close-out` | ☐ |

## Architecture (fixed for this run)

```
agent-pipeline/
├── package.json                 npm workspaces: apps/*, packages/*
├── tsconfig.base.json
├── apps/console/
│   ├── server/   Hono app: routes → @factory/core; SSE; static
│   ├── client/   vanilla TS + one CSS (tokens from the mockup); esbuild → client/dist
│   └── fixtures/ demo-project/ (the integration fixture) · workspace.yaml · playbook-baseline/
├── packages/core/               @factory/core  — pure functions over a project path
├── packages/orchestrator/       @factory/orchestrator — bin: factory
├── template/                    the canonical playbook (seeds projects)
└── docs/
```

**Data flow:** `workspace.yaml` → `Project[]` → per project: read files → derive
`Overview | Backlog | Pipeline | Finished | Runs | Flags | Decisions` (pure, in
`@factory/core`) → served as JSON → rendered by the client. chokidar on the project
path → `event: changed` on `/api/events` → client re-fetches the active view.

**Derivation rules** live in BUILD-PLAN §2.1 (stations) and §2.2–2.4 (flags, runs,
decisions). Console task status = feature-plan `Status:` column mapped
Idea/Shaping→waiting, Ready→approved, In progress→started, Shipped/Observing→finished.

## Decisions taken during the run
- D-01 Repo stays `Rodin42/agent-playbook` on GitHub (rename is an operator click); the
  monorepo's name in `package.json` is `agent-pipeline`.
- D-02 Vocabulary: six discovery artifacts `draft | in-review | final | superseded`;
  `implementation.md` unchanged. Written into the templates and `features/README.md`.
- D-03 The mockup's hardcoded `rodin/…` remotes become `Rodin42/…`.
- D-04 Test runner: vitest. Lint: eslint flat config, typescript-eslint recommended —
  kept minimal so `npm run lint` in CI is honest, not decorative.
- D-05 No new status field anywhere; "pr" station reads a `pr:` frontmatter field on
  `implementation.md` (number + state) until M6 wires `gh pr view`.
- (append below as the build proceeds)

## Resume prompt (paste this if context was cleared)

```
Continue the agent-pipeline build. Read, in order: docs/CHANGES.md,
docs/BUILD-PLAN.md, docs/RECONCILE-STATE.md, docs/EXECUTION-PLAN.md. Then run
`git log --oneline -15` and `git status`. Continue from the first step in the
EXECUTION-PLAN tracker that is not ☑, honouring its operating rules: autonomous, no
check-ins, one commit per step pushed immediately, M1+M2 scope, tests for derivation.
Update the tracker and the decisions log on every commit. When S11 is done, stop and
write the operator summary.
```
