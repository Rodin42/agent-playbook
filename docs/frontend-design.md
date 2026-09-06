# Agent Pipeline — Frontend Design & Architecture (v2)

The operator console for the factory — generic across projects (selector upper-left,
one project active at a time). Companion to `agent-pipeline-ui.html` (open in a browser;
all views, buttons, modals and toasts work). Look-and-feel follows e2b.dev: dark
terminal aesthetic, JetBrains Mono throughout, bracketed section tags, e2b orange
`#FF8800` as both brand and escalation signal (green `#4EC97B` flowing, red `#FF5449`
red-line, violet twin). Navigation mirrors the process: a General section (project
brief pre-work, foundation, configuration) and the three steps — Product development,
Implementation, Housekeeping — each with its own views plus **Escalation to human** and
**Runs & audit** scoped to that step. "Escalation to human" is deliberately role-named:
today the human is Rodin; later it can be someone else per step.

## Principles

1. **The repo is the source of truth; the console renders it.** Every element on screen
   maps 1:1 to a file: an inbox row is a feature-plan entry, a pipeline station is a
   status field in an artifact's frontmatter, an audit line is a twin log entry. The
   console never holds state the repo doesn't.
2. **Amber is the only color that begs.** The whole UI answers one question — *what
   needs Rodin right now* — and only the "Needs you" signal is allowed to shout.
3. **Cases, not notifications.** Everything that needs the operator arrives in the
   twin's escalation format: question · options · recommendation · what is blocked.
   One tap on the recommended option is the common path.
4. **Secrets show presence, never values.**

## The five views

| View | Answers | Backed by |
| --- | --- | --- |
| **Inbox** | What have the POs put in, and is it complete? | `feature-plan.md` entries + twin checkpoint-1 results (answered-in-advance bars, gap questions) |
| **Pipeline** | Where is every started feature? | Feature folders: each artifact's `status:` frontmatter → one lit station per stage on the shared ruler; exception tags from gate verdicts |
| **Needs you** | What is blocked on me? | Twin flags + sign-off requests (merge, ADR, waivers, triage) as case files with actions |
| **Runs & audit** | What are agents doing, what does it cost, what did the twin sign? | Orchestrator run registry + streamed sandbox logs + twin sign-off log + token-cost meter |
| **Configuration** | Form over `factory.config.yaml` | Schema-validated editor; writes the file; secrets from `.env` as set / not set |

## Architecture

```
┌─ browser SPA (static, no framework needed) ──────────────┐
│  five views · SSE subscription for live runs/logs        │
└───────────────▲──────────────────────────────────────────┘
                │ HTTP + Server-Sent Events (localhost only)
┌───────────────┴──────────────────────────────────────────┐
│  factory ui — small Node server (part of the orchestrator)│
│  · reads repo: feature-plan, feature folders, frontmatter │
│  · watches files (chokidar) → pushes updates over SSE     │
│  · reads runtime/logs/ + orchestrator run registry        │
│  · WRITES only: factory.config.yaml, decision files       │
│    (an approved case = a committed decision artifact —    │
│     e.g. ADR status flip, triage result, merge request    │
│     handed to the orchestrator; merge itself still goes   │
│     through git/GitHub with the operator's credentials)   │
└──────────────────────────────────────────────────────────┘
```

- **Derivation, not database.** Pipeline state = parse frontmatter `status:` across
  `features/*/`; inbox = parse `feature-plan.md`; alerts = scan for twin flag files
  (`runtime/flags/*.md`, written by the twin/orchestrator, closed by an operator
  decision). No DB; a page refresh re-derives everything.
- **Actions are writes to the repo.** "Approve ADR-0007" flips the ADR status and
  commits; "Schedule F-010" updates the plan entry. The one action that leaves the
  repo is merge, which calls `gh pr merge` under the operator's own auth — the console
  never holds credentials of its own.
- **Cost meter.** The orchestrator records tokens/model per run (claude-code exposes
  usage in its JSON output mode); the console aggregates. This is the data that decides
  the haiku/sonnet/opus tiers.
- **Local only.** Binds to localhost; no accounts, no cloud. Remote access, if ever,
  is a VPN/tunnel decision — not a feature.

## Design tokens (from the mockup — `agent-pipeline-ui.html` is the spec)

Dark only (BUILD-PLAN §5). The custom properties exactly as the mockup declares them:

| Token | Value | Role |
| --- | --- | --- |
| `--bg` | `#0D0D0C` | page |
| `--panel` / `--panel2` | `#141413` / `#1A1A19` | cards / nested cards |
| `--line` / `--line2` | `#262624` / `#333330` | borders / stronger borders |
| `--ink` | `#E9E9E4` | primary text |
| `--dim` / `--faint` | `#8F8F88` / `#5C5C56` | secondary / tertiary text |
| `--org` / `--org-dim` / `--org-bg` | `#FF8800` / `#B36407` / `#2A1D0B` | brand and **needs you** — the only color that begs |
| `--grn` / `--grn-bg` | `#4EC97B` / `#0F2417` | flowing / passed |
| `--red` / `--red-bg` | `#FF5449` / `#2A1210` | red line / exception |
| `--vio` / `--vio-bg` | `#B29EFF` / `#1D1930` | the twin |
| `--blu` | `#6CB0FF` | links / neutral info |

Type: `'JetBrains Mono', monospace` throughout, `html{font-size:14px}`, bracketed
section tags, tabular numerals wherever data appears. The pipeline board is the single
bold element; everything else stays quiet. (The earlier light "Workshop" palette with
Archivo was v1 and is retired.)

## Build plan (Phase D, in order)

1. Read-only console: server + Inbox + Pipeline from the real repo (1–2 sessions).
2. Runs & audit: run registry + SSE log streaming + stop-run (kills the sandbox).
3. Needs-you cases wired to decision writes (ADR flip, triage, send-back).
4. Config editor with schema validation + auth-conflict guard.
5. Merge action via `gh` under operator auth — last, it's the crown jewel gate.

## Added beyond the original four asks (and why)

- **Runs & audit view** — the twin's mandate requires that delegated sign-offs are
  auditable next morning; a **Stop run** kill switch; live logs.
- **Cost meter** — per-model spend is the data the "optimize later" decision needs.
- **Top strip** — running sandboxes, today's cost, model mix, CI state: the control-room
  glance before opening any view.
- **Guard rails in config** — blocks saving both Claude auth variables at once.
