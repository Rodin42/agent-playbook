import { describe, expect, it } from "vitest";
import { parseVerdict } from "./artifacts.js";
import { deriveStations } from "./stations.js";
import type { Artifact, ArtifactKind, Flag, RunRecord, StationState } from "./types.js";

const KINDS: ArtifactKind[] = ["brainstorming", "online-research", "edge-case-analysis", "architecture-analysis", "masterplan", "implementation-plan", "implementation"];

function artifacts(spec: Partial<Record<ArtifactKind, string | { status: string; body?: string; fm?: Record<string, unknown> }>>): Artifact[] {
  return KINDS.map((kind) => {
    const s = spec[kind];
    if (!s) return { kind, path: `features/x/${kind}.md`, exists: false, status: null, frontmatter: {}, body: "" };
    const o = typeof s === "string" ? { status: s } : s;
    return { kind, path: `features/x/${kind}.md`, exists: true, status: o.status, frontmatter: o.fm ?? {}, body: o.body ?? "" };
  });
}
const flag = (type: Flag["type"], step: 1 | 2 | 3 = 2): Flag => ({
  id: `flag-${type}`, type, step, feature: "F-1", title: `${type} case`, created: "", status: "open", recommendation: null, from: null, question: "", options: [], blocked: [], decision: null, path: "",
});
const run = (status: RunRecord["status"], reason: string | null = null): RunRecord => ({
  id: "run-1", feature: "F-1", role: "implementer", step: 2, harness: "claude-code", model: "sonnet", sandbox: "e2b-3f2a", started: "2026-09-06T09:00:00Z", ended: null, status, cost_usd: 0.5, tokens: { in: 1, out: 1 }, reason, logPath: null, durationSec: 60,
});
const IMPL_REVIEW_PASS = "## Adversarial review\n**Verdict:** pass — clean\n## Pre-PR QA\n**Verdict:** pass → promoter · fail → route\n";
const IMPL_REVIEW_FAIL = "## Adversarial review\n**Verdict:** fail — code wrong → implementer\n";
const IMPL_QA_PASS = "## Adversarial review\n**Verdict:** pass\n## Pre-PR QA\n**Verdict:** pass 9/9\n";
const IMPL_POST = IMPL_QA_PASS + "## Post-merge\n- **Deploy/rollout result:** deployed 12:04, flag on\n";

