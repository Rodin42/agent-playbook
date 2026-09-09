# agent-playbook — improvement plan (2026-09-09)

What the first real project (data-pipeline) and a full audit of the template, core,
orchestrator and console say must change. Ordered by what blocks the next milestone.
Defects already fixed during setup are in `FIRST-RUN-LOG.md` (D-001…D-012) and are not
repeated. Status column: **done** = landed in this run · **next** = do before the first
feature travels · **later** = after the loop closes.

## A · Blockers for one feature to travel unattended

| # | Improvement | Where | Status |
| --- | --- | --- | --- |
| A1 | **Run-step contract**: one table role → target artifact → status before/after (or verdict line). Today no role sets `final` on discovery docs, `implementation.md`'s `in-progress → in-review → qa → merged` has no mover, and `feature-plan.md` / `architecture.md` / `#section` writes have no vocabulary — so "status advanced" is not decidable and the console's stations never light | `template/phase-2-implementation/features/README.md`, every role doc's last Process step, `template/runtime/README.md` | next |
| A2 | **Step instruction + path resolution** defined and shipped (was undefined) | orchestrator `runtime/prompt.ts` + `paths.ts`; `template/runtime/README.md` | done |
| A3 | **Headless permissions and JSON output**: `claude -p` cannot answer permission prompts; without `--dangerously-skip-permissions` it writes nothing, and cost/tokens need `--output-format json`. The 2026-09-05 smoke test only proved stdout | orchestrator harness adapter (done); `template/runtime/factory.defaults.yaml` `headless_flags` still says `["-p"]` | next |
| A4 | **Gate verdicts literal**: `parseVerdict` accepts only `**Verdict:** pass` / `**Verdict:** fail → <role>`; the template's own hint line is what agents will copy and it is rejected | `adversarial-reviewer.md`, `pre-pull-request-qa.md`, `_template/implementation.md` | next |
| A5 | **Feature-run id and seeding**: id = `<UTC ts>-<role>-<slug>` (parallel-safe); orchestrator seeds `features/<slug>/` from `_template/` on the first step | orchestrator (done); `features/README.md` still says a human copies the folder | next |
| A6 | **Branch policy per write class**: sandboxes may only push `feature/*`, but `product-strategist` and Phase-3 roles edit `feature-plan.md`, and flags/runs land in `runtime/`. Decide: plan/runtime writes go to a `factory/plan` branch with auto-PR, artifacts to `feature/<slug>` | `template/runtime-plan.md` §1, `README.md` conventions, orchestrator | next |
| A7 | **Console read model**: the console derives from the operator's local working tree on whatever branch is checked out; sandbox commits live on `origin/feature/*`. Today the acceptance ("commit lands, console re-derives") only works after a manual checkout. Either the orchestrator maintains a worktree per feature under the project, or the console reads `origin/<branch>` via `git show` | `apps/console/server/app.ts`, `packages/core/src/project.ts`, orchestrator | next |
| A8 | **Online-research has no author**: `authors: ["<role>"]`, no role lists it in `writes:` — `factory run` can never produce it | `_template/online-research.md` + one role doc (architect or product-strategist) | next |
| A9 | **Co-authored artifacts** (brainstorming, edge-case-analysis, architecture-analysis have two authors) need an order: first author → `draft`, second → `in-review`; or one owner + one reviewer | role docs, `features/README.md` | next |
| A10 | **Twin flags are undefined in the template**: the flag format exists only in `docs/BUILD-PLAN.md`; no role doc says when to write one (red-line contact, unanswered PO question, high-stakes call). Now shipped in `template/runtime/README.md`; the twin and gate roles still need an "Escalate by writing a flag" section | `rodin-twin.md`, gate role docs | next |
| A11 | **Who marks Ready and In progress**: `feature-plan.md` says the twin signs Ready; CONTEXT/BUILD-PLAN say the operator (console M3 approve). Nobody flips Ready → In progress, yet the console shows the pipeline only for In progress. Decide: operator marks Ready; orchestrator flips to In progress on the first Phase-2 run | `feature-plan.md` template, `features/README.md`, orchestrator | next |

## B · Runtime and sandbox

