# Runtime Plan — Sandbox, Harness, Model, Config, Frontend

How the factory *executes*: agents run in disposable sandboxes, driven by a slim harness,
against configurable models — all behind three swappable ports, with every
project-specific fact in config. Template defaults: **e2b + claude-code + Anthropic**. Everything
replaceable by editing config, nothing by editing code.

---

## 0 · The Claude Max reality check (read first)

The original idea — pass the Claude Max account token into pi — does not work
legitimately, and since spring 2026 barely works at all:

- Anthropic's terms restrict subscription OAuth to native Anthropic applications and
  prohibit routing requests through Pro/Max credentials from third-party tools.
- This is enforced **server-side**: since 2026-04-04, third-party harnesses
  authenticating with a subscription token get their usage billed as per-token
  "extra usage" rather than plan limits — so it doesn't even save money.
- Pi's built-in Anthropic provider follows the policy. Community extensions exist that
  spoof the Claude Code wire fingerprint to sneak subscription traffic through; they
  advertise themselves as "prepared to lose the account" territory. **The factory will
  not wire these in.** The runtime treats credentials as config, so what you plug in
  privately is your call — but the template ships the legitimate paths only.

**Legitimate ways to get what you actually want (Claude quality, low cost):**

| Path | How | Cost profile |
| --- | --- | --- |
| **A · Anthropic API key in pi** (the switch target) | Key from console.anthropic.com in `.env`; pi's native provider | Pay per token, prompt caching, and — the real lever — **cheap models for cheap roles** (Haiku for QA checks, Sonnet for implementation, Opus only where judgment matters) |
| **B · Claude Code as harness** (adapter — template default) | The harness port has a `claude-code` adapter: run `claude -p` in the sandbox, authenticated with your Max plan — the client the plan is *for* | Uses the subscription. Note: headless/SDK subscription usage reportedly draws from a separate monthly credit pool since mid-2026 — verify against your plan before relying on it for volume |
| **C · Any other provider in pi** | pi is multi-provider by design: OpenAI, Google, OpenRouter, and any OpenAI/Anthropic-compatible endpoint incl. local models via `models.json` | Route bulk work to cheap/local models; this is also your "other LLMs later" requirement, already solved |

**Chosen starting configuration (Rodin, 2026-09-05):** start with **B — the
claude-code harness on the Max subscription** (`claude -p`), accepting per-token extra
usage if plan/credit limits are hit. This is the legitimate client for the plan and the
fastest path to a running factory. pi is installed alongside from day one so that
switching to A or C is **one config edit**, not a migration. Revisit the default once
real per-feature costs are known.

---

## 1 · Architecture — three ports, one thin orchestrator

```
factory CLI (thin TypeScript orchestrator, runs on your machine)
 │  reads factory.config.yaml + .env
 │
 ├── SandboxPort   — where agents run
 │     e2b (default) · local-docker (planned) · anything with create/exec/files/destroy
 ├── HarnessPort   — what drives the agent loop
 │     claude-code (default, headless `claude -p`) · pi (`pi -p`) 
 └── ModelPort     — which LLM answers
       delegated to pi's provider layer; factory config picks provider+model PER ROLE
```

**Run shape (one pipeline step):**
1. Orchestrator creates a sandbox from the factory template (claude-code + pi + git + toolchain
   preinstalled), injects secrets as env vars — never written to disk in the repo.
2. Clones the project repo at the feature branch into the sandbox.
3. Composes the prompt: role doc + the role's `reads:` files + the step instruction.
4. Runs the harness headless via the configured `HarnessPort` adapter, which builds the
   command from `harness.provider` and the role entry in `models`; streams the log back.
5. Collects the artifact(s) the role wrote, commits on the feature branch **and pushes
   to origin (GitHub)** — an unpushed commit exists only inside a disposable sandbox,
   so push-after-commit is what makes the trail durable. Then destroys the sandbox.
   Fresh sandbox per step = the fresh-context rule, physically enforced.
