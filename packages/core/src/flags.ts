import { join } from "node:path";
import { listFiles, parseFrontmatter, readText, str } from "./fs.js";
import type { Flag, FlagOption, FlagType, Step } from "./types.js";

const TYPES: FlagType[] = ["sign-off", "red-line", "triage", "rollback", "system"];

function sectionLines(body: string, heading: RegExp): string[] {
  const out: string[] = [];
  let on = false;
  for (const l of body.split(/\r?\n/)) {
    if (/^##\s/.test(l)) {
      if (on) break;
      on = heading.test(l);
      continue;
    }
    if (on) out.push(l);
  }
  return out;
}

export function parseFlag(text: string, relPath: string): Flag | null {
  const fm = parseFrontmatter(text);
  if (!fm.valid && Object.keys(fm.data).length === 0) return null;
  const d = fm.data;
  const id = str(d.id) ?? relPath.replace(/^.*\//, "").replace(/\.md$/, "");
  const typeRaw = str(d.type)?.toLowerCase() ?? "system";
  const type: FlagType = (TYPES as string[]).includes(typeRaw) ? (typeRaw as FlagType) : "system";
  const stepNum = Number(d.step);
  const step: Step = stepNum === 1 || stepNum === 2 || stepNum === 3 ? stepNum : type === "triage" ? 1 : 2;
  const statusRaw = str(d.status)?.toLowerCase();
  const recommendation = str(d.recommendation);
  const options: FlagOption[] = sectionLines(fm.body, /options/i)
    .map((l) => /^-\s+\*\*(.+?)\*\*\s*(?:—|-|–|:)?\s*(.*)$/.exec(l))
    .filter((m): m is RegExpExecArray => !!m)
    .map((m) => ({ key: (m[1] ?? "").trim(), text: (m[2] ?? "").trim(), recommended: false }));
  for (const o of options) o.recommended = recommendation !== null && o.key.toLowerCase() === recommendation.toLowerCase();
  const blocked = sectionLines(fm.body, /blocked/i)
    .map((l) => /^-\s+(.*)$/.exec(l)?.[1]?.trim() ?? "")
    .filter((s) => s.length > 0);
  const question = sectionLines(fm.body, /question/i).join("\n").trim();
  const decLines = sectionLines(fm.body, /decision/i);
  let decision: Flag["decision"] = null;
  if (decLines.some((l) => l.trim().length > 0)) {
    const kv = (k: string) => decLines.map((l) => new RegExp(`\\*\\*${k}:?\\*\\*:?\\s*(.*)$`, "i").exec(l)?.[1]?.trim()).find((v) => v) ?? null;
    decision = {
      choice: kv("choice") ?? decLines.find((l) => l.trim())?.replace(/^-\s*/, "").trim() ?? "",
      by: kv("by") ?? "operator",
      at: kv("at") ?? "",
      note: kv("note"),
    };
  }
  return {
    id,
    type,
    step,
    feature: str(d.feature),
    title: str(d.title) ?? id,
    created: str(d.created) ?? "",
    status: statusRaw === "resolved" || decision ? "resolved" : "open",
    recommendation,
    from: str(d.from) ?? str(d.source),
    question,
    options,
    blocked,
    decision,
    path: relPath,
  };
}


export function readFlags(projectPath: string): Flag[] {
  const dir = join(projectPath, "runtime", "flags");
  const flags: Flag[] = [];
  for (const f of listFiles(dir, ".md")) {
    const text = readText(join(dir, f));
    if (text === null) continue;
    const flag = parseFlag(text, `runtime/flags/${f}`);
    if (flag) flags.push(flag);
  }
  return flags.sort((a, b) => (a.id < b.id ? 1 : -1));
}
