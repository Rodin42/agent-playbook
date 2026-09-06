import { copyFileSync, cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { deriveProject } from "./project.js";
import { loadWorkspace } from "./workspace.js";

const FIXTURES = resolve(__dirname, "../../../apps/console/fixtures");

function demo(): string {
  const dir = mkdtempSync(join(tmpdir(), "factory-demo-"));
  cpSync(join(FIXTURES, "demo-project"), dir, { recursive: true });
  copyFileSync(join(dir, ".env.example"), join(dir, ".env"));
  return dir;
}

describe("demo fixture renders truthfully (BUILD-PLAN §3 M1 acceptance)", () => {
  const v = deriveProject({ name: "jbr-factory", path: demo() }, new Date("2026-09-06T12:00:00Z"));

  it("setup is complete once .env exists", () => {
    expect(v.overview.setupComplete).toBe(true);
    expect(v.subtitle).toBe("main · 3 features in flight");
    const env = v.overview.cards[2]?.docs.find((d) => d.label === ".env secrets");
    expect(env?.tick).toBe("ok");
    expect(env?.note).toBe("3 of 3 set");
  });

  it("counts match the plan", () => {
    expect(v.counts).toEqual({ backlog: 8, finished: 3, pipeline: 3, findings: 2, escalations: { 1: 1, 2: 2, 3: 0 } });
    expect(v.strip.running).toBe(1);
    expect(v.strip.escalationsOpen).toBe(3);
  });

  it("pipeline: F-004 waits for merge sign-off, F-005 builds, F-006 is red-lined", () => {
    const by = Object.fromEntries(v.pipeline.map((p) => [p.id, p]));
    expect(by["F-004"]?.state).toBe("wait");
    expect(by["F-004"]?.tag?.kind).toBe("org");
    expect(by["F-004"]?.pr.number).toBe(61);
    expect(by["F-004"]?.stations.map((s) => s.state)).toEqual(["done", "done", "done", "done", "done", "done", "wait", "pending", "pending"]);
    expect(by["F-005"]?.state).toBe("here");
    expect(by["F-005"]?.tag?.kind).toBe("dim");
    expect(by["F-005"]?.latestRun?.status).toBe("running");
    expect(by["F-005"]?.branch).toBe("feature/vipps-login");
    expect(by["F-006"]?.state).toBe("block");
    expect(by["F-006"]?.tag?.kind).toBe("red");
    expect(by["F-006"]?.tag?.text).toContain("nodemailer");
    expect(by["F-006"]?.openFlagIds).toEqual(["flag-2026-09-05-0007"]);
  });

  it("finished list carries PR numbers, merge dates and cost from the run registry", () => {
    const f3 = v.finished.find((f) => f.id === "F-003");
    expect(f3?.pr.number).toBe(54);
    expect(f3?.mergedAt).toBe("2026-08-28T12:04:00Z");
    expect(f3?.costUsd).toBe(8.1);
  });

  it("backlog twin checks and answered-in-advance bars", () => {
    const by = Object.fromEntries(v.backlog.map((e) => [e.id, e]));
    expect(by["F-007"]?.twinCheck).toBe("complete");
    expect(by["F-007"]?.answeredInAdvanceCount).toBe(3);
    expect(by["F-009"]?.twinCheck).toBe("3 gaps → PO");
    expect(by["F-009"]?.answeredInAdvanceCount).toBe(0);
    expect(by["F-010"]?.twinCheck).toBe("high-stakes — escalated");
    expect(v.findings.map((f) => f.id)).toEqual(["F-010", "F-011"]);
  });

  it("flags, runs and decisions are all present", () => {
    expect(v.flags.filter((f) => f.status === "open")).toHaveLength(3);
    expect(v.flags.find((f) => f.id === "flag-2026-08-28-0006")?.decision?.choice).toBe("merge");
    expect(v.runs[0]?.id).toBe("run-2026-09-06-014");
    expect(v.runs[0]?.logPath).toBe("runtime/logs/run-2026-09-06-014.log");
    expect(v.decisions[0]?.action).toBe("PR #61 opened");
    expect(v.strip.cost.byModel7d.map((m) => m.model)).toContain("sonnet");
  });
});

describe("workspace + the bare second project (A12)", () => {
  it("loads both projects with absolute paths", () => {
    const ws = loadWorkspace(FIXTURES);
    expect(ws.projects.map((p) => p.name)).toEqual(["jbr-factory", "aurora-crm"]);
    expect(ws.projects[1]?.path).toBe(join(FIXTURES, "aurora-crm"));
  });
  it("a freshly seeded project is the setup-checklist state, never an empty dashboard", () => {
    const v = deriveProject({ name: "aurora-crm", path: join(FIXTURES, "aurora-crm") });
    expect(v.overview.setupComplete).toBe(false);
    expect(v.subtitle).toBe("main · setup not finished");
    expect(v.backlog).toEqual([]);
    expect(v.overview.cards.flatMap((c) => c.docs).filter((d) => d.tick !== "ok").length).toBeGreaterThan(3);
  });
});
