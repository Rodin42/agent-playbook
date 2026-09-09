import { describe, expect, it } from "vitest";
import { parseDotEnv } from "./env.js";
import { claudeCode } from "./harness.js";
import { primaryWrite, resolveRef, toHttpsRepo } from "./paths.js";
import { composePrompt, defaultInstruction } from "./prompt.js";
import { verifyArtifact } from "./verify.js";

describe("paths", () => {
  it("resolves bare names to phase-1 and features to phase-2", () => {
    expect(resolveRef("substrate.md", "x")?.path).toBe("phase-1-product-development/substrate.md");
    expect(resolveRef("features/<slug>/brainstorming.md", "ingest-folder")?.path).toBe("phase-2-implementation/features/ingest-folder/brainstorming.md");
    expect(resolveRef("features/<slug>/*", "s")).toEqual({ path: "phase-2-implementation/features/s", section: null, glob: true });
    expect(resolveRef("features/<slug>/implementation.md#review", "s")?.section).toBe("review");
    expect(resolveRef("<source code>", "s")).toBeNull();
  });
  it("picks the feature artifact as primary write", () => {
    expect(primaryWrite(["feature-plan.md", "features/<slug>/brainstorming.md"], "s")?.path).toBe("phase-2-implementation/features/s/brainstorming.md");
    expect(primaryWrite(["<pull request>"], "s")).toBeNull();
  });
  it("converts ssh remotes to https", () => {
    expect(toHttpsRepo("git@github.com:jbr-one/data-pipeline.git")).toBe("https://github.com/jbr-one/data-pipeline.git");
    expect(toHttpsRepo("https://github.com/a/b")).toBe("https://github.com/a/b.git");
  });
});

describe("env", () => {
  it("parses KEY=value with quotes and comments", () => {
    expect(parseDotEnv('# c\nA=1\nB="two"\nC=\n\nD=\'x=y\'')).toEqual({ A: "1", B: "two", D: "x=y" });
  });
});

describe("harness claude-code", () => {
  it("parses the json envelope and sums input tokens", () => {
    const out = 'noise\n{"result":"FACTORY-DONE x","total_cost_usd":0.01,"usage":{"input_tokens":5,"cache_read_input_tokens":10,"output_tokens":3},"is_error":false}';
    const r = claudeCode.parse(out);
    expect(r).toMatchObject({ text: "FACTORY-DONE x", costUsd: 0.01, tokensIn: 15, tokensOut: 3, isError: false, parseError: null });
  });
  it("flags non-json output as an error, never a success", () => {
    expect(claudeCode.parse("Not logged in").isError).toBe(true);
  });
  it("reads the prompt from a file and skips permissions", () => {
    expect(claudeCode.command("haiku", "/p.md")).toContain("--dangerously-skip-permissions < /p.md");
  });
});

describe("verify", () => {
  const ref = { path: "phase-2-implementation/features/s/brainstorming.md", section: null, glob: false };
  const good = "---\nid: brainstorming\nfeature: s\nstatus: in-review\n---\n\n# B\n";
  it("accepts a changed, valid artifact", () => expect(verifyArtifact(ref, "---\nstatus: draft\n---\n", good).ok).toBe(true));
  it("rejects missing, unchanged, bad status, placeholders", () => {
    expect(verifyArtifact(ref, null, null).reason).toMatch(/not written/);
    expect(verifyArtifact(ref, good, good).reason).toMatch(/unchanged/);
    expect(verifyArtifact(ref, null, good.replace("in-review", "done")).reason).toMatch(/status/);
    expect(verifyArtifact(ref, null, good.replace("feature: s", "feature: <feature-slug>")).reason).toMatch(/placeholders/);
  });
  it("requires the section for #anchored writes", () => {
    expect(verifyArtifact({ ...ref, section: "review" }, null, good).reason).toMatch(/section/);
    expect(verifyArtifact({ ...ref, section: "review" }, null, `${good}\n## Review\nok\n`).ok).toBe(true);
  });
});

describe("prompt", () => {
  it("carries instruction, role doc and inputs in order", () => {
    const p = composePrompt({ role: "r", roleDoc: "ROLE", slug: "s", reads: [{ path: "a.md", text: "A" }], writes: [], instruction: defaultInstruction("r", "s", [{ path: "x.md", section: null, glob: false }]) });
    expect(p.indexOf("You are the `r` role")).toBeLessThan(p.indexOf("ROLE DOC"));
    expect(p.indexOf("ROLE")).toBeLessThan(p.indexOf("INPUT — a.md"));
    expect(p).toContain("- `x.md`");
  });
});