type S = StationState;
const cases: { name: string; input: Parameters<typeof deriveStations>[0]; states: S[]; tag: "dim" | "org" | "red" | null; state: S }[] = [
  {
    name: "fresh folder, nothing written",
    input: { artifacts: artifacts({}), planStatus: "In progress", openFlags: [], latestRun: null },
    states: ["pending", "pending", "pending", "pending", "pending", "pending", "pending", "pending", "pending"], tag: null, state: "pending",
  },
  {
    name: "discovery under way: two drafts, one final",
    input: { artifacts: artifacts({ brainstorming: "final", "online-research": "draft", "edge-case-analysis": "in-review" }), planStatus: "In progress", openFlags: [], latestRun: null },
    states: ["here", "pending", "pending", "pending", "pending", "pending", "pending", "pending", "pending"], tag: "dim", state: "here",
  },
  {
    name: "build running in a sandbox (the F-005 row of the mockup)",
    input: { artifacts: artifacts({ brainstorming: "final", "online-research": "final", "edge-case-analysis": "final", "architecture-analysis": "final", masterplan: "final", "implementation-plan": "final", implementation: "in-progress" }), planStatus: "In progress", openFlags: [], latestRun: run("running") },
    states: ["done", "done", "done", "here", "pending", "pending", "pending", "pending", "pending"], tag: "dim", state: "here",
  },
  {
    name: "PR open, gates green, sign-off flag → PR station waits (F-004)",
    input: { artifacts: artifacts({ brainstorming: "final", "online-research": "final", "edge-case-analysis": "final", "architecture-analysis": "final", masterplan: "final", "implementation-plan": "final", implementation: { status: "qa", body: IMPL_QA_PASS, fm: { pr: { number: 61, state: "open" } } } }), planStatus: "In progress", openFlags: [flag("sign-off")], latestRun: null },
    states: ["done", "done", "done", "done", "done", "done", "wait", "pending", "pending"], tag: "org", state: "wait",
  },
  {
    name: "red-line flag while the plan is drafted → plan station blocked (F-006)",
    input: { artifacts: artifacts({ brainstorming: "final", "online-research": "final", "edge-case-analysis": "final", "architecture-analysis": "final", masterplan: "final", "implementation-plan": "draft" }), planStatus: "In progress", openFlags: [flag("red-line")], latestRun: null },
    states: ["done", "done", "block", "pending", "pending", "pending", "pending", "pending", "pending"], tag: "red", state: "block",
  },
  {
    name: "adversarial review failed → blocked with route",
    input: { artifacts: artifacts({ brainstorming: "final", "online-research": "final", "edge-case-analysis": "final", "architecture-analysis": "final", masterplan: "final", "implementation-plan": "final", implementation: { status: "in-review", body: IMPL_REVIEW_FAIL } }), planStatus: "In progress", openFlags: [], latestRun: null },
    states: ["done", "done", "done", "done", "block", "pending", "pending", "pending", "pending"], tag: "red", state: "block",
  },
  {
    name: "run failed during build → build blocked",
    input: { artifacts: artifacts({ brainstorming: "final", "online-research": "final", "edge-case-analysis": "final", "architecture-analysis": "final", masterplan: "final", "implementation-plan": "final", implementation: "in-progress" }), planStatus: "In progress", openFlags: [], latestRun: run("failed", "Not logged in") },
    states: ["done", "done", "done", "block", "pending", "pending", "pending", "pending", "pending"], tag: "red", state: "block",
  },
  {
    name: "merged with post-merge recorded and plan Observing",
    input: { artifacts: artifacts({ brainstorming: "final", "online-research": "final", "edge-case-analysis": "final", "architecture-analysis": "final", masterplan: "final", "implementation-plan": "final", implementation: { status: "merged", body: IMPL_POST, fm: { pr: 54 } } }), planStatus: "Observing", openFlags: [], latestRun: null },
    states: ["done", "done", "done", "done", "done", "done", "done", "done", "here"], tag: "dim", state: "here",
  },
  {
    name: "superseded implementation plan is an exception",
    input: { artifacts: artifacts({ brainstorming: "final", "online-research": "final", "edge-case-analysis": "final", "architecture-analysis": "final", masterplan: "final", "implementation-plan": "superseded" }), planStatus: "In progress", openFlags: [], latestRun: null },
    states: ["done", "done", "block", "pending", "pending", "pending", "pending", "pending", "pending"], tag: "red", state: "block",
  },
  {
    name: "review pass, QA in progress",
    input: { artifacts: artifacts({ brainstorming: "final", "online-research": "final", "edge-case-analysis": "final", "architecture-analysis": "final", masterplan: "final", "implementation-plan": "final", implementation: { status: "qa", body: IMPL_REVIEW_PASS } }), planStatus: "In progress", openFlags: [], latestRun: null },
    states: ["done", "done", "done", "done", "done", "here", "pending", "pending", "pending"], tag: "dim", state: "here",
  },
];

describe("deriveStations (BUILD-PLAN §2.1)", () => {
  for (const c of cases) {
    it(c.name, () => {
      const out = deriveStations(c.input);
      expect(out.stations.map((s) => s.state)).toEqual(c.states);
      expect(out.tag?.kind ?? null).toBe(c.tag);
      expect(out.state).toBe(c.state);
      expect(out.stations).toHaveLength(9);
      for (const s of out.stations) expect(s.detail.length).toBeGreaterThan(0);
    });
  }

  it("stage is the last done station", () => {
    const out = deriveStations(cases[3]!.input);
    expect(out.stage).toBe("pre-pr-qa");
    expect(deriveStations(cases[0]!.input).stage).toBeNull();
  });
});

describe("parseVerdict", () => {
  it("treats the template's own instruction line as not filled in", () => {
    expect(parseVerdict("**Verdict:** pass → pre-PR QA · fail → route by what broke").verdict).toBeNull();
  });
  it("reads pass / fail and the fail route", () => {
    expect(parseVerdict("**Verdict:** pass").verdict).toBe("pass");
    const f = parseVerdict("**Verdict:** fail — plan wrong → senior-developer");
    expect(f.verdict).toBe("fail");
    expect(f.route).toBe("senior-developer");
  });
  it("is null when there is no verdict line", () => {
    expect(parseVerdict("nothing here").verdict).toBeNull();
    expect(parseVerdict(null).verdict).toBeNull();
  });
});
