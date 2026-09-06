import { join } from "node:path";
import { load as yamlLoad } from "js-yaml";
import { exists, hasPlaceholder, readText, str } from "./fs.js";
import type { EffectiveConfig, RoleModel, SecretKey, Secrets } from "./types.js";

type Obj = Record<string, unknown>;

function loadYaml(p: string): Obj | null {
  const t = readText(p);
  if (t === null) return null;
  try {
    const d = yamlLoad(t);
    return d && typeof d === "object" ? (d as Obj) : {};
  } catch {
    return {};
  }
}

/** key-by-key deep merge: project config overrides defaults (runtime-plan §2) */
export function deepMerge(base: Obj, over: Obj): Obj {
  const out: Obj = { ...base };
  for (const [k, v] of Object.entries(over)) {
    const b = out[k];
    if (v && typeof v === "object" && !Array.isArray(v) && b && typeof b === "object" && !Array.isArray(b)) {
      out[k] = deepMerge(b as Obj, v as Obj);
    } else if (v !== undefined) {
      out[k] = v;
    }
  }
  return out;
}

const get = (o: unknown, ...path: string[]): unknown =>
  path.reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Obj)[k] : undefined), o);

export function loadEffectiveConfig(projectPath: string): EffectiveConfig {
  const defaultsPath = join(projectPath, "runtime", "factory.defaults.yaml");
  const configPath = join(projectPath, "factory.config.yaml");
  const defaults = loadYaml(defaultsPath);
  const project = loadYaml(configPath);
  const merged = deepMerge(defaults ?? {}, project ?? {});

  const roles: RoleModel[] = [];
  const rolesObj = get(merged, "models", "roles");
  if (rolesObj && typeof rolesObj === "object") {
    for (const [role, v] of Object.entries(rolesObj as Obj)) {
      roles.push({
        role,
        provider: str(get(v, "provider")) ?? "anthropic",
        model: str(get(v, "model")) ?? "haiku",
      });
    }
  }
  const name = str(get(merged, "project", "name")) ?? "";
  const repo = str(get(merged, "project", "repo")) ?? "";
  const sandboxProvider = str(get(merged, "sandbox", "provider")) ?? "e2b";
  const notifyKind = str(get(merged, "console", "notify", "kind")) ?? "none";

  return {
    project: { name, repo, main_branch: str(get(merged, "project", "main_branch")) ?? "main" },
    sandbox: {
      provider: sandboxProvider,
      template: str(get(merged, "sandbox", sandboxProvider, "template")),
      timeout_minutes: numOrNull(get(merged, "sandbox", sandboxProvider, "timeout_minutes")),
      kill_on_done: boolOrNull(get(merged, "sandbox", sandboxProvider, "kill_on_done")),
    },
    harness: { provider: str(get(merged, "harness", "provider")) ?? "claude-code" },
    models: {
      default: {
        provider: str(get(merged, "models", "default", "provider")) ?? "anthropic",
        model: str(get(merged, "models", "default", "model")) ?? "haiku",
      },
      roles,
    },
    console: {
      run_mode: str(get(merged, "console", "run_mode")) ?? "manual",
      paused: boolOrNull(get(merged, "console", "paused")) ?? false,
      max_concurrent_sandboxes: numOrNull(get(merged, "console", "max_concurrent_sandboxes")) ?? 2,
      budget_monthly_usd: numOrNull(get(merged, "console", "budget_monthly_usd")),
      notify: { kind: notifyKind, url: str(get(merged, "console", "notify", "url")) ?? "" },
    },
    placeholder: hasPlaceholder(name) || hasPlaceholder(repo) || name === "",
    files: { config: project !== null, defaults: defaults !== null },
  };
}

function numOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function boolOrNull(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

/** Which env keys the project needs, given its effective config. Names only. */
export function requiredSecretKeys(cfg: EffectiveConfig): SecretKey[] {
  const keys: SecretKey[] = [];
  if (cfg.harness.provider === "claude-code") {
    keys.push({ name: "CLAUDE_CODE_OAUTH_TOKEN", set: false, required: true, note: "Max subscription token for claude-code" });
  } else {
    keys.push({ name: "ANTHROPIC_API_KEY", set: false, required: true, note: "API key for the pi harness" });
  }
  if (cfg.sandbox.provider === "e2b") keys.push({ name: "E2B_API_KEY", set: false, required: true, note: "e2b sandboxes" });
  keys.push({ name: "GITHUB_TOKEN", set: false, required: true, note: "sandbox pushes + PRs, never merges" });
  keys.push({
    name: cfg.harness.provider === "claude-code" ? "ANTHROPIC_API_KEY" : "CLAUDE_CODE_OAUTH_TOKEN",
    set: false,
    required: false,
    note: cfg.harness.provider === "claude-code" ? "only for pi — must not be set together with the OAuth token" : "only for claude-code",
  });
  return keys;
}

/**
 * Presence-only read of `.env`: which names have a non-empty value.
 * Values are read into a local and dropped; they are never returned or logged.
 */
export function readSecretsPresence(projectPath: string, cfg: EffectiveConfig): Secrets {
  const envPath = join(projectPath, ".env");
  const keys = requiredSecretKeys(cfg);
  if (!exists(envPath)) return { file: false, keys };
  const present = new Set<string>();
  for (const line of (readText(envPath) ?? "").split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    const value = (m[2] ?? "").trim().replace(/^["']|["']$/g, "");
    if (value.length > 0) present.add(m[1] as string);
  }
  return { file: true, keys: keys.map((k) => ({ ...k, set: present.has(k.name) })) };
}
