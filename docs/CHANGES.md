# CHANGES — decision delta since the first M1 prompt

You (Claude Code) started building from an earlier BUILD-PLAN. The decisions below were
made after that. **Reconcile — do not start fresh.** Follow the procedure at the bottom.

## D1 · Monorepo (new)
The product is one private GitHub repo, `agent-pipeline`, npm workspaces:
`apps/console` (@factory/console) · `packages/core` (@factory/core: frontmatter
reader, status derivation, the data contracts of BUILD-PLAN §2 as TS types) ·
`packages/orchestrator` (@factory/orchestrator: the `factory` CLI) · `template/`
(the canonical playbook) · `docs/` (these documents). Root: `package.json`,
`.gitignore` (node_modules, dist, *.log), `Dockerfile`, `workspace.yaml.example`,
`README.md`. Your existing console code moves into this shape.

## D2 · Stack locked
Node 22 + TypeScript everywhere. Server = **Hono** (if you started with Express, port —
the surface is small). Client = vanilla TS + esbuild, matching the mockup. npm only.

## D3 · No database — confirmed final
All state is committed files in the *project* repos (flags, run registry JSONs,
decision log, config). Views derive on read; refresh rebuilds everything. Exception:
raw run logs (`runtime/logs/`) are local-only and gitignored. If you built any storage
beyond in-memory derivation, remove it. SQLite cache = parked, never the truth.

## D4 · Multi-project is now M1 scope
Managed codebases are separate repos in a workspace folder (default
`~/factory-workspace/`), registered in `workspace.yaml`:

```yaml
projects:
  - name: jbr-factory
    path: ./jbr-factory
    remote: git@github.com:rodin/jbr-factory.git
```

The console loads the workspace (`factory ui --workspace <path>`, default
`~/factory-workspace`), the upper-left project selector is real, and all derivation is
per selected project. A project missing its pre-work renders the setup-checklist state
(ux-review A12), never an empty dashboard.

## D5 · Template model
`template/` in the monorepo is the single home of the playbook (the old standalone
agent-playbook zip is retired). `factory new <name>`: copy `template/` → workspace
project folder, `git init` + first commit, register in `workspace.yaml`, print the
next step (run `start_prompt.md` in the project). After seeding, the project's config,
roles and templates are its own — the template never overwrites a project.
`factory template diff/sync` = parked.

## D6 · GitHub is the system of record (BUILD-PLAN §0 rule 6)
Applies to the monorepo too: push after every commit; commit prefixes stay
(`factory:`, `console:`); project repos additionally use the scoped `GITHUB_TOKEN`
for sandbox pushes, CI workflow and PR template now shipped in `template/.github/`.

## D7 · Docs relocated
The build documents live in `docs/` (this file, BUILD-PLAN, ux-review,
frontend-design, the mockup). `template/runtime-plan.md` stays with the playbook.
All path references in BUILD-PLAN are updated; if your code references old
`runtime/ui/` paths, update them.

## D8 · Constants
Port 4571, localhost only. Package scope `@factory/*` (never published). Dockerfile is
optional deployment convenience (node:22-slim + git + gh), not a dev requirement.

## D9 · Reconciled 2026-09-06 (Claude Code)
No console code existed before this handover, so D2/D3 and the code half of D7 did not
apply. Carried into the monorepo: the verified runtime facts (Max token authenticates
`claude -p` in a clean container; `claude -p` exits 0 on failure), the `runtime-plan.md`
corrections the handover had regressed (pi was described as template default while
`factory.defaults.yaml` ships claude-code), a unified artifact status vocabulary
(BUILD-PLAN §2.1), the fixture seed and the research docs. The embedded `template/.git`
(a clone of the retired work repo) was removed. Repo: `Rodin42/agent-playbook` stays
the remote (rename to `agent-pipeline` on GitHub is an operator to-do). Full record:
`docs/RECONCILE-STATE.md`.

---

## Reconciliation procedure (do in order, stop where it says stop)

1. **Freeze.** Finish or stash to a clean commit. Write `docs/RECONCILE-STATE.md`:
   what exists, what derives from where, test status.
2. **Read** this file, then the updated `docs/BUILD-PLAN.md` end to end.
3. **Write a migration plan** into `docs/RECONCILE-STATE.md`: current code → monorepo
   layout (D1), Express→Hono if applicable (D2), storage removal if applicable (D3),
   workspace/multi-project changes to M1 (D4), `factory new` (D5), path fixes (D7).
   List anything in the new plan that conflicts with code you already wrote.
4. **STOP. Show the migration plan and wait for the operator's approval.**
5. Execute the approved plan. Keep M1's acceptance criteria (now multi-project).
   Push after every commit.
6. Stop at the M1 gate with a summary; wait for the operator before M2.
