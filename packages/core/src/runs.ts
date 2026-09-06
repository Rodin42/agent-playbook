import { join } from "node:path";
import { exists, listFiles, readText, str } from "./fs.js";
import type { CostSummary, RunRecord, RunStatus, Step } from "./types.js";

const STATUSES: RunStatus[] = ["running", "ok", "failed", "stopped", "escalated"];

export function parseRun(json: string, projectPath: string): RunRecord | null {
  let o: Record<string, unknown>;
  try {
    const v = JSON.parse(json);
    if (!v || typeof v !== "object") return null;
    o = v as Record<string, unknown>;
  } catch {
    return null;
  }
  const id = str(o.id);
  if (!id) return null;
  const statusRaw = str(o.status)?.toLowerCase();
  const status: RunStatus = (STATUSES as string[]).includes(statusRaw ?? "") ? (statusRaw as RunStatus) : "failed";
  const stepNum = Number(o.step);
  const step: Step = stepNum === 1 || stepNum === 3 ? stepNum : 2;
  const started = str(o.started) ?? "";
  const ended = str(o.ended);
  const tokens = (o.tokens && typeof o.tokens === "object" ? (o.tokens as Record<string, unknown>) : {}) as Record<string, unknown>;
  const logRel = `runtime/logs/${id}.log`;
  const s = Date.parse(started);
  const e = ended ? Date.parse(ended) : Date.now();
  return {
    id,
    feature: str(o.feature),
    role: str(o.role) ?? "?",
    step,
    harness: str(o.harness) ?? "claude-code",
    model: str(o.model) ?? "haiku",
    sandbox: str(o.sandbox),
    started,
    ended,
    status,
    cost_usd: typeof o.cost_usd === "number" ? o.cost_usd : 0,
    tokens: { in: num(tokens.in), out: num(tokens.out) },
    reason: str(o.reason),
    logPath: exists(join(projectPath, logRel)) ? logRel : null,
    durationSec: Number.isFinite(s) && Number.isFinite(e) ? Math.max(0, Math.round((e - s) / 1000)) : null,
  };
}

const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : 0);

export function readRuns(projectPath: string): RunRecord[] {
  const dir = join(projectPath, "runtime", "runs");
  const runs: RunRecord[] = [];
  for (const f of listFiles(dir, ".json")) {
    const r = parseRun(readText(join(dir, f)) ?? "", projectPath);
    if (r) runs.push(r);
  }
  return runs.sort((a, b) => (a.started < b.started ? 1 : -1));
}

export function readLogTail(projectPath: string, runId: string, lines = 120): string[] {
  const t = readText(join(projectPath, "runtime", "logs", `${runId}.log`));
  if (t === null) return [];
  const all = t.replace(/\n$/, "").split(/\r?\n/);
  return all.slice(Math.max(0, all.length - lines));
}

export function costSummary(runs: RunRecord[], now = new Date()): CostSummary {
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const weekStart = now.getTime() - 7 * 86400_000;
  let todayUsd = 0;
  let sevenDayUsd = 0;
  const byModel = new Map<string, { usd: number; calls: number }>();
  for (const r of runs) {
    const t = Date.parse(r.started);
    if (!Number.isFinite(t)) continue;
    if (t >= dayStart) todayUsd += r.cost_usd;
    if (t >= weekStart) {
      sevenDayUsd += r.cost_usd;
      const m = byModel.get(r.model) ?? { usd: 0, calls: 0 };
      m.usd += r.cost_usd;
      m.calls += 1;
      byModel.set(r.model, m);
    }
  }
  const calls = [...byModel.values()].reduce((a, b) => a + b.calls, 0) || 1;
  return {
    todayUsd: round(todayUsd),
    sevenDayUsd: round(sevenDayUsd),
    byModel7d: [...byModel.entries()]
      .map(([model, v]) => ({ model, usd: round(v.usd), calls: v.calls, share: Math.round((100 * v.calls) / calls) }))
      .sort((a, b) => b.calls - a.calls),
  };
}

const round = (n: number) => Math.round(n * 100) / 100;
