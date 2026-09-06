import { join } from "node:path";
import { exists, hasPlaceholder, placeholderCount, readText } from "./fs.js";
import type { Counts, EffectiveConfig, Overview, PreworkCard, PreworkDoc, Secrets, Tick } from "./types.js";

const P1 = "phase-1-product-development";

function docTick(projectPath: string, rel: string): { tick: Tick; note: string | null } {
  const t = readText(join(projectPath, rel));
  if (t === null) return { tick: "no", note: "missing" };
  const placeholders = placeholderCount(t);
  if (placeholders > 0) return { tick: "wip", note: `${placeholders} template placeholder${placeholders === 1 ? "" : "s"} left` };
  return { tick: "ok", note: null };
}

/** the twin's `_Last updated by the human: \`yyyy-mm-dd\`_` line; stale after 90 days → advise-only */
export function twinTick(projectPath: string, now = new Date()): { tick: Tick; note: string | null } {
  const rel = `${P1}/agents/rodin-twin.md`;
  const t = readText(join(projectPath, rel));
  if (t === null) return { tick: "no", note: "missing" };
  const m = /last updated by the human:\s*`?(\d{4}-\d{2}-\d{2})`?/i.exec(t);
  if (!m) return { tick: "wip", note: "no `Last updated by the human` date" };
  const d = Date.parse(m[1] as string);
  const days = Math.floor((now.getTime() - d) / 86400_000);
  if (!Number.isFinite(days)) return { tick: "wip", note: "unparseable date" };
  if (days > 90) return { tick: "wip", note: `stale — ${days} days since review; advise-only` };
  if (hasPlaceholder(t)) return { tick: "wip", note: "template sections still unfilled" };
  return { tick: "ok", note: `reviewed ${m[1]}` };
}

export function buildOverview(projectPath: string, cfg: EffectiveConfig, secrets: Secrets, counts: Counts): Overview {
  const doc = (label: string, rel: string, t: { tick: Tick; note: string | null }): PreworkDoc => ({ label, path: rel, tick: t.tick, note: t.note });

  const brief = doc("project-brief.md", `${P1}/project-brief.md`, docTick(projectPath, `${P1}/project-brief.md`));
  const substrate = doc("substrate.md", `${P1}/substrate.md`, docTick(projectPath, `${P1}/substrate.md`));
  const architecture = doc("architecture.md", `${P1}/architecture.md`, docTick(projectPath, `${P1}/architecture.md`));
  const twin = doc("rodin-twin.md", `${P1}/agents/rodin-twin.md`, twinTick(projectPath));

  const configTick: { tick: Tick; note: string | null } = !cfg.files.config
    ? { tick: "no", note: "missing" }
    : cfg.placeholder
      ? { tick: "wip", note: "project name / repo still placeholders" }
      : { tick: "ok", note: null };
  const config = doc("factory.config.yaml", "factory.config.yaml", configTick);

  const required = secrets.keys.filter((k) => k.required);
  const setCount = required.filter((k) => k.set).length;
  const envTick: { tick: Tick; note: string | null } = !secrets.file
    ? { tick: "no", note: ".env missing" }
    : setCount === required.length
      ? { tick: "ok", note: `${setCount} of ${required.length} set` }
      : { tick: setCount === 0 ? "no" : "wip", note: `${setCount} of ${required.length} set` };
  const env = doc(".env secrets", ".env", envTick);

  const tmplName = cfg.sandbox.template;
  const e2b = doc(
    `${cfg.sandbox.provider} template`,
    tmplName ?? "—",
    tmplName ? { tick: "wip", note: `${tmplName} — build state unknown until Phase B` } : { tick: "no", note: "no template configured" },
  );

  const cards: PreworkCard[] = [
    {
      who: "PRODUCT OWNER · OR OPERATOR",
      title: "Describe the product",
      docs: [brief],
      blurb: 'Why this product exists, for whom, what "good" means, what it is not. Written once, in plain words — the strategists read it before every shaping pass. Backlog entries answer "what next"; this answers "why at all".',
    },
    {
      who: "OPERATOR · IN PERSON",
      title: "Define the foundation",
      docs: [substrate, architecture, twin],
      blurb: "The platform contract (stack, commands, red lines), the living system design with its ADR log, and your mandate document. Every change to the first two is an ADR you approve.",
    },
    {
      who: "OPERATOR · TECHNICAL",
      title: "Wire the machinery",
      docs: [config, env, e2b],
      blurb: "Agents, harness, models and keys — all of it lives in configuration, none of it in the process.",
    },
  ];

  const gating = [brief, substrate, architecture, twin, config, env];
  const setupComplete = gating.every((d) => d.tick === "ok");
  const esc = counts.escalations;
  const plural = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
  return {
    setupComplete,
    cards,
    steps: [
      { step: 1, title: "step 1 / product development", line: `POs feed the backlog · twin checks intake · five lenses shape · you mark Ready. ${plural(counts.backlog, "entry").replace("entrys", "entries")}, ${plural(esc[1], "escalation")}.`, escalations: esc[1] },
      { step: 2, title: "step 2 / implementation", line: `Discovery → masterplan → plan → build → gates → PR. ${plural(counts.pipeline, "feature")} in flight, ${plural(esc[2], "escalation")}.`, escalations: esc[2] },
      { step: 3, title: "step 3 / housekeeping", line: `diff report · log analysis · ecosystem watch. ${plural(counts.findings, "finding")} await triage, ${plural(esc[3], "escalation")}.`, escalations: esc[3] },
    ],
  };
}

export function fileExists(projectPath: string, rel: string): boolean {
  return exists(join(projectPath, rel));
}
