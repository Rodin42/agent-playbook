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

_Last reviewed: 2026-09-01 · Reviewed by: rodin-twin_

## 1. Stack
| Layer | Choice | Version / notes |
| --- | --- | --- |
| Frontend | SvelteKit | 2.x |
| Backend / APIs | Node 22 + Hono | REST, JSON |
| Database | Postgres 16 | via Drizzle |
| Infra / hosting | Fly.io | eu-north |
| Auth | Vipps login (OIDC) + magic link | |

## 2. Shared services & building blocks
- `mailer` — transactional e-mail, `packages/mailer`
- `queue` — pg-boss job queue, `packages/queue`
- `flags` — feature flags in `config/flags.yaml`

## 3. Data model spine
- `Org` — a customer firm; owns everything below
- `Resource` — a bookable thing (room, car, person); belongs to an Org
- `Booking` — a Resource × time range × User; no overlaps per Resource

## 4. Conventions
- **Code style / linting:** eslint + prettier, CI-enforced
- **API shape:** REST, `{ data, error }` envelope, cursor pagination
- **Naming:** kebab-case files, camelCase symbols
- **Testing:** unit for domain rules, integration per endpoint, one e2e per journey
- **Observability:** pino JSON logs with request ids; metrics to Fly
- **Secrets & config:** `.env` locally, Fly secrets in prod; never in code

## 5. Non-negotiables (red lines)
- No new dependency without an ADR.
- No PII in logs.
- Every endpoint authenticated by default.
- No merge with red CI.

## 6. Commands
| Task | Command | Healthy output |
| --- | --- | --- |
| Install | `npm ci` | no audit errors |
| Build | `npm run build` | `dist/` written |
| Lint | `npm run lint` | 0 problems |
| Typecheck | `npm run typecheck` | 0 errors |
| Test | `npm test` | 148 passed |
| Run locally | `npm run dev` | http://localhost:5173 |

## 7. Known constraints & debt
- Vipps sandbox rate-limits to 10 logins/min.
- The `/workers` queue consumer predates `architecture.md` and is undocumented (Phase 3 finding).
