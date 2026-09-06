---
id: feature-plan
kind: artifact
phase: 1
authority: gate
reads: [substrate.md, architecture.md]
writes: []
handoff_to: [senior-developer, product-strategist]
---

# Feature Plan

> The prioritized backlog. Every entry that reaches **Ready** becomes a Phase 2 feature
> folder. Owned by `product-strategist`; scored with the AI roles; gated by `rodin-twin`.

## Backlog

| ID | Feature | Problem it solves | Priority | Status | Feature folder |
| --- | --- | --- | --- | --- | --- |
| F-001 | `project skeleton + auth` | nothing exists yet; nobody can log in | P0 | Shipped | `features/project-skeleton-auth/` |
| F-002 | `booking core` | bookings live in a spreadsheet; double bookings | P0 | Shipped | `features/booking-core/` |
| F-003 | `user roles & permissions` | everyone can edit everything | P1 | Shipped | `features/user-roles/` |
| F-004 | `booking calendar` | no shared view of who booked what | P1 | In progress | `features/booking-calendar/` |
| F-005 | `vipps login` | customers want national-id login | P1 | In progress | `features/vipps-login/` |
| F-006 | `e-mail notify` | users miss changes; notify by e-mail | P2 | In progress | `features/email-notify/` |
| F-007 | `changelog page` | users forget which features shipped | P2 | Shaping | `features/changelog-page/` |
| F-008 | `export bookings to excel` | finance re-types booking data monthly | P2 | Idea | `features/export-bookings-excel/` |
| F-009 | `faster search` | "search feels slow" — no metric yet | P3 | Idea | `features/faster-search/` |
| F-010 | `reminder e-mails, phase 2` | reminder sends bounce at 14% | P2 | Idea | `features/reminder-emails-2/` |
| F-011 | `document the /workers queue consumer` | architecture.md doesn't know it exists | P3 | Idea | `features/workers-consumer-docs/` |

**Status legend:** `Idea` → `Shaping` → `Ready` (passes Definition of Ready) →
`In progress` (Phase 2) → `Shipped` → `Observing` (Phase 3).

## Entries

### F-001 · `project skeleton + auth`
- **PO (owner):** operator
- **Problem / user:** Nothing exists; nobody can log in.
- **Hypothesis:** we believe a skeleton with magic-link auth will let the first office manager in.
- **Success metric:** first real login.
- **Scope:** in: repo, CI, magic link · out: Vipps
- **Depends on:** —
- **Shared work needed:** —
- **Substrate impact:** defines the substrate
- **Priority & why:** P0 — everything depends on it
- **Answered in advance:** out of scope: Vipps; constraint: boring stack; v1: magic link only
- **Open questions → PO:** —
- **Sign-off:** rodin-twin — 2026-08-10
- **Source:** operator

### F-002 · `booking core`
- **PO (owner):** Marta K. — marta@example.com
- **Problem / user:** Bookings live in a spreadsheet; double bookings weekly.
- **Hypothesis:** we believe an overlap-checked booking model will end double bookings for office managers.
- **Success metric:** zero double bookings after 30 days.
- **Scope:** in: create/cancel, overlap rule · out: calendar view
- **Depends on:** F-001
- **Shared work needed:** —
- **Substrate impact:** respects `substrate.md`
- **Priority & why:** P0 — the product
- **Answered in advance:** out of scope: calendar; constraint: overlap rule is absolute; v1: list view
- **Open questions → PO:** —
- **Sign-off:** rodin-twin — 2026-08-15
- **Source:** stakeholder

### F-003 · `user roles & permissions`
- **PO (owner):** Jonas B. — jonas@example.com
- **Problem / user:** Everyone can edit everything.
- **Hypothesis:** we believe admin/booker roles will stop accidental edits for all users.
- **Success metric:** accidental-edit tickets −80%.
- **Scope:** in: admin, booker · out: custom roles
- **Depends on:** F-001
- **Shared work needed:** —
- **Substrate impact:** respects `substrate.md`
- **Priority & why:** P1 — trust
- **Answered in advance:** out of scope: custom roles; constraint: every endpoint authenticated; v1: two roles
- **Open questions → PO:** —
- **Sign-off:** rodin-twin — 2026-08-22
- **Source:** stakeholder

### F-004 · `booking calendar`
- **PO (owner):** Marta K. — marta@example.com
- **Problem / user:** Office managers cannot see who booked what across teams; they keep a parallel spreadsheet.
- **Hypothesis:** we believe a shared calendar view will cause the parallel spreadsheet to disappear for office managers.
- **Success metric:** spreadsheet exports drop to zero within a month of shipping.
- **Scope:** in: week/day view, per-resource filter · out: recurring bookings, external calendar sync
- **Depends on:** F-002
- **Shared work needed:** calendar component (also needed by F-008)
- **Substrate impact:** respects `substrate.md`
- **Priority & why:** P1 — the most-asked-for view; unblocks F-008
- **Answered in advance:** out of scope: recurring bookings; constraint: must work on a phone; v1 good enough: read-only calendar with a filter
- **Open questions → PO:** —
- **Sign-off:** rodin-twin — 2026-08-30
- **Source:** stakeholder

### F-005 · `vipps login`
- **PO (owner):** Jonas B. — jonas@example.com
- **Problem / user:** Customers expect national-id login; passwords are the top support ticket.
- **Hypothesis:** we believe Vipps login will cause password tickets to halve for all users.
- **Success metric:** "forgot password" tickets −50% in 30 days.
- **Scope:** in: Vipps OIDC login + account linking · out: BankID, social logins
- **Depends on:** F-001
- **Shared work needed:** —
- **Substrate impact:** respects `substrate.md` (auth layer already lists Vipps)
- **Priority & why:** P1 — support load and market expectation
- **Answered in advance:** out of scope: BankID; constraint: Vipps sandbox rate limit; v1 good enough: login only, no profile sync
- **Open questions → PO:** —
- **Sign-off:** rodin-twin — 2026-09-02
- **Source:** stakeholder

