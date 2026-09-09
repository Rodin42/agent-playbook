# Agent factory — user manual

How to set up a new application and build it with the agent pipeline. Written from the
first real run (data-pipeline, 2026-09-08/10). Every step here was executed at least once;
where something bit us, the fix is written next to it.

## 0. What you get

One repository per application holds two things side by side: the **playbook** (the
process — role docs, artifact templates, the run contract) and the **product** (your code).
Agents run one pipeline step at a time in a disposable cloud sandbox, read the playbook
and the artifacts, write the next artifact, commit to a feature branch and push. The
console shows where every feature stands. You mark entries Ready, answer questions, and
merge pull requests. Nothing else is yours to do by hand.

## 1. Prerequisites (one afternoon, once per machine)

| Need | Why | How |
| --- | --- | --- |
| Node 22+ and npm | the factory CLI and console | `brew install node` |
| Docker Desktop, running | local services for tests (Postgres etc.) | docker.com |
| `make` | the command contract every project exposes | ships with macOS Xcode tools |
| `uv` (Python projects) | Python toolchain; fetches interpreters itself | `brew install uv` |
| Claude Code, logged in | the harness; also the session that runs setup | `npm i -g @anthropic-ai/claude-code`, then `claude` once |
| e2b account + API key | sandboxes and images | e2b.dev dashboard → API keys |
| GitHub: an **organization** on the Team plan for private repos | rulesets on private repos need Pro/Team; personal free accounts cannot protect a private `main` | github.com → New organization |
| `gh` CLI (optional) | convenience only; the factory uses a token | `brew install gh` |

**Three GitHub identities on one machine is a trap.** If you have several accounts, give
each an SSH alias in `~/.ssh/config` (`Host github-<name>` → its key) and use the alias in
remote URLs. "Repository not found" over SSH almost always means the wrong key answered.

## 2. Create the project

```
cd agent-playbook
factory new <name> --remote git@github.com:<org>/<name>.git
```

This copies the playbook into `~/factory-workspace/<name>`, makes the seed commit, and
registers the project in `workspace.yaml`. Create the empty repository on GitHub under the
organization **before** pushing. Then, in the project:

```
git checkout -b factory-setup
git push -u origin main          # the seed
```

Setup work goes on `factory-setup` and reaches `main` through the first pull request.

## 3. Bring your material

Put everything you already have — a spec, mockups, an ontology, reference docs — into
`docs/` in the project and commit it. Never loose at the repo root, never in ad-hoc
folders. The playbook's own content files live in `phase-1-product-development/`:

| File | What it holds | Who fills it |
| --- | --- | --- |
| `project-brief.md` | why the product exists, for whom, what good means, non-goals | you (plain words) |
| `substrate.md` | stack, repo layout, data spine, conventions, red lines, **commands**, environments | Claude with you; commands are only written after they ran green |
| `architecture.md` | the intended shape, flows, ADRs | Claude with you |
| `feature-plan.md` | the backlog; one full entry per feature | you as product owner |
| `agents/rodin-twin.md` | your priorities, red lines, delegations, escalation rules | **you only** |

A spec written elsewhere (for example in Claude Desktop) is welcome; it goes in `docs/`
and the four files above are condensed from it. Where the spec and the playbook layout
disagree, the playbook wins and the spec gets a note.

## 4. Run the setup session

Open `start_prompt.md` in the project and give it to Claude Code in that directory. It
walks Stages 0–9 with you. Plan for two to three hours of attention the first time. What
you will be asked to decide, in order:

1. **Stack** — language, framework, database, hosting. Say "recommended defaults" if you
   have no opinion; Claude scaffolds the minimal skeleton and runs every command.
2. **Project red lines** beyond the four the twin already carries.
3. **Environments** — what exists today; prod does not need to exist yet.
4. **The brief** — or permission to draft it for your review.
5. **The first feature**, stated as a problem, not a solution. Small and boring: feature
   one tests the factory, not the product.
6. **Spec open questions** — answer, or say "accept the recommended defaults".

Everything Claude cannot do itself is collected for you:

- **Tokens** go in the project's root `.env` (gitignored, three lines):
  `CLAUDE_CODE_OAUTH_TOKEN` from `claude setup-token`, `E2B_API_KEY` from the e2b
  dashboard, `GITHUB_TOKEN` (next section). Paste them in an editor. Never in chat.
  Ask Claude to verify each one; it reads the file in a shell, makes a harmless read-only
  call, and never prints the value.
- **The application's own secrets** (database URL, LLM keys) live next to the code, for
  example `apps/backend/.env`, never in the factory's root `.env`.

