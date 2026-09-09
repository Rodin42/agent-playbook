# NEXT — the start file for the next session

Read this first in a fresh session. Companions: `docs/FIRST-RUN-LOG.md` (every playbook
defect met on the first real project), `docs/IMPROVEMENTS.md` (the prioritized fix list),
`docs/EXECUTION-PLAN.md` (how the console was built).

## State (2026-09-09, end of session)

- **The factory ran a real step.** `factory run product-strategist ingest-folder` on the
  project `data-pipeline` (org `jbr-one`): sandbox from the project's own e2b image →
  clone → seed the feature folder → 30k-char prompt → Claude Code headless (haiku) →
  artifact verified by content → commit `e6df4fe` with `Factory-Role`/`Factory-Run`
  trailers pushed to `feature/ingest-folder` → run record + log written → sandbox
  destroyed. Cost $0.28, 4 min 25 s. The console reads the run record and the cost.
  **That was the Track B acceptance.**
- Monorepo: `packages/orchestrator/src/runtime/` = env, paths, prompt, verify, harness
  (claude-code + pi stub), sandbox (e2b), run, template. 73 tests green. `factory run`,
  `factory template build` real; `next`/`stop` still exit 2.
- Project `~/factory-workspace/data-pipeline`: setup complete through Stage 9
  (`docs/SETUP-HANDOVER.md`); everything sits on branch `factory-setup` = **PR 1, still
  open** — the operator must merge it. `feature/ingest-folder` was branched from it.
- Operator's GitHub: org `jbr-one` on Team plan, ruleset on `main`, secret scanning +
  push protection on, PAT scoped to the repo. `.env` has all three tokens, verified.

## The next run

1. Operator merges PR 1. Then `feature/ingest-folder` is a normal feature branch off main.
2. **IMPROVEMENTS A1** — write the run-step contract (role → artifact → status
   before/after) into the template and role docs; make `verifyArtifact` use it.
3. **A6 + A7 + B4** — branch policy for plan/runtime writes and the console read model
   (worktree per feature or `git show origin/<branch>`); commit run records.
4. **A3 + A4** — `factory.defaults.yaml` headless flags; literal verdict lines in the
   gate role docs and template.
5. Continue the chain on `ingest-folder`: ux-strategist, test-strategist, architect,
   deployment-strategist, then `rodin-twin` masterplan → first flag if gaps.
6. **B3** before the implementer runs: Postgres inside the sandbox image so `make test`
   works there.
7. Then M3 in the console, and the **user manual** (goal 2) from FIRST-RUN-LOG +
   IMPROVEMENTS §E + SETUP-HANDOVER.

## Operating rules (unchanged)
Autonomous, no check-ins; one commit per step, pushed immediately; `factory:` /
`console:` prefixes; the repo is the truth; secrets never through the console or the
chat; never merge, deploy, or push to `main` of the project repo without the operator.
Sandboxes push `feature/*` branches only. Every playbook defect is fixed at
`template/` and mirrored into the project.
