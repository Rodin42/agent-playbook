import { describe, expect, it } from "vitest";
import { parseDecisions } from "./decisions.js";
import { costSummary, parseRun, readRuns } from "./runs.js";

describe("run registry (BUILD-PLAN §2.3)", () => {
  it("parses a run and computes duration", () => {
    const r = parseRun(JSON.stringify({ id: "run-1", feature: "F-005", role: "implementer", step: 2, harness: "claude-code", model: "sonnet", sandbox: "e2b-3f2a", started: "2026-09-06T09:00:00Z", ended: "2026-09-06T09:12:00Z", status: "ok", cost_usd: 0.61, tokens: { in: 41200, out: 9800 } }), "/nowhere")!;
    expect(r.durationSec).toBe(720);
    expect(r.tokens.in).toBe(41200);
    expect(r.logPath).toBeNull();
  });
  it("never trusts an unknown status — it is failed", () => {
    expect(parseRun(JSON.stringify({ id: "r", status: "exit0" }), "/nowhere")?.status).toBe("failed");
    expect(parseRun("not json", "/nowhere")).toBeNull();
  });
  it("aggregates cost today / 7d / by model", () => {
    const now = new Date("2026-09-06T12:00:00Z");
    const mk = (started: string, model: string, cost: number) => parseRun(JSON.stringify({ id: started + model, started, model, status: "ok", cost_usd: cost, role: "x" }), "/n")!;
    const s = costSummary([mk("2026-09-06T09:00:00Z", "haiku", 1), mk("2026-09-06T10:00:00Z", "sonnet", 2), mk("2026-09-02T10:00:00Z", "haiku", 4), mk("2026-08-01T10:00:00Z", "opus", 100)], now);
    expect(s.todayUsd).toBe(3);
    expect(s.sevenDayUsd).toBe(7);
    expect(s.byModel7d.map((m) => m.model)).toEqual(["haiku", "sonnet"]);
    expect(s.byModel7d[0]?.share).toBe(67);
  });
});

describe("decision log (BUILD-PLAN §2.4)", () => {
  it("reads JSONL newest first and skips broken lines", () => {
    const d = parseDecisions(`{"at":"2026-09-05T07:12:00Z","actor":"rodin-twin","action":"breakdown approved","subject":"F-005","rule":"routine","step":2}\nnot json\n{"at":"2026-09-06T12:04:00Z","actor":"operator","action":"merge","subject":"PR #61 F-004"}\n`);
    expect(d).toHaveLength(2);
    expect(d[0]?.actor).toBe("operator");
    expect(d[1]?.step).toBe(2);
  });
});

import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join as pjoin } from "node:path";

describe("readRuns merges local, committed and worktree records", () => {
  it("prefers the finished record over the running one with the same id", () => {
    const root = mkdtempSync(pjoin(tmpdir(), "runs-"));
    const rec = (status: string, ended: string | null) => JSON.stringify({ id: "r1", role: "x", step: 1, started: "2026-09-09T10:00:00Z", ended, status });
    mkdirSync(pjoin(root, ".factory", "runs"), { recursive: true });
    mkdirSync(pjoin(root, ".factory", "worktrees", "s", "runtime", "runs"), { recursive: true });
    writeFileSync(pjoin(root, ".factory", "runs", "r1.json"), rec("running", null));
    writeFileSync(pjoin(root, ".factory", "worktrees", "s", "runtime", "runs", "r1.json"), rec("ok", "2026-09-09T10:05:00Z"));
    const runs = readRuns(root);
    expect(runs).toHaveLength(1);
    expect(runs[0]?.status).toBe("ok");
  });
});
