import { join } from "node:path";
import { readText, str } from "./fs.js";
import type { Decision, Step } from "./types.js";

export function parseDecisions(jsonl: string): Decision[] {
  const out: Decision[] = [];
  for (const line of jsonl.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const o = JSON.parse(line) as Record<string, unknown>;
      const at = str(o.at);
      const action = str(o.action);
      if (!at || !action) continue;
      const stepNum = Number(o.step);
      out.push({
        at,
        actor: str(o.actor) ?? "operator",
        action,
        subject: str(o.subject) ?? "",
        rule: str(o.rule),
        step: stepNum === 1 || stepNum === 2 || stepNum === 3 ? (stepNum as Step) : null,
      });
    } catch {
      // a malformed line is skipped, never fatal — the log is append-only by two writers
    }
  }
  return out.sort((a, b) => (a.at < b.at ? 1 : -1));
}

export function readDecisions(projectPath: string): Decision[] {
  return parseDecisions(readText(join(projectPath, "runtime", "decisions.log")) ?? "");
}
