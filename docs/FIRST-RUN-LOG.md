# First-run log — data-pipeline (started 2026-09-08)

Running record of every defect and friction point met while building the first real
project through the playbook. Each entry: what broke, where the fix lives, status.
Raw material for the user manual (goal 2 of the run).

| # | Found at | Defect / friction | Fix location | Status |
| --- | --- | --- | --- | --- |
| D-001 | Stage 3 | `template/.github/workflows/factory-ci.yml` assumes a Node-only project; a Python + TypeScript monorepo needs both toolchains (uv, ruff, pyright, pytest) and a Postgres service | template CI now calls root `Makefile` targets; `template/Makefile` ships with failing placeholders; start_prompt 3.3 / 8.4 reworded | fixed 2026-09-08 |
| D-002 | Track B | Planned `factory-base` sandbox image is `node:22` + claude-code only; must carry Python + uv as well, or be per-project | `template/runtime-plan.md` §4, Dockerfile | open |
| D-003 | Stage 6 | No integrity-check tool ships with the playbook; Stage 6 had to be done with an ad-hoc script | add `factory check` (or a script under `template/runtime/`) | open |
| D-004 | Stage 0 | `factory new` leaves the seed on `main`; start_prompt Stage 0 expects a fresh `factory-setup` branch — the two disagree on who creates it | start_prompt Stage 0 now says: create `factory-setup` from `main` yourself | fixed 2026-09-08 |
| D-005 | Stage 5 | A spec written outside the playbook (Claude Desktop) put substrate/ADRs under `/docs`; the playbook keeps them in `phase-1-product-development/`. Manual needs a "where things live" page a spec author can follow | user manual | open |
| D-006 | Stage 3 | `substrate.md` template has no Environments section although start_prompt Stage 3.5 asks for one | §8 Environments added to the template substrate | fixed 2026-09-08 |
| D-007 | Stage 5b | One root `.env` for the factory collides with the application's own env file when the app also needs secrets | comment in `template/.env.example`; start_prompt 5b names the app-level env file | fixed 2026-09-08 |
| D-008 | Stage 5 | Template `.gitignore` lacks `.DS_Store`; a Finder visit committed it | `template/.gitignore` | fixed 2026-09-08 |
| D-009 | Stage 5 | No agreed drop-zone for operator-supplied documents (spec, mockups, references); files landed at the repo root and in an ad-hoc `spec/` folder. `docs/` is now the convention | start_prompt Stage 5.0: operator documents go to `docs/`, committed | fixed 2026-09-08 |

| D-010 | Stage 3 | `substrate.md` template has no Repo layout table although start_prompt Stage 3.2 asks for one | Repo layout sub-table added under §1 of the template substrate | fixed 2026-09-08 |
| D-011 | Stage 3 | Machine prerequisites (Docker, `uv`, …) are nowhere listed; `uv` was missing on the operator's machine | start_prompt 3.3 + substrate §6 now list prerequisites; manual needs a prerequisites page | fixed 2026-09-08 |
| D-012 | Stage 3 | Two toolchains in one repo need one command contract; raw commands in CI and role docs diverge | root `Makefile` is the contract (see D-001) | fixed 2026-09-08 |

| D-013 | Track B | `npm i -g @anthropic-ai/claude-code --ignore-scripts` leaves Claude Code without its native binary; the postinstall must run. pi is the one that needs `--ignore-scripts` | `template/runtime/sandbox.Dockerfile` | fixed 2026-09-09 |
| D-014 | Track B | Dockerfile `ENV` values are not present in the sandbox command environment; anything the runtime needs must be on PATH or in a file | `template/runtime/sandbox.Dockerfile` (symlink python3.13 into /usr/local/bin) | fixed 2026-09-09 |
| D-015 | Track B | e2b sandboxes have no Docker, so `make test` (compose Postgres) cannot run where the implementer runs — the full local check is not executable in a sandbox yet | IMPROVEMENTS B3 | open |
| D-016 | Track B | The console reads the operator's working tree; sandbox commits land on `origin/feature/*` — invisible until a checkout | IMPROVEMENTS A7 | open |
| D-017 | Stage 8 | A fine-grained PAT is bound to its resource owner: moving the repo into an organization killed it; a collaborator cannot issue one for a repo they do not own | user manual (token page) | documented |

## Decisions taken by the operator during the run
- 2026-09-08: no auth in v0; ontology version nullable at ingest; feedback panel (spec
  §12.6 / C.3) deferred; Postgres via compose locally and a service in CI; Step 3 runs
  in E2B sandboxes (ADR-0004 accepted); SQL-first with psycopg 3, no ORM, no Alembic
  (ADR-0005); Postgres 17 now with an upgrade to 19 planned at 19.1; F-001 not split;
  processing order FIFO by timestamp; Python 3.13, Node 22.
