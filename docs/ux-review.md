# UX Review — Full Pipeline Walkthrough

Method: walked the operator's journey end-to-end against the process (playbook), the
runtime (plan + config) and the console (mockup v2): day 0 setup → PO intake → approval
→ build → escalations → merge → finished → housekeeping → next feature. Every friction
point below is tagged **v1** (build it now) or **later** (parked, deliberate).

## A · Gaps found in the journey

**A1 · Nothing starts a feature. (v1)**
An approved task is "queued for step 2" — but no button, command, or rule actually
starts it. Fix: the orchestrator owns starting; the console gets a **run mode** control
in the top strip: `manual` (operator presses *start next* / *start* on an approved task)
or `auto` (orchestrator picks the top-ranked approved task whenever a concurrency slot
is free). Default manual until trust is earned.

**A2 · Escalations assume you're watching. (v1)**
The amber badge only works if the console is open. A feature can sit blocked for hours.
Fix: a **notify hook** in config (`notify: webhook|email|none`) — one POST per new
escalation with title + link. Slack/e-mail-agnostic webhook is enough for v1.

**A3 · No pause. (v1)**
Before a vacation or a risky day there is no way to say "finish what's running, start
nothing new." Fix: **pause pipeline** toggle next to run mode; running sandboxes finish,
queue freezes, escalations still flow.

**A4 · Infra failures have no home. (v1)**
Token expired, sandbox crashed, e2b quota hit — that's not a process escalation (no
twin case), but it must surface. Fix: a **system** flag type: appears in the affected
step's escalation queue with a wrench icon and in the top strip; retry button on the
failed run.

**A5 · No per-feature detail. (v1)**
The pipeline row links to logs and cases, but not to the thing itself. Fix: click a
pipeline row → **feature drawer**: the artifact trail (seven files with their status
ticks), the task list from the breakdown, open questions, costs so far, branch + PR
links. This is the single most-used screen once real work flows.

**A6 · Operator decisions aren't logged — only the twin's. (v1)**
The audit table shows twin sign-offs, but your merges, ADR approvals, waivers and
overrides are just as auditable. Fix: one **decision log** (both actors, filterable),
replacing "twin sign-offs" as the audit table. Every console action writes to it.

**A7 · Concurrency is unbounded. (v1)**
Auto mode + many approved tasks = surprise e2b bill. Fix: `max_concurrent_sandboxes`
in config (default 2), visible in the top strip as `2/2 slots`.

**A8 · Budget has no guard. (v1, small)**
Cost is displayed but nothing acts on it. Fix: `budget_monthly_usd` in config; top
strip turns amber at 80%, a system flag is raised at 100% and auto mode pauses.
Hard-stop stays manual — the operator decides, per the authority model.

**A9 · Rollback case is designed in the process but missing in the console. (v1)**
Post-PR regression → the escalation queue must carry a **rollback** case type with the
runbook from architecture-analysis.md inlined, since it's executed at 03:00.

**A10 · PO intake path is undefined in the console. (later)**
POs add entries via a chat session with the strategist today — fine, but invisible
here. Later: a share-link "intake" page (PO-facing, write-only, no operator views).
For v1 the backlog's *waiting on PO* chips are enough.

**A11 · e2b template build is a tick with no action. (v1, small)**
Overview shows `factory-base (building)` — add the action: *build template* button that
shells `e2b template build`, with the log streamed like any run.

**A12 · New-project experience is undefined. (v1)**
Selecting an unfinished project must show a setup checklist (the overview pre-work
cards with red ticks) and one primary action: *continue setup (start_prompt.md)* —
never an empty dashboard.

## B · UX improvements (smaller, all v1 unless noted)

- **Keyboard:** `g` then `1/2/3` jumps to a step, `/` opens quick-jump (features,
  files, cases). Escalation modals: `enter` = recommended option. (quick-jump: later)
- **Relative times everywhere** ("2 h ago") with absolute on hover.
- **Every entity shows its repo path** on hover/detail — reinforces repo-as-truth.
- **Empty states carry the next action**, never just "nothing here" (A12 generalized:
  empty backlog → "share the intake instructions with a PO"; empty escalations →
  "nothing needs you — the pipeline is flowing").
- **Toasts are verbs in past tense** matching the button ("merged", "approved",
  "committed") — already mostly true; make it a rule.
- **Mobile: the escalation views must work on a phone.** Approving a PR from the sofa
  is the killer feature of the whole console. Single-column layout for `Escalation to
  human` and the confirm modals; the rest of the console can stay desktop-first.
- **Color is never the only signal** — chips carry words, stations carry tooltips
  (done / running / waits for you / exception). Accessibility and print both.
- **Merge modal shows the diffstat + changed-file list** inline (from `gh pr view`) so
  routine merges don't require leaving the console. Full diff still opens GitHub.
- **Run rows link both ways** — from a run to its feature, from a feature drawer to
  its runs.

## C · Checked and deliberately unchanged

- **Finished = merged** (not observation-closed): boards should match the operator's
  mental model; regressions re-enter as new work. Post-PR QA status lives in the
  feature drawer instead.
- **.env stays locked out of the console** — including for "convenience".
- **No editing of started tasks** — scope changes go through the pipeline. The
  read-only modal explains why; that explanation stays.
- **One escalation queue per step, not one global inbox** — matches the future where
  different humans own different steps. The top-strip counter is the global view.