6. Marks the run `ok` only if the role's `writes:` artifact exists, parses, and its
   `status:` advanced — **never from the exit code**: verified 2026-09-06, `claude -p`
   exits 0 on authentication failure.

The orchestrator stays *thin* on purpose: sandbox lifecycle, prompt assembly, log
capture, commit. All intelligence lives in the playbook docs; all judgment in the gates
and the operator. No framework.

## 2 · Configuration — template vs project vs secrets

Three layers, strictly separated:

| File | Contains | Committed? |
| --- | --- | --- |
| `runtime/factory.defaults.yaml` | Template defaults: e2b + claude-code + Anthropic, role→model tiers, timeouts | yes (in template) |
| `factory.config.yaml` | **Everything project-specific**: repo, branch rules, sandbox template id, model overrides, command names — generated/filled by `start_prompt.md` Stage 3 | yes (per project) |
| `.env` | **All secrets**: `E2B_API_KEY`, `ANTHROPIC_API_KEY`, others | **never** (gitignored; `.env.example` committed) |

Sketch of `factory.config.yaml`:

```yaml
project:
  name: my-product
  repo: git@github.com:rodin/my-product.git
  main_branch: main

sandbox:
  provider: e2b                # ← swap point 1
  e2b:
    template: factory-base     # built once: claude-code + pi + git + node/python toolchain
    timeout_minutes: 30

harness:
  provider: claude-code        # ← swap point 2 · STARTING CHOICE (Max subscription)
                               #   switch to `pi` any time — nothing else changes

models:                        # ← swap point 3 — per-role model tiers
  # harness = claude-code → `model:` maps to `claude -p --model …` (provider ignored)
  # harness = pi          → provider+model map to pi's multi-provider layer
  default:      { provider: anthropic, model: sonnet }
  roles:
    implementer:            { provider: anthropic, model: sonnet }
    adversarial-reviewer:   { provider: anthropic, model: opus }
    pre-pull-request-qa:    { provider: anthropic, model: haiku }
  # after switching harness to pi, the same block takes any pi provider per role:
  #   { provider: openrouter, model: google/gemini-… } · local models via models.json
```

Rule: if a value would differ between two projects cloning this template, it lives in
`factory.config.yaml`. If it's a secret, it lives in `.env`. The playbook itself stays
identical across clones.

## 3 · Frontend — configure & monitor (later phase, designed now)

A small local web dashboard (`factory ui`), no cloud, no accounts:

- **Configure**: form-edit `factory.config.yaml` (validated against a schema); secrets
  status shown as present/missing, values never displayed.
- **Monitor**: the pipeline board — every feature folder's stage (from artifact
  status fields), live run logs streamed from the sandbox, gate verdicts, twin flags
  and open PO questions surfaced as an inbox.
- Architecture: tiny Node server (reads repo + run logs, writes config) + static
  single-page UI. The repo remains the single source of truth — the dashboard renders
  it, never owns it.

## 4 · Build phases

| Phase | Deliverable | Proves |
| --- | --- | --- |
| **A · Local harness** | claude-code verified headless (`claude -p`) as the working harness; pi installed + smoke-tested beside it as the ready switch target; run one playbook role headless against a scratch repo | Prompt-assembly works; the harness swap is one config line |
| **B · Sandbox runtime** | e2b `factory-base` template (claude-code + pi + git + toolchain preinstalled); orchestrator v0: `factory run <role> <feature>` = sandbox → clone → run → commit → destroy | The factory runs off your machine, fresh context per step |
| **C · Pipeline wiring** | `factory feature <slug>`: sequenced steps with gate verdict parsing, stop-on-flag; secrets injection; run logs stored per feature | A whole feature can travel unattended to PR-ready |
| **D · Frontend** | `factory ui` dashboard (configure + monitor) | You can see and steer without reading raw folders |
| **E · Swap proofs** | `local-docker` sandbox adapter + one non-Anthropic model in a role + `claude-code` harness adapter | The three ports are real; nothing is welded to e2b or one vendor |

Phase A is a console session away — the setup commands are in the chat message
accompanying this plan. B needs an e2b account + API key.
