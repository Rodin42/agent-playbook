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

import { parseSteps, verifyStep } from "./steps.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const STEPS = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../../template/runtime/steps.yaml"), "utf8");
const doc = (status: string, extra = "") => `---\nid: x\nfeature: s\nplan_ref: F-001\nstatus: ${status}\n${extra}---\n\n# X\nbody\n`;

describe("steps contract", () => {
  it("resolves the product-strategist target to the feature folder", () => {
    const st = parseSteps(STEPS, "product-strategist", "s");
    expect(st?.targets[0]?.ref.path).toBe("phase-2-implementation/features/s/brainstorming.md");
    expect(st?.targets[0]?.status).toBe("in-review");
  });
  it("passes when the target reaches the expected status and changed", () => {
    const st = parseSteps(STEPS, "product-strategist", "s")!;
    const p = st.targets[0]!.ref.path;
    const v = verifyStep(st, new Map([[p, doc("draft")]]), new Map([[p, doc("in-review")]]));
    expect(v.ok).toBe(true);
  });
  it("fails on wrong status, unchanged second pass, missing file", () => {
    const ps = parseSteps(STEPS, "product-strategist", "s")!;
    const p = ps.targets[0]!.ref.path;
    expect(verifyStep(ps, new Map([[p, doc("draft")]]), new Map([[p, doc("draft")]])).reason).toMatch(/expected "in-review"/);
    const ux = parseSteps(STEPS, "ux-strategist", "s")!;
    const [b, o] = ux.targets.map((t) => t.ref.path) as [string, string];
    const same = doc("in-review");
    expect(verifyStep(ux, new Map([[b, same], [o, null]]), new Map([[b, same], [o, doc("in-review")]])).reason).toMatch(/second pass/);
    expect(verifyStep(ux, new Map([[b, same]]), new Map([[b, same + "more\n"]])).reason).toMatch(/not written/);
  });
  it("gates need a literal verdict line and the matching status", () => {
    const st = parseSteps(STEPS, "adversarial-reviewer", "s")!;
    const p = st.targets[0]!.ref.path;
    const impl = (status: string, verdict: string) => `---\nid: implementation\nfeature: s\nplan_ref: F-001\nstatus: ${status}\n---\n\n## What was built\nx\n\n## Adversarial review\nfindings\n\n**Verdict:** ${verdict}\n\n## Pre-PR QA\n`;
    expect(verifyStep(st, new Map([[p, impl("in-review", "pass → pre-PR QA")]]), new Map([[p, impl("qa", "pass → pre-PR QA")]])).reason).toMatch(/no literal verdict/);
    expect(verifyStep(st, new Map([[p, impl("in-review", "x")]]), new Map([[p, impl("in-review", "pass")]])).reason).toMatch(/expected "qa"/);
    const ok = verifyStep(st, new Map([[p, impl("in-review", "x")]]), new Map([[p, impl("qa", "pass")]]));
    expect(ok).toMatchObject({ ok: true, gate: "pass" });
    const routed = verifyStep(st, new Map([[p, impl("in-review", "x")]]), new Map([[p, impl("in-review", "fail → implementer — tests missing")]]));
    expect(routed).toMatchObject({ ok: true, gate: "fail", route: "implementer" });
  });
  it("promoter must set pr:", () => {
    const st = parseSteps(STEPS, "promoter", "s")!;
    const p = st.targets[0]!.ref.path;
    expect(verifyStep(st, new Map([[p, doc("qa")]]), new Map([[p, doc("qa", "pr: \n")]])).reason).toMatch(/pr:/);
    expect(verifyStep(st, new Map([[p, doc("qa")]]), new Map([[p, doc("qa", "pr: 42\n")]])).ok).toBe(true);
  });
});
