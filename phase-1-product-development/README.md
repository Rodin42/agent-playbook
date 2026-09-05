# Phase 1 · Product Development

Decide *what* we build and *why*, on top of a known *substrate*. This is the phase
that keeps the team pointed in one direction before any code is written.

## Documents (source of truth)

| File | What it is | Owner |
| --- | --- | --- |
| [`substrate.md`](substrate.md) | The platform contract features must respect: stack, shared services, data model, non-negotiables. | `architect` + `deployment-strategist` |
| [`architecture.md`](architecture.md) | The living system architecture: components, boundaries, data flow, key decisions (ADRs). | `architect` |
| [`feature-plan.md`](feature-plan.md) | The prioritized backlog. Each entry is the seed of a Phase 2 feature folder. | `product-strategist` |

## Agents

The [`agents/`](agents/) folder holds the standing cast:

- **Human twin** — `rodin-twin` (self-authored; carries Rodin's judgment and sign-off).
- **AI roles** — `product-strategist`, `architect`, `test-strategist`,
  `deployment-strategist`, `ux-strategist` (specialist advisors).

## How Phase 1 runs

1. `substrate.md` is confirmed current (or updated) — nothing is planned against a stale foundation.
2. `product-strategist` proposes/updates entries in `feature-plan.md`, pulling from Phase 3 findings and stakeholder input.
3. The AI roles pressure-test each candidate against their lens; **`rodin-twin`** signs off.
4. A feature that clears the bar is marked **Ready** and handed to Phase 2.

## Definition of Ready (gate into Phase 2)

A feature-plan entry may enter Phase 2 only when:

- [ ] The problem and the user are stated (not just the solution).
- [ ] It respects `substrate.md`, or the exception is written down and signed off.
- [ ] Success is measurable (what we will observe in Phase 3 to know it worked).
- [ ] `rodin-twin` has signed off.
