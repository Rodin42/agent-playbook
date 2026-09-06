# start_prompt.md — Factory Setup

> **What this is:** the first prompt executed when installing the agent factory into a
> repository — new or existing. Give this file to Claude (Claude Code or a capable agent
> session) together with the playbook folder/zip. Executing it end-to-end leaves a repo
> where the pipeline can run its first feature.
>
> **Who runs it:** the operator (Rodin) starts the session and stays available — setup
> includes an interview and several confirmations. Expect 30–60 minutes.

---

## The prompt

You are setting up the **agent factory** — a three-phase, artifact-driven development
pipeline — in this repository. Work through the stages below **in order**. Follow these
ground rules for the whole session:

- **Never invent facts.** Stack versions, commands, entities, and conventions come from
  the codebase or from the operator — not from plausibility. Anything unknown becomes an
  explicit open question at the end, never a guess.
- **Verify by running.** A command is only written into the substrate after you have
  executed it and seen healthy output.
- **Ask before anything destructive or irreversible** (overwrites, deletions, pushes,
  config changes). Never push to main; never touch production anything.
- **Work transparently.** Announce each stage as you enter it; end with the report in
  Stage 9.

### Stage 0 · Preconditions

1. Confirm you have: (a) this repository checked out on a fresh branch
   `factory-setup`, (b) the playbook folder or zip, (c) the operator present.
2. Detect whether this is a **new/empty** codebase or an **existing** one — it changes
   Stage 3.
3. Confirm git works and the working tree is clean. If not, stop and report.

### Stage 1 · Install the playbook

> If this project was seeded with `factory new <name>` from the agent-playbook
> monorepo, Stage 1 is already done — verify the files listed below are present and
> committed, then continue at Stage 2.

1. Copy the playbook into the repo root: `README.md` (as `playbook/README.md` if the
   repo already has a README — ask the operator), `phase-1-product-development/`,
   `phase-2-implementation/`, `phase-3-housekeeping/`, `CONTEXT.md`, and the runtime
   layer: `runtime/` (with `factory.defaults.yaml`), `factory.config.yaml`,
   `.env.example`, `.gitignore` (merge with an existing one — the `.env` and
   `runtime/logs/` lines are mandatory), `runtime-plan.md`, `start_prompt.md`, and the docs: `process-flow-a3.svg`,
   `agent-factory-tutorial.pdf`.
2. Do **not** modify playbook role docs during setup. Setup fills the *content* files
   (substrate, architecture, feature-plan, twin); the process files stay as shipped.
3. Commit: `factory: install playbook`.

### Stage 2 · The twin

1. Open `phase-1-product-development/agents/rodin-twin.md`.
2. If it is already filled (no `<...>` placeholders): read it back to the operator in
   five bullets — priorities, red lines, delegations, escalation format, autonomy
   ceiling — and ask them to confirm it is current. Bump the `Last updated` date on
   confirmation.
3. If it is a template: interview the operator section by section (priorities ranked;
   decision style; red lines; push-backs; free delegations; escalation triggers and
   format; what sign-off means; how far features run unattended). Write it in first
   person, read it back, correct, then commit.
4. Rule to state out loud: *the twin is self-authored — after today, only the operator
   edits this file.*

### Stage 3 · The substrate (`phase-1-product-development/substrate.md`)

**Existing codebase — extract, then verify:**
1. Read manifests and configs (`package.json` / `pyproject.toml` / `go.mod` / lockfiles,
   Dockerfiles, docker-compose, CI configs, `.env.example`, infra-as-code) and the
   folder tree (2 levels).
2. Fill: **Stack** (pinned major versions from lockfiles), **Repo layout** (what belongs
   where), **Shared services** (auth, db, queue, storage, external APIs + how each is
   reached), **Data model spine** (core entities from the schema/models — list, don't
   redesign), **Conventions** (naming, error handling, logging, test placement — infer
   from the code, confirm with the operator).
3. **Commands** — the critical section. For each of install / build / lint / typecheck /
   test / run locally: find the command, **run it**, record it with a one-line "healthy
   output looks like". If one is missing or broken, record it as missing and add a
   proposed fix to the open questions — do not fake it. State clearly: the full local
   check = lint + typecheck + test + build, all green.
4. **Red lines**: start from the four in the twin (no new dependency without ADR; no
   PII/secrets in logs or code; no merge with red CI; agents never touch prod data),
   ask the operator for project-specific additions (compliance, rate limits, forbidden
   areas).
5. **Environments**: what exists (local/staging/prod) and what agents may touch in each.

**New codebase — decide, then scaffold:**
1. Interview the operator for the stack; propose defaults where they have no opinion.
2. Scaffold the minimal skeleton so the Commands section is *true*: init the project,
   add lint/typecheck/test/build tooling, one passing placeholder test. Run everything.
3. Fill the same substrate sections from what was actually created.

Commit: `factory: substrate filled and verified`.

### Stage 4 · Architecture (`phase-1-product-development/architecture.md`)

1. Existing code: draw the component map as it **is** (components, one-line
   responsibility each, who calls whom, where the important data flows). Flag drift or
   surprises as findings — do not fix them now.
