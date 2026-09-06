# agent-pipeline

The agent factory: a three-phase, artifact-driven software pipeline run by AI agents
with a human at the irreversible gates — plus the operator console that renders it.

```
template/                the canonical playbook · `factory new <name>` seeds a project from it
packages/core            @factory/core — data contracts, frontmatter reading, status derivation
packages/orchestrator    @factory/orchestrator — the `factory` CLI (ui · new · run · next · stop · template build)
apps/console             @factory/console — Hono server + vanilla TS client, 127.0.0.1:4571
apps/console/fixtures    a filled demo project (jbr-factory) and a bare one (aurora-crm)
docs/                    BUILD-PLAN · CHANGES · RECONCILE-STATE · EXECUTION-PLAN · ux-review · design · mockup
```

Truths: the project repos are the only state (no database); GitHub is the system of
record (push after every commit); secrets never pass through the console.

## Run it

```
npm ci && npm run build
cp -n apps/console/fixtures/demo-project/.env.example apps/console/fixtures/demo-project/.env   # dummy values → green ticks
npm run ui                       # console on http://127.0.0.1:4571 for the fixture workspace
```

Your own workspace: `node packages/orchestrator/dist/cli.js new my-product --workspace ~/factory-workspace`
then `… ui --workspace ~/factory-workspace`. Every check: `npm run check`.

## Status

**M1 (read-only console, multi-project) + M2 (feature drawer, quality-of-life) built.**
M3–M6 (writes, flag resolution, run control, merge) are next and start with the operator
walking the M1/M2 journey on the fixture. Orchestrator `run/next/stop/template build`
arrive with runtime Phase B/C. Start here: `docs/CHANGES.md` → `docs/BUILD-PLAN.md` →
`docs/EXECUTION-PLAN.md`.
