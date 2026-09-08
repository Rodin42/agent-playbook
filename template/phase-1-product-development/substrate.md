---
id: substrate
kind: artifact
phase: 1
authority: sign-off
reads: []
writes: []
handoff_to: [architecture, feature-plan, architect]
---

# Substrate

> The foundation every feature is built on. If a feature wants to break something
> here, that is a deliberate decision that needs sign-off — not a default.
>
> Keep this **short, true, and current**. It is a contract, not documentation of
> everything. Owned by `architect` + `deployment-strategist`. Review at the start of
> every Phase 1 cycle.

_Last reviewed: `<yyyy-mm-dd>` · Reviewed by: `<twin/role>`_

## 1. Stack

The languages, frameworks, and runtimes we commit to. New work uses these unless an
exception is recorded below.

| Layer | Choice | Version / notes |
| --- | --- | --- |
| Frontend | `<...>` | |
| Backend / APIs | `<...>` | |
| Database | `<...>` | |
| Infra / hosting | `<...>` | |
| Auth | `<...>` | |

### Repo layout

What belongs where. Product code, the factory (`phase-*/`, `runtime/`,
`factory.config.yaml`), operator-supplied documents (`docs/`), and the `Makefile`
that holds the command contract (§6).

| Path | What belongs there |
| --- | --- |
| `<path>` | `<...>` |
| `docs/` | spec, mockups, references supplied by the operator or a PO |
| `Makefile` | the command contract (§6); CI calls these targets |

## 2. Shared services & building blocks

Things features consume rather than rebuild (auth, logging, feature flags, email,
job queue, file storage, payments, etc.). Point to where each lives.

- `<service>` — `<what it does / where it lives>`

## 3. Data model spine

The core entities and their relationships that features hang off. Not the full schema —
the load-bearing 20%.

- `<entity>` — `<one-line meaning + key relationships>`

## 4. Conventions

The defaults that keep the codebase coherent. Enforced in review.

- **Code style / linting:** `<...>`
- **API shape:** `<REST/GraphQL/RPC, error envelope, pagination, versioning>`
- **Naming:** `<...>`
- **Testing:** `<what must be tested, coverage expectations>`
- **Observability:** `<log format, trace IDs, metrics — see Phase 3>`
- **Secrets & config:** `<where they live, how they're injected>`

## 5. Non-negotiables (red lines)

Break these only with explicit sign-off, recorded as an ADR in `architecture.md`.

- `<e.g. no PII in logs>`
- `<e.g. all writes go through the service layer, never raw SQL in handlers>`
- `<e.g. every endpoint is authenticated by default>`

## 6. Commands

The feedback loop every agent runs. One command each; note what healthy output looks like.
"Run the full local check" in the pipeline roles means: **lint + typecheck + test + build, all green.**
Every command is a target in the root `Makefile` (so CI and agents call the same thing);
list the prerequisites a fresh machine needs (Docker, `uv`, `node`, …) under the table.

| Task | Command | Healthy output |
| --- | --- | --- |
| Install | `<...>` | |
| Build | `<...>` | |
| Lint | `<...>` | |
| Typecheck | `<...>` | |
| Test | `<...>` | |
| Run locally | `<...>` | |
| Full local check | `make check` | |

## 7. Known constraints & debt

Realities that shape what's feasible (rate limits, legacy systems, compliance,
performance budgets). Naming them here saves every feature from rediscovering them.

- `<...>`

## 8. Environments

What exists, and what agents may touch in each. "Does not exist yet" is a valid entry.

| Environment | Exists today | Agents may touch |
| --- | --- | --- |
| local | `<...>` | everything |
| CI | `<...>` | read-only; runs the full local check |
| staging | `<...>` | `<...>` |
| prod | `<...>` | never — data included |