2. New code: sketch the intended shape with the operator — 3–6 components maximum.
3. Note the **observability contract**: which logs/metrics exist today (Phase 3 needs
   something to watch; "none yet" is a valid, recorded answer and an early candidate
   entry for the plan).
4. Record decisions already embodied in the code as backdated ADRs only if the operator
   wants them; otherwise start the ADR log at 0001 with "adopt the agent factory".
5. Commit: `factory: architecture baseline`.

### Stage 5 · The project brief and the feature plan

0. Fill `phase-1-product-development/project-brief.md` with the operator (or the PO if
   present): why the product exists, who for, what "good" means, product-level
   non-goals, standing constraints. Plain words, under a page — the strategists and the
   twin read it before every pass.

1. Keep the shipped entry format (including PO owner, Scope in/out, Depends on, Shared
   work needed, Answered in advance, Open questions → PO).
2. Add a short "How to add a feature" note at the top addressed to the product owners,
   in plain language: state the problem and the user, not the solution; fill Answered
   in advance while you're here; expect questions to come back through your entry.
3. Ask the operator: seed the plan now? If yes, capture 1–3 entries (the operator can
   answer as PO). Mark none Ready yet.
4. Commit: `factory: feature plan opened`.

### Stage 5b · Runtime configuration

1. Fill `factory.config.yaml` from what Stages 3–4 established: project name, git
   remote, main branch. Do not duplicate defaults — only override what differs.
2. Copy `.env.example` to `.env`. Ask the operator to run `claude setup-token` on their
   own machine (browser flow) and paste the token into `CLAUDE_CODE_OAUTH_TOKEN`; ask
   them to add `E2B_API_KEY` from the e2b dashboard. Never echo these values back.
3. Verify `.env` is gitignored (`git check-ignore .env` must succeed) BEFORE the
   operator fills it.
4. Smoke-test the harness with the default (cheapest) model:
   `claude -p --model haiku "Reply with exactly: FACTORY-OK"` — record the result.
5. Commit `factory.config.yaml` (never `.env`): `factory: runtime configured`.

### Stage 6 · Integrity check

Run the playbook QA and fix what it finds:
1. Every file's frontmatter parses; `id` matches filename (folder-qualified for nested
   roles); ids unique across the repo.
2. Every `reads` / `writes` / `handoff_to` / `consumed_by` target exists.
3. Every relative markdown link resolves.
4. `features/_template/` contains all seven artifacts: brainstorming, online-research,
   edge-case-analysis, architecture-analysis, masterplan, implementation-plan,
   implementation.
5. No stale references (grep for old twin names, `project-manager`, duplicate ids).
Report findings + fixes; commit `factory: integrity check clean`.

### Stage 7 · Agent wiring (light, optional — ask the operator)

If the operator wants the executable layer now (they may prefer to run manually first):
1. Create `CLAUDE.md` at repo root: point to `substrate.md` (especially Commands and
   red lines), the playbook README, and state the two hard rules — *artifacts are the
   only channel between roles* and *no push to main, no merge, no deploy without the
   operator*.
2. Nothing more in setup. Subagents, slash commands, and hooks come later, after the
   first manual feature — record this as a parked item.

### Stage 8 · Repository guardrails

1. Ask the operator to enable (or confirm) branch protection on main: PR required,
   green CI required, no force-push. You cannot do this for them — provide the exact
   settings and wait for confirmation.
2. Confirm CI runs the full local check. If there is no CI, record it as an open
   question with a proposed minimal pipeline.
3. Confirm `.gitignore` / secret scanning basics; verify no secrets are currently
   committed (report, don't fix silently). Ask the operator to enable GitHub **secret
   scanning + push protection** on the repo.
4. Verify `.github/workflows/factory-ci.yml` is installed and its steps mirror
   `substrate.md` §6 Commands — update the workflow if the substrate uses different
   commands. Branch protection must require this job.
5. Sandbox push auth: ask the operator to create a fine-grained PAT (this repo only;
   contents read/write + pull-requests write; no admin) and put it in `.env` as
   `GITHUB_TOKEN`. State the rule out loud: *sandboxes push feature branches and open
   PRs; only the operator's own auth merges.*
6. Commit-convention check: pipeline commits carry the actor — `factory:` (orchestrator
   /roles), `console:` (console actions), plus a `Factory-Role:` trailer on agent
   commits — and **every commit is pushed promptly; GitHub is the durable trail**.

### Stage 9 · Handover report

End the session with one report, and nothing started beyond it:
1. **What is in place** — a checklist of stages 1–8 with commit hashes.
2. **Open questions** — every unknown, missing command, and unconfirmed convention,
   each with a proposed answer for the operator to accept or correct.
3. **Findings** — anything surprising in the codebase worth a feature-plan entry
   (drift, missing observability, broken commands).
4. **The first-feature checklist** — the operator's next actions: mark one small entry
   Ready · copy `features/_template/` → `features/<slug>/` · run discovery → masterplan
   → implementation-plan → build → gates → PR. Recommend the smallest boring feature
   available: feature #1 tests the factory, not the product.

Do not proceed past this report. The factory is set up; building starts as its own
session.
