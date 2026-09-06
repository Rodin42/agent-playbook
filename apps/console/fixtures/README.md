# fixtures

- `demo-project/` — **jbr-factory**: a filled project mid-flight. 3 shipped, 3 in flight
  (F-004 waiting for your merge sign-off, F-005 building in a sandbox, F-006 blocked on
  a red line), 5 backlog entries, 3 open flags, a run registry with logs, a decision log.
  Generated from `template/` — artifact frontmatter is real. Copy `.env.example` to
  `.env` to make the overview's secrets tick green (values are dummies).
- `aurora-crm/` — a bare copy of `template/`: the "setup not finished" state (ux-review A12).
- `playbook-baseline/` — the 2026-09-05 factory-test output that F-007 is derived from.
- `workspace.yaml` — registers both. `npm run ui` serves this workspace.

Fixture dates are fixed (2026-09-06); the running run's duration grows with the clock.
