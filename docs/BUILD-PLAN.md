# BUILD PLAN — agent-playbook Console (hand-over to Claude Code)

Everything needed to build the console for real. Read together with, in this order:
`docs/CHANGES.md` (decision deltas — read FIRST if reconciling) · `docs/ux-review.md`
(what must exist and why) · `docs/frontend-design.md` (design system) ·
`docs/agent-pipeline-ui.html` (the visual spec — match it) ·
`template/runtime-plan.md` (runtime architecture) · `template/` (the process being
rendered).

## 0 · Scope and non-negotiables

Build a **local operator console** for the agent factory. One binary of truth: **the
git repository.** The console derives everything from files, writes only config and
decision artifacts, and holds no state and no credentials of its own.

Hard rules (violating any of these is a wrong build, however nice it looks):
1. Binds to localhost by default (`127.0.0.1:4571`). `--host` exists only for the optional
   container deployment (Dockerfile) and is never the default. No accounts, no cloud,
   no telemetry.
2. Never reads, displays, transmits, or stores a secret value. `.env` is presence-check
   only (variable set / not set).
3. Merge, deploy, rollback run under the **operator's** own credentials (`gh`, `git`)
   via explicit per-action confirmation. The console never batches or remembers
   approvals.
4. Every console action that changes anything = a git commit with prefix `console:`
   plus a line in the decision log.
5. A page refresh must fully rebuild the UI from the repo. If it can't, state has
   leaked somewhere it shouldn't live.
6. **GitHub is the system of record.** Every `console:` commit is pushed to origin
   right after it lands; flags, run registry JSONs and the decision log are committed
   and pushed (only `runtime/logs/` stays local). If push fails (offline), the console
   shows an "unpushed commits" warning in the top strip and retries — it never
   silently accumulates local-only truth.

## 1 · Stack (decided — do not substitute)

- **One runtime:** Node 22+, TypeScript everywhere. **npm workspaces** monorepo — no
  pnpm, no turborepo, no nx.
- **No database.** All state is committed files in the project repos; views are derived
  on read. The only local-only files are raw logs (`runtime/logs/`). A SQLite *cache*
  is a parked idea, never the truth.
- **Server:** **Hono** (locked). Modules: repo reader (frontmatter
  parser: gray-matter; yaml: js-yaml), file watcher (chokidar) → SSE push, run registry
  reader, action handlers (git via simple-git or execa; `gh` via execa).
- **Client:** the mockup grown up — static TypeScript + vanilla DOM (no framework;
  the mockup already proves the patterns), one CSS file carrying the design tokens
  from `frontend-design.md`. SSE client for live updates. No build step beyond esbuild.
- **Launch:** `factory ui --workspace ~/factory-workspace` (bin in
  `@factory/orchestrator`) → serves on `http://127.0.0.1:4571`, opens the browser.

## 1.5 · Repo layout — monorepo product, workspace of project repos

```
agent-playbook/                  # THE monorepo (github.com/Rodin42/agent-playbook, private)
├── package.json                 # npm workspaces
├── Dockerfile                   # optional: run identically on any container host
├── workspace.yaml.example
├── apps/console/                # @factory/console — server/ (Hono) + client/ + fixtures/
├── packages/core/               # @factory/core — frontmatter reader, status
│                                #   derivation, data contracts as TS types
├── packages/orchestrator/       # @factory/orchestrator — factory CLI:
│                                #   new · run · next · stop · ui · template build
├── template/                    # the canonical playbook (single home; seeds projects)
└── docs/                        # this plan, ux-review, design, mockup, CHANGES
```

Managed codebases are **separate repos** in a workspace folder (default
`~/factory-workspace/`), registered in `workspace.yaml`
(`projects: [{name, path, remote}]`). `factory new <name>` seeds a project from
`template/`; after seeding, the project's config, roles and templates are its own and
may diverge freely — the template seeds, never overwrites (a `factory template
diff/sync` command is parked). The console's project selector reads `workspace.yaml`.

## 2 · Data contracts (the important part)

### 2.1 Task status — derived, not stored separately
Console statuses map onto the existing feature-plan lifecycle. **No new status field
is invented**; the console translates:

