# RECONCILE-STATE — current state and migration plan

Written 2026-09-06 per `docs/CHANGES.md` reconciliation procedure, steps 1–3.
**Status: APPROVED 2026-09-06 by the operator — executing autonomously, no check-ins.**
Operator's answers: private repo under `Rodin42` only, no Wiersholm; keep all prior
work; update the build plan; build everything in one go. Resolutions taken for the
open questions: Q1 unified vocabulary (BUILD-PLAN §2.1) · Q3 keep
`Rodin42/agent-playbook` as the remote (renaming it to `agent-pipeline` on GitHub is a
one-click operator to-do; `gh` on this Mac is the work account) · Q4 the mockup is the
spec · Q9 `Rodin42` · Q10 `factory-test/` seeds the fixture · Q11/Q13 fixture first,
`factory new` last in M1. Execution record: `docs/EXECUTION-PLAN.md`.

---

## 0 · Read this first — the premise correction

`CHANGES.md` and `BUILD-PLAN.md §6` assume Claude Code "started building from an earlier
BUILD-PLAN" and that "existing console code moves into this shape."

**No console code exists.** There was never an earlier BUILD-PLAN in this session. No
Express server, no storage layer, no `runtime/ui/`, no client. The earlier prompt was
the *runtime test plan* (harness smoke test, installs, one headless role run), not a
console build.

Consequence: D2 (Express→Hono), D3 (storage removal) and the code half of D7 (path
fixes) are **not applicable** — there is nothing to port. The migration is
**placement of docs, fixtures and verified facts into the monorepo shape**, plus a set
of real conflicts between the handover and what was verified yesterday. That makes the
plan smaller than CHANGES.md fears, and the conflicts list (§3) more important than the
migration itself.

---

## 1 · Current state

### 1.1 Inventory — what exists on disk and on GitHub

| Thing | Where | State |
| --- | --- | --- |
| `Rodin42/agent-playbook` | GitHub, private | 2 commits: `748a7f2` initial (47 files, single clean root), `9e46473` docs. Pushed; local `main` in sync. Local identity pinned to `rodin.lie@gmail.com`. History from the work repo deliberately purged (repo deleted + recreated empty; reflog scrubbed). |
| Working tree | `~/Documents/code/privat/agent-playbook` | = the "fixed" playbook + corrections below. Clean except two **untracked** inputs: `agent-pipeline_version_2/` (byte-identical to `agent-pipeline-handover.zip`) and `front-end/` (superseded drafts). |
| Corrections already made to the playbook | committed in `748a7f2`/`9e46473` | `runtime-plan.md` — 8 lines fixed (it described **pi** as template default in 7 places, contradicting `runtime/factory.defaults.yaml` = `claude-code`; run-shape step 4 made harness-agnostic). `.gitignore` +`factory-test/` +`.DS_Store`. |
| `doc/SESSION-2026-09-05.md` | committed | session snapshot: everything verified, open items, next steps |
| `doc/frontend-and-tooling-research.md` | committed | Langflow-alternatives research; conclusion: don't adopt a canvas tool; Agent View for local runs; Langfuse (one shared instance) for sandboxed runs later; generate the agent graph from frontmatter |
| `factory-test/` | local only, gitignored, own git repo (2 commits) | playbook baseline + `test-entry.md` (product-strategist output, 13/13 fields) + `test-prompt.txt` (reproducible prompt) |
| Stale files in the working tree (from the in-place unzip over the old repo) | `phase-2-implementation/masterplan.md`, `phase-3-housekeeping/online-research.md` | Both are leftovers: `masterplan` duplicates the id of `features/_template/masterplan.md` (CONTEXT.md decision 1: masterplan is per-feature); `online-research` duplicates the role renamed to `ecosystem-watch` (decision 4). The handover template correctly omits both. |
| Toolchain | this Mac | claude 2.1.261 · pi 0.85.1 (no auth, no extensions) · e2b 2.18.0 · node 26.8.1 (brew; shadows the .pkg 24.18.0) · docker 29.7.2 · gh 2.97.0 (logged in as the **work** account `roli_Wiers` only) |
| Secrets | password manager only | `CLAUDE_CODE_OAUTH_TOKEN` ✓ · `E2B_API_KEY` ✓ · `GITHUB_TOKEN` (new in handover `.env.example`) **not yet created**. No `.env` file exists anywhere. |
| SSH identities | `~/.ssh/config` | `github.com` → **Rodin42** (personal) · `github-wiersholm` → roli_Wiers (work) · `github-jbr` → jbr-rl |