## 5. The GitHub token and branch protection

The sandboxes push feature branches and open pull requests with a **fine-grained personal
access token**. Rules learned the hard way:

- Only the **owner** of the repository can issue it. A collaborator cannot select someone
  else's repo. Log in as the account (or organization owner) that owns the repo, open
  `github.com/settings/personal-access-tokens/new`, set **Resource owner** to the org,
  "Only select repositories" → this repo, Contents **read and write**, Pull requests
  **read and write**, nothing else. If the org is missing from the dropdown, allow
  fine-grained tokens under the org's Settings → Personal access tokens.
- The token dies when the repo moves (for example from a personal account into an org).
  Re-issue it and replace the line in `.env`.
- Verify it: the token should list exactly one accessible repository.

Branch protection, as a **ruleset** on `main` (repo Settings → Rules → New branch
ruleset): restrict deletions, block force pushes, require a pull request (0 approvals is
fine while you merge your own), require the status check `full-local-check` with
"up to date" on. Turn on **secret scanning** and **push protection** under Settings →
Advanced Security. The token cannot read these pages; check them in the browser.

## 6. The sandbox image

Every project has `runtime/sandbox.Dockerfile`: Node 22, git, Claude Code, pi, and **your
toolchain**. Build it once, and again whenever it changes:

```
factory template build --project ~/factory-workspace/<name>
```

The alias comes from `factory.config.yaml` → `sandbox.e2b.template`. Verify by running a
sandbox and calling `claude --version` and your toolchain. Three things that broke:

- Claude Code needs its postinstall; never install it with `--ignore-scripts` (pi does
  need that flag).
- Dockerfile `ENV` values are not visible to sandbox commands; put binaries on `PATH`
  or symlink them into `/usr/local/bin`.
- There is no Docker inside a sandbox. Services the tests need (Postgres) must be
  installed in the image and started by `make db-up` when Docker is absent — see
  `infra/pg-local.sh` in data-pipeline for the pattern.
- The build reads the Dockerfile from your **working tree**. Check out the branch that
  has the version you mean to build.

## 7. Run a feature

1. Fill the plan entry completely (Answered in advance, Open questions) and set it
   **Ready**.
2. Run the roles in order; each is one command and one sandbox:

```
factory run product-strategist <slug> --project ~/factory-workspace/<name>
factory run ux-strategist <slug>
factory run test-strategist <slug>
factory run architect <slug>
factory run deployment-strategist <slug>
factory run rodin-twin <slug>          # writes the masterplan or a flag
factory run senior-developer <slug>
factory run implementer <slug>
factory run adversarial-reviewer <slug>
factory run pre-pull-request-qa <slug>
factory run promoter <slug>            # opens the PR — you merge
```

Each run prints the sandbox id, the prompt size, the harness cost, the verdict against
`runtime/steps.yaml`, and the commit it pushed. Exit code 0 = ok, 3 = failed (the reason
is in the log), 4 = escalated (the twin wrote a flag in `runtime/flags/` and needs you).
Run records are committed by the sandbox into `runtime/runs/` on the feature branch; the
orchestrator's own copy (including running and failed runs) is `.factory/runs/`, logs are
`runtime/logs/`, and a worktree per feature sits under `.factory/worktrees/<slug>/` so the
console sees the branch tip. `.factory/` is gitignored. Do not `git add -A` in the project
checkout while runs are in flight — commit named files.

The first real run (product-strategist, haiku) cost $0.28 and took 4½ minutes.

## 8. Fix the playbook, not the project

Every friction you meet is a playbook defect until proven otherwise. Fix it in the
monorepo's `template/` and mirror the file into the project (on a `factory/playbook-sync`
branch, merged by PR, and merged into any open feature branch). Log it in
`docs/FIRST-RUN-LOG.md`. That is how the second project gets a shorter manual than this.

## 9. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `Repository not found` over SSH | wrong key for that account | use the SSH alias; `ssh -T git@<alias>` tells you who you are |
| token sees zero repositories | repo moved or wrong resource owner | re-issue with the org as owner |
| PR says "clean" but not merged | it is not merged; GitHub's clean state is pre-merge | merge it in the browser |
| `claude: native binary not installed` in a sandbox | `--ignore-scripts` on install | rebuild the image |
| run `failed: artifact check …` | the role did not meet `runtime/steps.yaml` | read `runtime/logs/<id>.log`; usually a status the role forgot to set |
| `make db-up` fails in a sandbox | no Docker there | `infra/pg-local.sh` pattern |
| console shows "setup not finished" after a run | it reads your checkout | run `git fetch`; feature folders come from `.factory/worktrees/` |
