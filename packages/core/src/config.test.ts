import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deepMerge, loadEffectiveConfig, readSecretsPresence } from "./config.js";

function project(config: string, defaults: string, env?: string): string {
  const dir = mkdtempSync(join(tmpdir(), "factory-core-"));
  mkdirSync(join(dir, "runtime"));
  writeFileSync(join(dir, "factory.config.yaml"), config);
  writeFileSync(join(dir, "runtime", "factory.defaults.yaml"), defaults);
  if (env !== undefined) writeFileSync(join(dir, ".env"), env);
  return dir;
}

const DEFAULTS = `sandbox:\n  provider: e2b\n  e2b: { template: factory-base, timeout_minutes: 30, kill_on_done: true }\nharness:\n  provider: claude-code\nmodels:\n  default: { provider: anthropic, model: haiku }\n  roles: {}\n`;

describe("effective config (runtime-plan §2 layering)", () => {
  it("project overrides defaults key by key", () => {
    const dir = project(`project:\n  name: demo\n  repo: git@github.com:Rodin42/demo.git\nmodels:\n  roles:\n    implementer: { provider: anthropic, model: sonnet }\n`, DEFAULTS);
    const cfg = loadEffectiveConfig(dir);
    expect(cfg.project.name).toBe("demo");
    expect(cfg.harness.provider).toBe("claude-code");
    expect(cfg.sandbox.template).toBe("factory-base");
    expect(cfg.models.default.model).toBe("haiku");
    expect(cfg.models.roles).toEqual([{ role: "implementer", provider: "anthropic", model: "sonnet" }]);
    expect(cfg.placeholder).toBe(false);
  });

  it("flags template placeholders", () => {
    const cfg = loadEffectiveConfig(project(`project:\n  name: "<project-name>"\n  repo: "<git remote url>"\n`, DEFAULTS));
    expect(cfg.placeholder).toBe(true);
  });

  it("deepMerge does not mutate and merges nested objects", () => {
    const a = { x: { y: 1, z: 2 }, k: 1 };
    const b = deepMerge(a, { x: { y: 9 } });
    expect(b).toEqual({ x: { y: 9, z: 2 }, k: 1 });
    expect(a.x.y).toBe(1);
  });
});

describe("secrets presence (BUILD-PLAN §0 rule 2)", () => {
  it("reports set / not set and never a value", () => {
    const dir = project(`project:\n  name: demo\n  repo: r\n`, DEFAULTS, `CLAUDE_CODE_OAUTH_TOKEN=sk-ant-oat01-SECRETVALUE\nE2B_API_KEY=""\n# GITHUB_TOKEN=\nexport ANTHROPIC_API_KEY='sk-ant-api03-ALSOSECRET'\n`);
    const s = readSecretsPresence(dir, loadEffectiveConfig(dir));
    expect(s.file).toBe(true);
    const by = Object.fromEntries(s.keys.map((k) => [k.name, k]));
    expect(by.CLAUDE_CODE_OAUTH_TOKEN?.set).toBe(true);
    expect(by.E2B_API_KEY?.set).toBe(false);
    expect(by.GITHUB_TOKEN?.set).toBe(false);
    expect(by.ANTHROPIC_API_KEY?.set).toBe(true);
    expect(by.ANTHROPIC_API_KEY?.required).toBe(false);
    expect(JSON.stringify(s)).not.toContain("SECRET");
  });

  it("missing .env is file:false with every key unset", () => {
    const dir = project(`project:\n  name: demo\n  repo: r\n`, DEFAULTS);
    const s = readSecretsPresence(dir, loadEffectiveConfig(dir));
    expect(s.file).toBe(false);
    expect(s.keys.every((k) => !k.set)).toBe(true);
  });
});