| Console | feature-plan `Status:` | Signal |
| --- | --- | --- |
| waiting | Idea, Shaping | entry exists; may carry open PO questions |
| approved | Ready | operator marked Ready; queued by rank |
| started | In progress | feature folder exists with work begun |
| finished | Shipped, Observing | PR merged |

Station lighting on the pipeline board derives from artifact frontmatter in
`features/<slug>/`. **Artifact status vocabulary — unified 2026-09-06** (the templates
previously declared four different sets, three of them undeclared): the six discovery
artifacts `brainstorming`, `online-research`, `edge-case-analysis`,
`architecture-analysis`, `masterplan`, `implementation-plan` carry
`status: draft | in-review | final | superseded` (`final` = accepted; the consuming
role may read it). `implementation.md` keeps its richer lifecycle
`in-progress | in-review | qa | merged`. Gates' verdict lines in `implementation.md`
light the review/QA stations; PR + merge state comes from `gh pr view --json`.

| Station | Source | pending | running / waits | done | exception |
| --- | --- | --- | --- | --- | --- |
| shaping | brainstorming, online-research, edge-case-analysis, architecture-analysis | any draft or missing | any in-review | all final | superseded w/o successor |
| masterplan | masterplan | draft / missing | in-review | final | — |
| plan | implementation-plan | draft / missing | in-review | final | superseded |
| build | implementation | missing | in-progress | in-review or later | latest run `failed` |
| review | implementation + gate verdict | — | in-review | verdict pass | verdict fail (routed) |
| qa | implementation + gate verdict | — | qa | verdict pass | verdict fail |
| pr | `gh pr view` (M6) / `pr:` frontmatter | no PR | open | merged | closed unmerged |

A feature's *stage* is the last station that is `done`; its *state* is the first station
that is `running` or `exception`. A missing artifact is `pending`, never an error.

### 2.2 Escalation flags — `runtime/flags/<id>.md`
Written by orchestrator/twin, resolved by the console. Format:

```markdown
---
id: flag-2026-09-05-0007          # unique, sortable
type: sign-off | red-line | triage | rollback | system
step: 1 | 2 | 3
feature: F-006                    # optional for system flags
title: "New dependency — nodemailer"
created: 2026-09-05T09:12:00Z
status: open | resolved
recommendation: approve           # the twin's pick, key into options
---
## Question
...
## Options
- **approve** — ...
- **reject** — ...
## Blocked until answered
- F-006 build cannot start
```

Resolution: console appends a `## Decision` section (choice, by `operator`, timestamp,
optional note), flips `status: resolved`, commits `console: resolve flag-… (approve)`,
and executes the mapped action (see 3.4). Badge counts = open flags per step.

### 2.3 Run registry — `runtime/runs/<runid>.json` + `runtime/logs/<runid>.log`
Written by the orchestrator (one JSON per run, append-only log):

```json
{ "id": "run-2026-09-05-014", "feature": "F-005", "role": "implementer",
  "step": 2, "harness": "claude-code", "model": "sonnet",
  "sandbox": "e2b-3f2a", "started": "…", "ended": null,
  "status": "running | ok | failed | stopped | escalated",
  "cost_usd": 0.61, "tokens": {"in": 41200, "out": 9800} }
```

Cost/model-mix aggregations, the live log view (tail + SSE), and the stop action
(orchestrator kills sandbox, sets `stopped`) all hang off this.

**Success is never the exit code.** Verified 2026-09-06: `claude -p` exits **0** on
authentication failure (it prints `Not logged in`). The orchestrator sets `ok` only when
the role's declared `writes:` artifact exists, parses (valid frontmatter) and its
`status:` advanced; otherwise `failed`, with the log tail as `reason`. The console
renders that field and never re-derives success from a process code.

### 2.4 Decision log — `runtime/decisions.log` (JSONL)
One line per decision, **both actors**: `{at, actor: "operator"|"rodin-twin", action,
subject, rule?}`. The twin's writer is the orchestrator; the console writes operator
lines. The Runs & audit view renders this filtered per step (ux-review A6).

### 2.5 Console-owned config additions — `factory.config.yaml`
```yaml
console:
  run_mode: manual | auto        # A1 — default manual
  paused: false                  # A3
  max_concurrent_sandboxes: 2    # A7
  budget_monthly_usd: 100        # A8 — amber at 80%, system flag + auto-pause at 100%
  notify:                        # A2
    kind: webhook | none
    url: ""
```

