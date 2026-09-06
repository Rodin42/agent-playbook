# agent-pipeline

The agent factory: a three-phase, artifact-driven software pipeline run by AI agents
with a human at the irreversible gates — plus the operator console that renders it.

- `template/` — the canonical playbook. `factory new <name>` seeds a project from it;
  projects then own and may diverge their copies.
- `packages/core` — data contracts, frontmatter reading, status derivation.
- `packages/orchestrator` — the `factory` CLI (new · run · next · stop · ui · template build).
- `apps/console` — the operator console (Hono server + vanilla TS client, port 4571).
- `docs/` — BUILD-PLAN, ux-review, design system, visual-spec mockup, CHANGES.

Truths: the project repos are the only state (no database); GitHub is the system of
record (push after every commit); secrets never pass through the console.

Start here: `docs/CHANGES.md` → `docs/BUILD-PLAN.md`.