### F-006 · `e-mail notify`
- **PO (owner):** Marta K. — marta@example.com
- **Problem / user:** Users miss booking changes made by others.
- **Hypothesis:** we believe e-mail on change will cause fewer missed handovers for bookers.
- **Success metric:** "I didn't know" support tickets −30%.
- **Scope:** in: change/cancel notifications · out: digests, SMS
- **Depends on:** F-002
- **Shared work needed:** mailer (exists)
- **Substrate impact:** wants a new dependency (nodemailer) — ADR-0007 proposed
- **Priority & why:** P2 — valuable, but touches a red line
- **Answered in advance:** out of scope: digests; constraint: no PII in logs; v1 good enough: plain-text e-mail
- **Open questions → PO:** —
- **Sign-off:** rodin-twin — 2026-09-03
- **Source:** stakeholder

### F-007 · `changelog page`
- **PO (owner):** Marta K. — marta@example.com
- **Problem / user:** Support spends time answering "did you ship X?" and users don't discover recently-added features because there is no single source of truth.
- **Hypothesis:** publishing a visible, regularly-updated changelog will reduce support churn on "what's new" questions and increase organic feature discovery.
- **Success metric:** support tickets mentioning "what's new / did you ship" drop by the agreed target; month-over-month adoption of recent releases rises.
- **Scope:** in: chronological list of shipped features with dates, one-line description, link into the product · out: technical release notes, commit diffs, version numbers, roadmap, screenshots
- **Depends on:** —
- **Shared work needed:** assumes the release list is generated from merged PRs
- **Substrate impact:** respects `substrate.md`
- **Priority & why:** P1 — reduces support volume with minimal effort
- **Answered in advance:** out of scope: technical release notes and roadmap; constraint: freshness (auto-update on release); v1 good enough: a static page rebuilt on merge
- **Open questions → PO:** —
- **Sign-off:** rodin-twin — 2026-09-05 (intake twin-checked)
- **Source:** stakeholder — drafted headless by product-strategist, 2026-09-05

### F-008 · `export bookings to excel`
- **PO (owner):** Jonas B. — jonas@example.com
- **Problem / user:** Finance re-types booking data into a spreadsheet monthly.
- **Hypothesis:** we believe a one-click export will save finance a day a month.
- **Success metric:** export used monthly by every org.
- **Scope:** in: xlsx of bookings for a period · out: scheduled exports
- **Depends on:** F-004
- **Shared work needed:** calendar component (with F-004)
- **Substrate impact:** respects `substrate.md`
- **Priority & why:** P2 — clear time saving
- **Answered in advance:** out of scope: scheduled exports
- **Open questions → PO:**  1. Which columns does finance actually need?
  2. Per org or across orgs for the admin?
- **Sign-off:** rodin-twin — pending
- **Source:** stakeholder

### F-009 · `faster search`
- **PO (owner):** Marta K. — marta@example.com
- **Problem / user:** "Search feels slow" — no metric, no segment yet.
- **Hypothesis:** —
- **Success metric:** —
- **Scope:** —
- **Depends on:** —
- **Shared work needed:** —
- **Substrate impact:** respects `substrate.md`
- **Priority & why:** P3 — unquantified
- **Answered in advance:** [PO to fill]
- **Open questions → PO:**  1. Slow for whom — which org sizes?
  2. What is slow: the first load or typing?
  3. What would fast feel like — a number?
- **Sign-off:** rodin-twin — pending
- **Source:** stakeholder

### F-010 · `reminder e-mails, phase 2`
- **PO (owner):** step 3
- **Problem / user:** Log analysis found 14% bounce on reminder sends; customers miss reminders.
- **Hypothesis:** we believe validating recipient addresses at booking time will cut bounce below 2% for bookers.
- **Success metric:** reminder bounce rate < 2%.
- **Scope:** in: address validation + retry policy · out: new e-mail provider
- **Depends on:** F-006
- **Shared work needed:** mailer
- **Substrate impact:** touches outbound e-mail to all customers — high-stakes
- **Priority & why:** P2 — bad, but not bleeding
- **Answered in advance:** out of scope: provider change; constraint: no PII in logs
- **Open questions → PO:** —
- **Sign-off:** rodin-twin — escalated (high-stakes intake)
- **Source:** Phase 3 finding — log-analysis, 2026-09-01

### F-011 · `document the /workers queue consumer`
- **PO (owner):** step 3
- **Problem / user:** `architecture.md` doesn't know the `/workers` consumer exists; drift.
- **Hypothesis:** we believe documenting it will stop features re-implementing the consumer.
- **Success metric:** architecture.md component table lists it.
- **Scope:** in: doc + ADR · out: refactor
- **Depends on:** —
- **Shared work needed:** —
- **Substrate impact:** respects `substrate.md`
- **Priority & why:** P3 — hygiene
- **Answered in advance:** [PO to fill]
- **Open questions → PO:** —
- **Sign-off:** rodin-twin — pending
- **Source:** Phase 3 finding — github-diff-report, 2026-09-01

## Prioritization

Score **Impact**, **Confidence**, and **Effort** (1–5 each); rank by
`Impact × Confidence ÷ Effort`. Ties broken by the `product-strategist`, contested calls
escalated to Rodin.