| # | Improvement | Where | Status |
| --- | --- | --- | --- |
| B1 | `factory template build` from `runtime/sandbox.Dockerfile`, per project, alias from config | orchestrator `runtime/template.ts`, `template/runtime/sandbox.Dockerfile` | done |
| B2 | `factory run <role> <feature>` v0: sandbox → clone → seed → prompt → harness → verify → commit → push → run record + log → destroy | orchestrator `runtime/run.ts` | done |
| B3 | **Tests need services inside the sandbox**: data-pipeline's `make test` needs Postgres via Docker; e2b has no Docker. The implementer's full local check cannot run there. Options: install Postgres in the image and start it in `make db-up` when no Docker; or the orchestrator provisions a service. Add a `sandbox` row to substrate §8 | `sandbox.Dockerfile`, project Makefile, `template/…/substrate.md` §8 | next |
| B4 | **Run records reach the repo**: `runs/<id>.json` is written locally; nothing commits it. Decide with A6 (commit from the host onto the feature branch after the sandbox pushes) | orchestrator | next |
| B5 | `factory next` (pick the next step from artifact status) and `factory stop <runid>` (kill sandbox, mark stopped) — Phase C | orchestrator | later |
| B6 | pi harness adapter is a stub (no auth, no output parsing); the one-line switch is not yet proven | `runtime/harness.ts` | later |
| B7 | Sandbox network policy: restrict egress to github.com, the LLM API and package registries | `runtime/sandbox.ts` (e2b `network` opts) | later |

## C · Template docs and integrity

| # | Improvement | Where | Status |
| --- | --- | --- | --- |
| C1 | `factory check`: the Stage 6 integrity tool (frontmatter, ids, reads/writes targets with the `<…>` convention, links, seven template artifacts, stale names). Done by hand twice already | new `packages/core` function + CLI command; start_prompt Stage 6 | next |
| C2 | Artifact frontmatter schema: `authors` vs `authored_by` vs role-style `reads:` on `masterplan.md`; README documents role keys only | `template/README.md`, all seven `_template` files, `project-brief.md` | next |
| C3 | `reads:` vs prose mismatches (test-strategist, ux-strategist, architect read feature docs in prose but not in frontmatter) and the seven-artifact order | role docs | next |
| C4 | `template/CONTEXT.md` is a stale monorepo note inside every project seed ("Node 22 everywhere", "twin still empty", zip workflow) | move to monorepo `docs/`, keep a short project-facing note | next |
| C5 | README conventions say agents never open a PR; the twin's mandate says it may open, never merge | `template/README.md` | next |
| C6 | Start prompt: Stage 1 file list omits Makefile, CI, PR template, agents/README; operator-only steps not tagged `[OPERATOR]`; 5b.4 smoke test runs on the host login, not the `.env` token | `template/start_prompt.md` | next |
| C7 | Multi-toolchain `.gitignore` block (python, go, rust, dotnet) instead of `node_modules/` only | `template/.gitignore` | next |
| C8 | Phase-3 `ecosystem-watch` leads with `npm audit`; give the Makefile `audit`/`outdated` targets and have the role call those | `template/Makefile`, role doc | later |
| C9 | Small text fixes: "telling the twins" plural, four-cell table row in phase-1 README, twins framed as plural in agents/README | one-line edits | later |

## D · Console (after the loop works end to end)

| # | Improvement | Where | Status |
| --- | --- | --- | --- |
| D1 | M3: approve = Ready, entry edits, config editor | `apps/console` | later |
| D2 | Live run log tail from `runtime/logs/`, stop button → `factory stop` | `apps/console` | later |
| D3 | Flag resolution UI writing `## Decision` and `decisions.log` | `apps/console` | later |
| D4 | Secrets presence panel already exists; add "token verified" checks (the read-only calls used in this session) | `apps/console`, core | later |

## E · Operator experience (goes into the user manual)

- Prerequisites page: Docker, `uv`, `make`, `gh`, e2b account, GitHub org on Team plan for
  private-repo rulesets; three GitHub identities on one machine is a trap — document the
  SSH alias pattern.
- Where things live: `docs/` for supplied documents; playbook content files in
  `phase-1-product-development/`; app code beside it; `runtime/` for the trail.
- The token dance: fine-grained PAT must be issued by the repo's **owner** (a collaborator
  cannot), and it dies when the repo moves to an organization.
- Verification pattern for every secret: read it from `.env` in a shell, make a harmless
  read-only call, never print it.
- Branch protection: rulesets need Pro/Team on private repos; the required check name is
  the CI job id (`full-local-check`).

## The five that matter most

1. **A1 — the run-step contract.** Without it `factory run` cannot judge success on most
   roles and the console never shows progress.
2. **A6 + A7 + B4 — branch policy and read model.** Decide where plan edits, flags and run
   records go, and what the console reads. The acceptance test depends on it.
3. **A3 + A4 — make the harness and the gates machine-safe** (permission flag and JSON in
   defaults; literal verdict lines).
4. **B3 — services in the sandbox**, or the implementer can never run the full local check
   where it actually runs.
5. **C1 — `factory check`**, so integrity is a command, not a session.
