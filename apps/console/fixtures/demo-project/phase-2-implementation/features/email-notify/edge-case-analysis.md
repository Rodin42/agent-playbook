---
id: edge-case-analysis
kind: artifact
phase: 2
feature: "email-notify"
plan_ref: "F-006"
authors: [test-strategist, ux-strategist]
status: final
---

# Edge-Case Analysis — `e-mail notify`

> Attack the happy path before the code exists. This doc also defines the **acceptance
> criteria** that `pre-pull-request-qa` will verify.

## Happy path
The intended flow in a few steps — the thing everything below tries to break.

## Failure modes & edge cases
Rank by likelihood × blast radius. Attack systematically.

| # | Case | Trigger | Expected handling | Likelihood | Impact | Test level |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `<empty / null input>` | | | | | unit |
| 2 | `<boundary: 0, max, huge>` | | | | | unit |
| 3 | `<concurrent / retried>` | | | | | integration |
| 4 | `<unauthorized / wrong tenant>` | | | | | integration |
| 5 | `<dependency down mid-op>` | | | | | integration |
| 6 | `<malformed / hostile input>` | | | | | unit |
| 7 | `<UX: confusing / dead-end state>` | | | | | e2e |

## Acceptance criteria
Observable, unambiguous. `pre-pull-request-qa` checks these; no "works correctly."
- [ ] `<given ... when ... then ...>`
- [ ] `<...>`

## Accepted risks (won't handle now)
What we deliberately leave unhandled, and why it's acceptable.
- `<...>` — _accepted by:_ `rodin-twin`

## Test plan summary
What's unit vs integration vs e2e, and what "green" means for this feature.