### 2.6 Orchestrator interface (assumed CLI; stub until Phase B/C lands)
`factory next` (start top approved) · `factory run <role> <feature>` ·
`factory stop <runid>` · `factory template build`. The console shells these; it never
reimplements orchestration.

**M1 note:** `factory ui` is real in M1. `factory new` is implemented in M1 as its last
step (copy `template/` → workspace project folder, `git init` + first commit, register in
`workspace.yaml`, print the next step) so the acceptance test has a real project to
point at. `run`, `next`, `stop`, `template build` print `not implemented until Phase
B/C` and exit 2.

## 3 · Milestones — build in this order, each independently shippable

**M1 · Read-only console (the foundation).**
Server + repo reader + SSE, **multi-project from day one**: load `workspace.yaml`, the
project selector is real, all derivation is per selected project. Views: overview (pre-work ticks from real files, A12 empty
states), backlog (derived statuses), pipeline board (derived stations), finished list,
runs list + log tail, escalation queues (rendering open flags), decision log. No
actions except navigation. *Accept when:* point it at the real repo; every view is
truthful; `rm -rf` of the server dir loses nothing. M1 renders the fixture project
(`apps/console/fixtures/`, registered in a fixture `workspace.yaml`) first, then a real
project seeded by `factory new`. The overview's pre-work ticks include
`project-brief.md` (now in `reads:` of the strategist and the twin).

**M2 · Feature drawer (A5) + quality-of-life.**
Click-through from board and backlog: artifact trail with ticks, task list, questions,
costs, branch/PR links, runs both-ways linking. Relative times, hover paths, keyboard
`g1/g2/g3` + `enter`-on-recommended, tooltips on stations, mobile layout for
escalation views + modals.

**M3 · Safe writes.**
Task editing (waiting/approved only; commits to feature-plan.md), approve (= Ready),
file editor (tree, guarded saves, `.env` locked, commit per save, frontmatter/yaml
validation), config editor incl. the 2.5 block with auth-conflict guard. Everything
through the confirm-modal pattern from the mockup; every write → decision log.

**M4 · Flag resolution + notify.**
Resolve escalations end-to-end per 2.2 incl. rollback case type (A9) and system flags
with retry (A4). Webhook notify on new flags (A2).

**M5 · Run control.**
Run mode + pause + slots in the top strip (A1/A3/A7), start-next / start-this, stop
run, budget guard (A8), template build action (A11). Requires orchestrator CLI;
develop against a stub that fakes 2.3 files, then swap.

**M6 · Merge.**
The crown jewel, last on purpose: merge case shows diffstat + changed files from
`gh pr view`, confirm modal, `gh pr merge` under operator auth, finished-list move,
decision log. *Accept when:* one real feature travels backlog → finished entirely
through the console.

## 4 · Testing bar

- Unit: status derivation (2.1) and flag parsing (2.2) — table-driven, these are the
  brain.
- Integration: a fixture project at `apps/console/fixtures/demo-project/` (copy of the
  playbook + 3 synthetic features in varied states + flags + runs + a decision log)
  that M1 must render pixel-plausibly; CI runs the derivation suite on it. Its
  `feature-plan.md` entry F-007 is the real 2026-09-05 factory-test output
  (`fixtures/playbook-baseline/test-entry.md`), so one entry is model-authored.
- Manual gate per milestone: the operator walks the affected journey on the fixture
  before the milestone is called done.

## 5 · Out of scope for v1 (parked deliberately)

PO-facing intake page (A10) · quick-jump palette (`/`) · multi-operator auth ·
remote access · historical cost analytics beyond 30 days · dark/light toggle (dark
only, per design) · editing started tasks (never, by design).

## 6 · Prompting Claude Code

**Reconciled 2026-09-06.** `docs/RECONCILE-STATE.md` holds the state and every
conflict with its resolution; `docs/EXECUTION-PLAN.md` holds the build sequence, the
progress tracker and the resume prompt. For any later fresh start: read CHANGES.md →
this plan → EXECUTION-PLAN.md → continue from the first unchecked step, stop at the
milestone gate it names.
