import { hasPlaceholder } from "./fs.js";
import { PLAN_STATUS_TO_CONSOLE, type ConsoleStatus, type FeatureEntry, type OpenQuestion } from "./types.js";

const FIELD_KEYS: Record<string, keyof FeatureEntry | "planStatus" | "openQuestions"> = {
  "po (owner)": "po",
  po: "po",
  "problem / user": "problem",
  problem: "problem",
  hypothesis: "hypothesis",
  "success metric": "metric",
  metric: "metric",
  scope: "scope",
  "depends on": "dependsOn",
  "shared work needed": "sharedWork",
  "substrate impact": "substrateImpact",
  "priority & why": "priorityWhy",
  priority: "priorityWhy",
  "answered in advance": "answeredInAdvance",
  "open questions → po": "openQuestions",
  "open questions -> po": "openQuestions",
  "open questions": "openQuestions",
  "sign-off": "signOff",
  source: "source",
  status: "planStatus",
  feature: "name",
};

const strip = (s: string) => s.replace(/^`|`$/g, "").trim();
const cell = (s: string) => strip(s.trim());

export function toConsoleStatus(planStatus: string): ConsoleStatus {
  const key = planStatus.trim().toLowerCase().replace(/\s+/g, " ");
  return PLAN_STATUS_TO_CONSOLE[key] ?? "waiting";
}

function blank(id: string, line: number): FeatureEntry {
  return {
    id,
    name: "",
    problem: "",
    priority: "",
    planStatus: "Idea",
    status: "waiting",
    folder: null,
    po: null,
    hypothesis: null,
    metric: null,
    scope: null,
    dependsOn: null,
    sharedWork: null,
    substrateImpact: null,
    priorityWhy: null,
    answeredInAdvance: null,
    answeredInAdvanceCount: 0,
    openQuestions: [],
    signOff: null,
    source: null,
    twinCheck: "complete",
    fromPhase3: false,
    line,
  };
}

/** how many of the three predictable intake questions were answered (0–3) */
export function countAnsweredInAdvance(text: string | null): number {
  if (!text) return 0;
  const parts = text
    .split(/\n|;|·|\s—\s|\s\|\s/)
    .map((p) => p.replace(/^[-*]\s*/, "").trim())
    .filter((p) => p.length > 2 && !hasPlaceholder(p) && !/^\[?po to fill/i.test(p));
  return Math.min(3, parts.length);
}

function isAnswered(q: string): boolean {
  return /\[x\]|\banswered\b|\bA:\s|→\s*answer/i.test(q);
}

/**
 * Parse feature-plan.md: the backlog table (authoritative for Status) and the
 * `### F-NNN · name` entry blocks (the details). Merged by id, table order first.
 */
export function parseFeaturePlan(text: string): FeatureEntry[] {
  const lines = text.split(/\r?\n/);
  const byId = new Map<string, FeatureEntry>();
  const order: string[] = [];
  const upsert = (id: string, line: number) => {
    let e = byId.get(id);
    if (!e) {
      e = blank(id, line);
      byId.set(id, e);
      order.push(id);
    }
    return e;
  };

  // 1) table rows
  lines.forEach((raw, i) => {
    const m = /^\|\s*(F-\d+)\s*\|(.*)\|\s*$/.exec(raw);
    if (!m) return;
    const id = m[1] as string;
    const cells = (m[2] ?? "").split("|").map(cell);
    const [name = "", problem = "", priority = "", status = "", folder = ""] = cells;
    if (hasPlaceholder(name) || name === "") return; // the template's example row
    const e = upsert(id, i + 1);
    e.name = name;
    e.problem = problem;
    e.priority = priority;
    if (status) e.planStatus = status.split("/")[0]?.trim() || status;
    if (folder && !hasPlaceholder(folder)) e.folder = folder.replace(/\/$/, "");
  });

  // 2) entry blocks
  let cur: FeatureEntry | null = null;
  let field: string | null = null;
  const flush = () => {
    field = null;
  };
  lines.forEach((raw, i) => {
    const h = /^###\s+(F-\d+)\s*[·\-–—:]\s*`?([^`]*)`?\s*$/.exec(raw);
    if (h) {
      const id = h[1] as string;
      const name = (h[2] ?? "").trim();
      cur = upsert(id, i + 1);
      if (!cur.name && !hasPlaceholder(name)) cur.name = name;
      flush();
      return;
    }
    if (/^##\s/.test(raw) || /^###\s/.test(raw)) {
      cur = null;
      flush();
      return;
    }
    if (!cur) return;
    const b = /^- \*\*(.+?):\*\*\s*(.*)$/.exec(raw);
    if (b) {
      const label = (b[1] ?? "").trim().toLowerCase();
      const value = (b[2] ?? "").trim();
      const key = FIELD_KEYS[label] ?? null;
      field = key;
      if (!key) return;
      if (key === "openQuestions") {
        if (value && !hasPlaceholder(value) && !/^the async queue/i.test(value) && !/^[-—–]+$|^none$/i.test(value)) {
          cur.openQuestions.push({ text: value, answered: isAnswered(value) });
        }
      } else if (key === "planStatus") {
        cur.planStatus = value || cur.planStatus;
      } else if (key === "name") {
        if (!cur.name) cur.name = strip(value);
      } else {
        (cur as unknown as Record<string, unknown>)[key] = value || null;
      }
      return;
    }
    if (!field) return;
    const nested = /^\s+[-*\d.)]+\s+(.*)$/.exec(raw);
    const cont = /^\s{2,}(\S.*)$/.exec(raw) ?? /^(\S.*)$/.exec(raw);
    if (field === "openQuestions" && nested) {
      const t = (nested[1] ?? "").trim();
      if (t && !hasPlaceholder(t)) cur.openQuestions.push({ text: t, answered: isAnswered(t) });
      return;
    }
    if (field === "openQuestions" || field === "planStatus" || field === "name") return;
    const text = (nested?.[1] ?? cont?.[1] ?? "").trim();
    if (!text || /^- \*\*/.test(raw)) return;
    const rec = cur as unknown as Record<string, string | null>;
    rec[field] = rec[field] ? `${rec[field]}\n${text}` : text;
  });

  // 3) derived fields
  const out: FeatureEntry[] = [];
  for (const id of order) {
    const e = byId.get(id) as FeatureEntry;
    if (!e.name && !e.problem) continue;
    e.status = toConsoleStatus(e.planStatus);
    e.answeredInAdvanceCount = countAnsweredInAdvance(e.answeredInAdvance);
    if (!e.folder && e.name) e.folder = `features/${slugify(e.name)}`;
    e.fromPhase3 = /phase\s*3|step\s*3|log-analysis|diff-report|ecosystem/i.test(`${e.source ?? ""} ${e.po ?? ""}`);
    const gaps = e.openQuestions.filter((q: OpenQuestion) => !q.answered).length;
    e.twinCheck = gaps > 0 ? `${gaps} gap${gaps === 1 ? "" : "s"} → PO` : "complete";
    out.push(e);
  }
  return out;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[`"'()]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}