### 1.2 Verified facts the plan depends on

| Fact | Evidence | Why it matters |
| --- | --- | --- |
| `claude -p --model haiku` works headless on the host | `FACTORY-OK` | harness works |
| **`claude -p` inside a clean `node:22` container authenticated ONLY by `CLAUDE_CODE_OAUTH_TOKEN` works** | `SANDBOX-OK`; control run without the token → `Not logged in · Please run /login` | the claude-code-in-e2b design is proven; Phase B is unblocked |
| **`claude -p` exits 0 on auth failure** | control run exit code 0 with "Not logged in" | run registry `status: failed` (BUILD-PLAN §2.3) cannot come from exit status; must derive from output/artifact |
| Prompt assembly (role doc + entry format + instruction) produces a usable artifact | 13/13 required fields, scope reframed solution→problem | the orchestrator's step 3 works as designed |
| Agent View (`claude agents`) exists in 2.1.261 | ran locally | free local session monitor; does NOT see sandbox runs |
| The seven Phase-2 artifact templates carry **four different `status:` vocabularies, three undeclared** | read the frontmatter | **BUILD-PLAN §2.1 is built on a false premise** — see C3 |

### 1.3 What derives from where — and test status

Nothing derives from anything yet: **there is no code.** Test status: **no tests exist.**
The only executed check is the manual factory run in `factory-test/`. The BUILD-PLAN §4
fixture repo ("playbook + 3 synthetic features in varied states") does not exist;
`factory-test/` is a plausible seed for it (one synthetic feature entry already).

---

## 2 · Migration plan

### 2.1 Placement — source → monorepo destination

