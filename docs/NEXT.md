# NEXT — the start file for the next session

Read this first in a fresh session. It says what exists, what the next run builds, the
rules, and what the operator must supply. Companion: `docs/EXECUTION-PLAN.md` (how the
console was built, all steps ☑), `docs/SESSION-2026-09-06.md` (close-out).

## State (2026-09-06, end of day)

- Repo `Rodin42/agent-playbook` = the monorepo. `template/` (the playbook),
  `packages/core` (derivation, 62 tests), `packages/orchestrator` (`factory ui`, `factory
  new` real; `run/next/stop/template build` exit 2), `apps/console` (M1+M2 built:
  read-only multi-project console on 127.0.0.1:4571). CI green.
- Proven: `claude -p` authenticates inside a clean `node:22` container with only
  `CLAUDE_CODE_OAUTH_TOKEN` (control without the token fails). `claude -p` exits 0 on
  failure — success must be "artifact written and its status advanced", never exit code.
- Run it: `npm ci && npm run build && npm run ui` (fixture workspace).
- Nothing real flows yet: the console renders fixtures. No real project exists.

## The next run: one real feature moves

**Track A · the real project (operator content + seeding)**
1. `factory new <name> --workspace ~/factory-workspace --remote <git url>`; push it.
2. Operator fills `project-brief.md`, `substrate.md` (esp. §6 Commands and §5 red lines),
   `rodin-twin.md` mandate sections — plain words. Claude Code assists via
   `start_prompt.md` Stages 2–5 but never invents priorities or red lines.
3. Operator adds the first `feature-plan.md` entry (or a PO does). Console shows the
   project with green pre-work ticks.

**Track B · runtime Phase B (`template/runtime-plan.md` §4)**
4. `factory template build`: e2b `factory-base` from a Dockerfile = `node:22` + git +
   `@anthropic-ai/claude-code` + pi (installed, unconfigured). Record the template id
   in the project's `factory.config.yaml`.
5. `factory run <role> <feature>` v0, claude-code adapter: create sandbox → inject
   `CLAUDE_CODE_OAUTH_TOKEN` + `GITHUB_TOKEN` as env only → clone the project repo at
   the feature branch → compose prompt = role doc + the role's `reads:` files + the step
   instruction → `claude -p --model <role model> "<prompt>" < /dev/null` → verify the
   role's `writes:` artifact exists, parses, status advanced → commit `factory: <role>
   <feature>` with `Factory-Role:` trailer → push → write `runtime/runs/<id>.json` +
   log → destroy sandbox. Non-zero-signal failures → `status: failed` + reason.
6. Run `product-strategist` on the first real entry. The commit lands, the console
   re-derives, the run appears in step 1 runs & audit. **That is the acceptance.**
7. Then `rodin-twin` checkpoint-1 on the same entry → the first real flag if gaps.

**Then** M3 (approve = Ready, entry edits, config editor) so the loop closes in the
console: PO entry → approve → `factory next` → artifacts → gates → flags → merge (M6).

## Operating rules (unchanged)
Autonomous, no check-ins; one commit per step, pushed immediately; `factory:` /
`console:` prefixes; the repo is the truth; secrets never through the console or the
chat; never merge, deploy, or push to `main` of the project repo without the operator.
Sandboxes push `feature/*` branches only.

## What the operator supplies before the run
- Project **name** and **git remote** (which GitHub account: `Rodin42` or `jbr-rl`).
- In the project: `.env` with `CLAUDE_CODE_OAUTH_TOKEN`, `E2B_API_KEY`, `GITHUB_TOKEN`
  (fine-grained PAT, that repo only, contents r/w + pull requests write, no admin) —
  pasted by the operator in an editor, never via chat or `echo`.
- e2b account active (`e2b auth login` done by the operator in a terminal).
- The content of Track A step 2 — or explicit permission to draft it for review.

## Decisions pre-approved by the operator
The name is agent-playbook for everything · claude-code is the harness on the Max plan ·
haiku default, sonnet for implementer/senior-developer, opus for adversarial-reviewer ·
localhost only · no database · M3–M6 after the runtime.
