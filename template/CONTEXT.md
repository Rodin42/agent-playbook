# CONTEXT — agent-playbook maintenance session

Load this file (plus a zip of the current playbook) at the start of a session when a
problem found during building must be fixed. It replaces re-explaining everything.

## What this is
My private playbook for building software with AI agents: a 3-phase pipeline
(1 product-development → 2 implementation → 3 housekeeping), duplicated into every
project repo. Each project is single-substrate; the console (item 8) manages many project repos. Roles are
markdown docs with YAML frontmatter (`id`, `kind`, `phase`, `authority`, `reads`,
`writes`, `handoff_to`); ids are machine-navigable and unique; artifacts are the only
channel between agents.

## Operating model
- **Product owners** contribute only at intake: they add `feature-plan.md` entries and
  fill **Answered in advance**. Questions to a PO travel async via the entry's
  **Open questions → PO** queue. An unanswered question parks the entry.
- After intake I (**Rodin Lie**) run everything solo with the agents.
- **One human twin: `rodin-twin`** (phase-1/agents/). Self-authored mandate; advises,
  signs off within mandate, escalates the rest. It authors each feature's masterplan.
- Human decision points: mark **Ready**, sign off **PR/merge**, approve **ADRs**,
  waive QA criteria, execute rollback. Agents never cross irreversible lines alone.

## Key decisions already made (don't relitigate)
1. **Masterplan is per-feature** (`features/_template/masterplan.md`), authored by
   rodin-twin after the four discovery docs. Cross-feature order + shared work live in
   `feature-plan.md` fields **Depends on** / **Shared work needed**.
2. **Fail routing (both gates + templates):** code wrong → `implementer` · plan wrong →
   `senior-developer` · untestable criterion → `test-strategist`. The gate states which,
   per finding.
3. **Feature workspace ritual:** copy `features/_template/` → `features/<slug>/`, set
   `plan_ref`/slug in every file. The 7 template artifacts (brainstorming,
   online-research, edge-case-analysis, architecture-analysis, masterplan,
   implementation-plan, implementation) are every role's read/write contract. Parallel
   features = parallel folders; code overlap is managed via Shared-work-first.
4. Phase-3 external-research role is **`ecosystem-watch`** (renamed from
   online-research to keep ids unique; phase-2 artifact keeps the name).
5. `substrate.md` §6 **Commands** defines the loop; "full local check" = lint +
   typecheck + test + build, all green.
6. Nested role ids are folder-qualified (`log-analysis/apis.md` → `log-analysis-apis`).

7. **Runtime layer:** three swap points in config — sandbox `e2b`, harness
   `claude-code` (Max subscription via `claude setup-token` → `CLAUDE_CODE_OAUTH_TOKEN`
   in `.env`, injected into sandboxes only), models `haiku` by default with per-role
   overrides. `pi` is the installed switch target for other LLMs (one config line).
   Config layering: `runtime/factory.defaults.yaml` (template) ← `factory.config.yaml`
   (project) ← `.env` (secrets, never committed). Anthropic ToS forbids subscription
   OAuth in third-party harnesses (enforced server-side since 2026-04) — the pi path
   uses API keys or other providers, never spoofed subscription auth. See
   `runtime-plan.md`. GitHub is the **system of record**: sandboxes push feature
   branches + open PRs via a scoped `GITHUB_TOKEN` (fine-grained, this repo, never
   admin, never merges); only the operator's own auth merges; every commit is pushed
   promptly (`push_after_commit: true`); CI = `.github/workflows/factory-ci.yml`
   mirroring substrate Commands, required by branch protection; PR template in
   `.github/`. Commit prefixes: `factory:` / `console:` + `Factory-Role:` trailer.

8. **Console (Agent Pipeline):** generic multi-project operator console, e2b-style
   dark terminal design. Nav = General + the three steps, each with its own
   "Escalation to human" and "Runs & audit". Task lifecycle waiting → approved →
   started → finished maps onto the existing feature-plan statuses (no new field);
   finished = merged. Editing allowed only for waiting/approved tasks; .env never
   passes through the console; every console action = `console:` git commit + decision
   log. Full spec lives in the agent-pipeline monorepo: docs/BUILD-PLAN.md
   (+ ux-review.md, frontend-design.md, agent-pipeline-ui.html as visual spec).
   Build order M1→M6; merge action last.

9. **Stack & repo model (final):** Node 22 + TypeScript everywhere, npm workspaces,
   Hono server, vanilla TS client, **no database** — all state is committed files;
   only `runtime/logs/` stays local. The **agent-pipeline monorepo** (private GitHub
   repo) is the product: apps/console, packages/core (@factory/core),
   packages/orchestrator (@factory/orchestrator), template/ (THE canonical playbook —
   this file's home), docs/. Managed codebases are separate repos in
   `~/factory-workspace/` registered in `workspace.yaml`; `factory new` seeds from
   template/; projects diverge freely afterwards (template sync = parked). Console on
   127.0.0.1:4571.

## Parked improvements (add later, only when the as-is flow works)
- **project-manager** role: task breakdown between masterplan and senior-developer —
  atomic tasks with per-task intent, criterion→task traceability gate, parallel-ok
  scoping, fresh implementer context per task.
- Twin checkpoints as formal steps (after PO intake; before build), DECISIONS.md with
  the full authority matrix, feature `status` state machine, rollback runbook section,
  the `.claude/` executable layer (subagents, slash commands, hooks).

## Still to be filled by me (content, not structure)
- `rodin-twin.md` — my priorities, red lines, mandate (template sections are empty).
- `substrate.md` / `architecture.md` — real stack, commands, components.

## How to fix problems in a session
1. I upload the current playbook zip + this file, and describe the problem observed
   while building.
2. Diagnose against the playbook: which role/artifact/gate failed, and whether the
   cause is a doc gap, a wrong handoff, or missing authority.
3. Propose the minimal fix; ask before renames or moving decision authority.
4. Apply edits, then always: grep for stale references (old ids, old routing, plural
   "twins"), verify `reads`/`writes`/`handoff_to` targets and links resolve, keep
   `_template/` complete, rezip.
5. Convention guard: id == filename, kebab-case, frontmatter schema from root README,
   template artifacts carry `feature`/`plan_ref`, no agent pushes to main / merges /
   deploys without my sign-off.