| Source (today) | Destination (monorepo) | Action |
| --- | --- | --- |
| `agent-pipeline_version_2/` (= handover zip) | **monorepo root** | becomes the root. It already has the D1 root files (`README`, `Dockerfile`, `.gitignore`, `workspace.yaml.example`, `docs/`, `template/`). |
| `agent-pipeline_version_2/template/.git/` | — | **DELETE before the first commit.** It is a full clone pointing at `git@github-wiersholm:wiersh/agent-playbook.git` with Henrik's four commits — the exact history purged yesterday. Left in place, git would record `template/` as an embedded repo (gitlink) and the work remote comes back. |
| handover `template/` | `template/` | base. Keep every Desktop-side improvement: `project-brief.md` + its wiring into `reads:` of `product-strategist` and `rodin-twin`; `.github/` (CI + PR template); `.env.example` + `GITHUB_TOKEN`; `factory.defaults.yaml` `git_author`/`commit_trailer`/`push_after_commit`; `CONTEXT.md` items 7–9; `start_prompt.md` Stage 1 note, Stage 5 step 0, Stage 8 items 3–6; run-shape step 5 push-to-origin. |
| my `runtime-plan.md` fixes | `template/runtime-plan.md` | **re-apply** — the handover was built from the old zip and regresses all 8 lines (C1). Merge: my harness-agnostic step 4 + Desktop's push-after-commit step 5. |
| `doc/SESSION-2026-09-05.md` | `docs/SESSION-2026-09-05.md` | move |
| `doc/frontend-and-tooling-research.md` | `docs/frontend-and-tooling-research.md` | move |
| `doc/RECONCILE-STATE.md` (copy) | `docs/RECONCILE-STATE.md` (this file) | canonical here; the `doc/` copy is deleted when the old repo is retired |
| `factory-test/` | `apps/console/fixtures/playbook-baseline/` (strip its `.git`; keep `test-entry.md` + `test-prompt.txt`) | **proposed** — seed of the §4 fixture repo. Alternative: discard. Operator's call (Q10). |
| `front-end/` | — | **delete.** `design_2/frontend-design.md` is byte-identical to the handover; `design_2/` mockup and `files/` ("Kontrollrom" v1, light palette) are older; it also holds two copies of the retired `agent-playbook-fixed.zip`. Nothing to migrate. |
| stale `phase-2-implementation/masterplan.md`, `phase-3-housekeeping/online-research.md` | — | drop (handover already omits; duplicate ids) |
| `.gitignore` root | root `.gitignore` | add `.DS_Store` (handover root has node_modules/dist/*.log/.env only) |
| `Rodin42/agent-playbook` (GitHub) | `Rodin42/agent-pipeline` | **decision needed** (Q3): rename in place (keeps `748a7f2`/`9e46473`, GitHub redirects the old URL) **or** new empty repo + archive/delete the old one. Recommendation: **rename** — it's already clean, private, and correctly authored. |
| **to create** (M1 work, after approval) | `package.json` (workspaces) · `apps/console/{server,client,fixtures}` · `packages/core` · `packages/orchestrator` (CLI skeleton: `ui` only in M1; `new/run/next/stop/template build` stubbed) | build |

### 2.2 D1 monorepo layout → covered by 2.1. No existing code to move.
### 2.3 D2 Hono → **N/A.** No Express exists. Start on Hono.
### 2.4 D3 no-DB → **N/A.** Nothing built; `factory-test/` has no storage. Confirmed: derive on read.
### 2.5 D4 multi-project M1 → **no code conflict; one doc conflict (C4).** It is *consistent* with yesterday's research conclusion ("per-repo carries content; per-machine carries code" — the console is per-machine and multi-project; the playbook is per-project via `factory new`). Note the chicken-and-egg in Q13.
### 2.6 D5 `factory new` → the retired zip still exists in two copies under `front-end/`; deleted with it. `factory new` is orchestrator work; M1 needs it (or the fixture) to have a project to render (Q13).
### 2.7 D6 GitHub system of record → applies from the first monorepo commit. `GITHUB_TOKEN` is a **new secret** the operator must create (fine-grained PAT, per-project repo, contents r/w + PRs write, no admin) — needed for sandbox pushes (Phase B/C), **not for the M1 read-only console**. `gh` on this Mac is logged in as the work account only; monorepo pushes go over SSH as Rodin42, which already works.
### 2.8 D7 path fixes → no code references anywhere. Doc-level only: `workspace.yaml.example` uses GitHub user `rodin` (accounts are `Rodin42` and `jbr-rl`) — Q9.
### 2.9 D8 constants → port 4571 / localhost accepted. Dockerfile passes `--host 0.0.0.0` (C6).

### 2.10 Execution sequence (after approval; each step = one commit, pushed immediately per D6)

1. `rm -rf agent-pipeline_version_2/template/.git` · delete `front-end/` · delete the two stale phase files · move `doc/*.md` → `agent-pipeline_version_2/docs/`.
2. Re-apply the 8 `runtime-plan.md` corrections onto `template/runtime-plan.md`, merged with the push-after-commit step 5.
3. Resolve the doc conflicts approved from §3/§4 (status vocabulary C3 first, then C4, C5, C6, C10).
4. Restructure: the current repo root becomes the monorepo root = contents of `agent-pipeline_version_2/`; the old top-level playbook files are gone (they live in `template/` now). Rename the GitHub repo (or create new, per Q3); set `origin`.
5. First monorepo commit: `factory: monorepo skeleton (template, docs, fixtures)`. Push.
6. Add `package.json` workspaces + package skeletons. `console: M1 scaffold`. Push.
7. Build M1 per BUILD-PLAN §3 (read-only, multi-project). Stop at the M1 gate.

---

## 3 · Conflicts — the new plan vs. what exists or was verified

| # | Conflict | Evidence | Proposed resolution |
| --- | --- | --- | --- |
| **C1** | Handover `template/runtime-plan.md` **regresses** yesterday's fixes: says `pi` is the template default in 7 places + hardcodes `pi -p` in run-shape step 4, while `factory.defaults.yaml` in the *same handover* ships `harness.provider: claude-code`. | `diff` handover vs committed | re-apply the 8 fixes; keep Desktop's step-5 push addition |
| **C2** | `template/.git/` is an embedded clone of the **work** repo (`wiersh/agent-playbook`, Henrik's commits). | `template/.git/config` | delete before first commit; never commit |
| **C3** | **BUILD-PLAN §2.1 states "each of the seven artifacts carries `status:` (draft/ready/done per its template)".** Actual: `brainstorming` draft/reviewed/final · `implementation-plan` draft/ready/superseded · `implementation` in-progress/in-review/qa/merged · `masterplan` draft/ready · `architecture-analysis`, `edge-case-analysis`, `online-research` **declare no vocabulary**. No template contains "done". The status derivation is M1's unit-tested "brain" (§4) and **cannot be specified against this**. | frontmatter of `features/_template/*.md` | **unify the vocabulary in the templates before writing `packages/core`** — either one shared enum with a documented mapping to console stations, or explicit per-artifact enums each mapped. This is a playbook decision (it changes the role contracts), so it needs the operator. |
| **C4** | `template/CONTEXT.md` line 9: "Single project, single substrate — **no multi-project handling**" vs. item 8: "generic **multi-project** operator console" (D4). | grep | reword line 9: the *playbook/project* is single-substrate; the *console* manages many projects |
| **C5** | `docs/frontend-design.md` header says dark / JetBrains Mono / e2b orange `#FF8800`; its **"Design tokens" section says light "Workshop palette" `#F6F7F5` / Archivo / amber `#C77D0A`** — a v1 paragraph under a v2 header. BUILD-PLAN §5 says dark only; the mockup **is** dark (`--bg:#0D0D0C`, JetBrains Mono, `--org:#FF8800`, `--grn:#4EC97B`, `--red:#FF5449`, `--vio:#B29EFF`, `--blu:#6CB0FF`, `--ink:#E9E9E4`, `--dim`, `--faint`, `--line`, `--panel`, `--panel2` + `*-bg` tints). | mockup CSS vars | rewrite the tokens section from the mockup's actual custom properties; the mockup is the spec ("match it") |
| **C6** | BUILD-PLAN §0 rule 1: "Binds to **localhost only**" vs. `Dockerfile` CMD `--host 0.0.0.0`. | Dockerfile | reword rule 1: localhost by default; `--host` exists only for container use and is never the default — or drop `--host` and document Docker networking separately |
| **C7** | CHANGES/BUILD-PLAN assume existing console code (Express, `runtime/ui/`). | this session | none exists; D2/D3/D7-code are N/A (§0) |
| **C8** | D1 names the repo `agent-pipeline`; `Rodin42/agent-playbook` already exists with the playbook; the Desktop prompt says "do not create the GitHub repo". | GitHub | Q3 — rename vs. new |
| **C9** | `workspace.yaml.example` / mockup use GitHub user **`rodin`** (`git@github.com:rodin/jbr-factory.git`). Real accounts: `Rodin42`, `jbr-rl`. | ssh -T | Q9 — which account owns `jbr-factory` |
| **C10** | BUILD-PLAN §2.3 run registry `status: failed` and §2.6 `factory run` — **`claude -p` exits 0 on failure**. | verified | add to §2.3/§2.6: success = expected artifact written + parseable; never exit status |
| **C11** | BUILD-PLAN §2.6 puts `factory ui` in `@factory/orchestrator`, but the orchestrator is Phase B/C and M1 is read-only. | BUILD-PLAN | M1 ships the CLI skeleton with `ui` real and the rest stubbed (BUILD-PLAN already allows stubs) — confirm |
| **C12** | M1 acceptance: "point it at the real repo". **No project repo exists** (no `jbr-factory`); `factory new` (D5) is orchestrator work. | inventory | Q13 — M1 renders the fixture, and/or `factory new` is pulled into M1 minimal |

---

## 4 · Things to sort out before building the console (ordered by what blocks what)

**Blocks writing `packages/core` (the M1 brain):**
1. **Status vocabulary (C3).** Decide the enum(s) and edit the seven templates. Nothing in §2.1 can be coded until this exists. Recommendation: one shared artifact enum `draft → in-review → final` (+ `superseded`) for the six discovery artifacts, keep `implementation.md`'s richer lifecycle, and write the station mapping table into BUILD-PLAN §2.1.

**Blocks the first commit / push:**
2. **Delete `template/.git/` (C2).** Non-negotiable.
3. **Repo decision (C8/Q3):** rename `Rodin42/agent-playbook` → `agent-pipeline`, or new repo. Recommendation: rename.

**Blocks the design system / the one CSS file:**
4. **Design tokens (C5):** confirm dark + the mockup's custom properties are the spec; rewrite the tokens section.

**Doc consistency — quick, but wrong docs get built from:**
5. Re-apply the `runtime-plan.md` corrections (C1).
6. Reword CONTEXT.md line 9 (C4).
7. Dockerfile vs localhost rule (C6).
8. Exit-code rule into BUILD-PLAN §2.3/§2.6 (C10).

**Scope questions for M1:**
9. **`workspace.yaml.example` remote user (C9):** which GitHub account owns `jbr-factory` — `Rodin42` or `jbr-rl`? (The `github-jbr` SSH alias exists.)
10. **Fixture:** does `factory-test/` become `apps/console/fixtures/playbook-baseline/` (recommended), and how do the "3 synthetic features in varied states" (§4) get authored — by hand, or by running the strategist three times?
11. **`factory ui` in M1 (C11):** confirm the CLI skeleton ships with `ui` only.
12. **`project-brief.md`** is now in `reads:` of strategist + twin → the overview's pre-work ticks (A12) must include it. Confirm it's a required pre-work item.
13. **What does M1 render (C12)?** With no project repo, M1 needs either the fixture registered in `workspace.yaml`, or a minimal `factory new` pulled forward. Recommendation: fixture first; `factory new` is M1's last step so the acceptance test ("point it at the real repo") can actually run.

**Secrets / access (not blocking M1, blocking Phase B/C):**
14. Create `GITHUB_TOKEN` (fine-grained PAT) when the first *project* repo exists — not before.
15. `gh` is logged in as the work account only. Monorepo pushes use SSH as Rodin42 (works). Any `gh`-driven action in the console (merge, `pr view`) will need `gh auth login` for Rodin42 — M6 concern, note it now.

**Parked, explicitly (from yesterday's research — not for M1):**
- Langfuse for sandboxed-run status (one shared instance, later).
- Generating the agent graph from frontmatter + `handoff_to` validation — belongs in `packages/core` naturally; propose it as a `factory template check` command later.
- `.claude/` native subagent layer — the trade-off (ecosystem vs. losing `authority`/`reads`/`writes`/`handoff_to`) still stands; unchanged by the handover.

---

## 5 · What I will NOT do until approved

Move or delete any file · touch `template/.git/` · rename or create any GitHub repo ·
create `package.json` or any package · edit any template. This document and its
committed copy under the old repo's `doc/` are the only writes made.
