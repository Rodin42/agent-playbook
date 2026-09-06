import type { Decision, FeaturePipeline, Flag, ProjectView, RunRecord, Step } from "@factory/core";
import { api } from "./api.js";
import { openModal } from "./modal.js";
import type { ViewId } from "./types.js";
import { empty, featureDrawer, h1 } from "./views-general.js";
import { chip, dur, esc, rel, usd } from "./util.js";

const STEP_TAG: Record<Step, string> = { 1: "step 1 · product development", 2: "step 2 · implementation", 3: "step 3 · housekeeping" };
const stChip: Record<string, string> = { waiting: chip("waiting"), approved: chip("approved", "grn"), started: chip("started", "org"), finished: chip("finished", "vio") };
const aia = (n: number) => `<span class="aia" title="answered in advance: ${n} of 3">${[0, 1, 2].map((i) => `<i class="${i < n ? "ok" : ""}"></i>`).join("")}</span>`;

function wireRows(d: ProjectView): void {
  queueMicrotask(() => document.querySelectorAll<HTMLElement>("[data-fid]").forEach((el) => el.addEventListener("click", () => {
    const id = el.dataset.fid as string;
    const entry = d.backlog.find((e) => e.id === id) ?? null;
    const p = d.pipeline.find((x) => x.id === id) ?? null;
    if (!entry) return;
    const { title, body } = featureDrawer(d, entry, p);
    openModal(title, body);
  })));
}

export function backlog(d: ProjectView): string {
  if (!d.backlog.length) return `${h1("backlog", "step 1 · feature-plan.md")}${empty("the backlog is empty — <b>share the intake instructions with a PO</b>: they add an entry to <code>phase-1-product-development/feature-plan.md</code> using the entry format, and it appears here twin-checked.")}`;
  const rows = d.backlog.map((t) => {
    const p = d.pipeline.find((x) => x.id === t.id);
    const detail = t.status === "started" ? (p?.tag?.text ?? "step 2") : t.twinCheck + (t.status === "waiting" && t.twinCheck === "complete" ? ` — <b style="color:var(--grn)">approve?</b>` : "") + (t.status === "approved" ? " next into step 2" : "");
    return `<tr class="row" data-fid="${esc(t.id)}"><td class="fid">${esc(t.id)}</td><td><b>${esc(t.name)}</b><div class="fp">${esc(t.problem)}</div></td><td>${t.fromPhase3 ? chip("step 3", "vio") : esc((t.po ?? "—").split(" — ")[0] ?? "")}</td><td>${aia(t.answeredInAdvanceCount)}</td><td>${stChip[t.status] ?? ""}</td><td style="font-size:.78rem;color:var(--dim)">${detail}</td></tr>`;
  }).join("");
  wireRows(d);
  return `${h1("backlog", "step 1 · feature-plan.md")}<p class="sub">Everything the product owners have put in, twin-checked on arrival. Complete entries flow on without you; gaps become questions to the PO. Click a row for the full entry.</p>
    <table class="bl"><tr><th>entry</th><th>task</th><th>po</th><th>answered-in-advance</th><th>status</th><th>detail</th></tr>${rows}</table>
    <p class="hint">status: waiting → approved → started → finished · derived from the plan's Status column (Idea/Shaping → waiting · Ready → approved · In progress → started · Shipped/Observing → finished) · editing arrives with M3</p>`;
}

export function pipeline(d: ProjectView): string {
  if (!d.pipeline.length) return `${h1("pipeline", STEP_TAG[2])}${empty("nothing in flight — mark a backlog entry <b>Ready</b> (approved) and the orchestrator starts it; the feature folder then lights up here station by station.")}`;
  const ruler = `<div class="ruler"><div></div>${["discovery", "masterplan", "impl. plan", "build", "adversarial", "pre-PR QA", "PR + merge", "post-PR QA", "observing"].map((l) => `<div>${l}</div>`).join("")}</div>`;
  const lines = d.pipeline.map((p: FeaturePipeline) => {
    const stations = p.stations.map((s) => `<div class="st ${s.state === "pending" ? "" : s.state}" title="${esc(s.detail)}"><span class="nd"></span></div>`).join("");
    const sub = [p.branch, p.latestRun?.status === "running" ? `${p.latestRun.id} live` : null].filter(Boolean).join(" · ");
    const tag = p.tag ? `<div class="ptag ${p.tag.kind}">${esc(p.tag.text)}${p.tag.link ? ` · <a href="#" data-go="${p.tag.link.view}">${p.tag.link.flagId ? "open case" : "live log"}</a>` : ""}</div>` : "";
    return `<div class="pline"><div class="meta" data-fid="${esc(p.id)}" title="open the feature drawer"><div class="t">${esc(p.id)} ${esc(p.name)}</div><div class="s">${esc(sub || p.folder)}</div></div>${stations}${tag}</div>`;
  }).join("");
  wireRows(d);
  return `${h1("pipeline", STEP_TAG[2])}<p class="sub">Every started feature as a production line. Filled = done, ring = crew is there, orange = waits for you, red = exception routed back. Hover a station for its reason; click the name for the drawer.</p>${ruler}${lines}`;
}

function caseHtml(f: Flag): string {
  const kind = f.type === "red-line" ? "redl" : f.type === "system" || f.type === "rollback" ? "sys" : "";
  const chipKind = f.type === "red-line" ? "red" : f.type === "system" ? "" : "org";
  const opts = f.options.map((o) => `<div class="opt ${o.recommended ? "rec" : ""}"><b>${esc(o.key)}</b><span>${esc(o.text)}${o.recommended ? " — twin recommends" : ""}</span></div>`).join("");
  const acts = f.status === "open"
    ? `<div class="acts">${f.options.map((o) => `<button type="button" class="btn ${o.recommended ? "primary" : o.key.toLowerCase().includes("reject") || o.key.toLowerCase().includes("drop") || o.key.toLowerCase().includes("back") ? "danger" : ""}" disabled title="resolving cases arrives with M4 — until then, answer in the flag file and commit">${esc(o.key)}</button>`).join("")}<span class="m1">resolve in <code>${esc(f.path)}</code> until M4</span></div>`
    : `<div class="doneline">resolved — ${esc(f.decision?.choice ?? "")} by ${esc(f.decision?.by ?? "operator")} ${f.decision?.at ? rel(f.decision.at) : ""}${f.decision?.note ? ` · ${esc(f.decision.note)}` : ""}</div>`;
  return `<div class="case ${kind} ${f.status === "resolved" ? "resolved" : ""}" id="case-${esc(f.id)}">
    <div class="chead">${chip(f.type === "red-line" ? "red line" : f.type, chipKind)}<b>${esc(f.title)}${f.feature ? ` — ${esc(f.feature)}` : ""}</b><span class="from">${esc(f.from ?? "twin")} · ${rel(f.created)}</span></div>
    ${f.status === "open" ? `<p>${esc(f.question)}</p>${opts}${f.blocked.length ? `<div class="blocked">${esc(f.blocked.join(" · "))}</div>` : ""}` : ""}${acts}</div>`;
}

export function escalations(d: ProjectView, step: Step): string {
  const open = d.flags.filter((f) => f.step === step && f.status === "open");
  const done = d.flags.filter((f) => f.step === step && f.status === "resolved").slice(0, 5);
  const subs: Record<Step, string> = { 1: "Cases from intake and shaping. Format: the question, the options, the twin's recommendation, what is blocked.", 2: "Sign-offs and red lines from the build. The twin prepares each case; the decision is yours.", 3: "P0 declarations and watcher-config changes land in this queue." };
  const body = open.length ? open.map(caseHtml).join("") : empty(`<b>nothing needs you here</b> — the pipeline is flowing.${done.length ? " Recent decisions below." : ""}`);
  return `${h1("escalation to human", STEP_TAG[step])}<p class="sub">${subs[step]}</p>${body}${done.length ? `<h2>recently resolved</h2>${done.map(caseHtml).join("")}` : ""}`;
}

function runRow(r: RunRecord, go: (v: ViewId) => void): string {
  const status = r.status === "running" ? chip("running", "grn") : r.status === "ok" ? chip("ok", "grn") : r.status === "failed" ? chip("failed", "red") : r.status === "escalated" ? chip("escalated", "org") : chip("stopped", "red");
  const act = r.status === "escalated" ? `<button type="button" class="btn" data-go="s${r.step}-esc">open case</button>` : r.logPath ? `<button type="button" class="btn" data-log="${esc(r.id)}">log</button>` : "";
  queueMicrotask(() => document.querySelectorAll<HTMLButtonElement>(`[data-go="s${r.step}-esc"]`).forEach((b) => b.addEventListener("click", () => go(b.dataset.go as ViewId))));
  return `<div class="runrow"><div><b>${esc(r.feature ?? "—")} · ${esc(r.role)}</b><div class="r2">${rel(r.started)} · ${esc(r.harness)} / ${esc(r.model)}${r.sandbox ? ` · ${esc(r.sandbox)}` : ""}${r.reason ? ` · ${esc(r.reason)}` : ""}</div></div><div>${status}</div><div>${dur(r.durationSec)}</div><div>${usd(r.cost_usd)}</div><div>${act}</div></div>`;
}

function auditTable(rows: Decision[]): string {
  if (!rows.length) return empty("no decisions logged in this step yet — every twin sign-off and every console action lands in <code>runtime/decisions.log</code>.");
  return `<table class="audit"><tr><th>when</th><th>who</th><th>decision</th><th>subject</th><th>mandate rule</th></tr>${rows.map((x) => `<tr><td>${rel(x.at)}</td><td class="actor-${x.actor === "rodin-twin" ? "twin" : "operator"}">${esc(x.actor)}</td><td>${esc(x.action)}</td><td>${esc(x.subject)}</td><td>${esc(x.rule ?? "")}</td></tr>`).join("")}</table>`;
}

export function runs(d: ProjectView, step: Step, go: (v: ViewId) => void): string {
  const rs = d.runs.filter((r) => r.step === step);
  const live = rs.filter((r) => r.status === "running");
  const recent = rs.filter((r) => r.status !== "running").slice(0, 12);
  const decisions = d.decisions.filter((x) => x.step === step);
  const cost = d.strip.cost;
  queueMicrotask(async () => {
    document.querySelectorAll<HTMLButtonElement>("[data-log]").forEach((b) => b.addEventListener("click", async () => {
      const r = await api.log(d.ref.name, b.dataset.log as string, 200);
      openModal(`log — ${r.run}`, `<div class="term">${r.lines.map(termLine).join("\n") || "(empty)"}</div>`);
    }));
    for (const r of live) {
      const el = document.getElementById(`live-${r.id}`);
      if (!el) continue;
      try { const t = await api.log(d.ref.name, r.id, 40); el.innerHTML = t.lines.map(termLine).join("\n") + `<span class="livecur"></span>`; } catch { el.textContent = "(no log yet)"; }
    }
  });
  return `${h1("runs & audit", STEP_TAG[step])}
    ${live.length ? `<h2>running now</h2>${live.map((r) => runRow(r, go)).join("")}${live.map((r) => `<h2>live log — ${esc(r.sandbox ?? r.id)}</h2><div class="term" id="live-${esc(r.id)}">…</div>`).join("")}` : ""}
    <h2>recent runs</h2>${recent.length ? recent.map((r) => runRow(r, go)).join("") : empty("no runs in this step yet")}
    <h2>decision log — this step, both actors</h2>${auditTable(decisions)}
    ${step === 2 ? `<h2>cost, 7 days</h2><div class="runrow cost"><div><b>${usd(cost.sevenDayUsd)} total</b><div class="r2">${d.counts.pipeline} feature${d.counts.pipeline === 1 ? "" : "s"} in flight</div></div>${cost.byModel7d.map((m) => `<div><b>${esc(m.model)} ${usd(m.usd)}</b><div class="r2">${m.share}% of calls</div></div>`).join("")}</div>` : ""}`;
}

function termLine(l: string): string {
  const m = /^(\d{2}:\d{2}:\d{2})\s+(\S+)\s+(.*)$/.exec(l);
  if (!m) return esc(l);
  return `<span class="p">${esc(m[1])}</span> <span class="${m[2] === "orchestrator" ? "o" : ""}">${esc(m[2])}</span> ${esc(m[3])}`;
}

export function findings(d: ProjectView, go: (v: ViewId) => void): string {
  if (!d.findings.length) return `${h1("findings", STEP_TAG[3])}${empty("no findings from the watchers — the diff report, log analysis and ecosystem watch write candidates into the backlog tagged <b>Source: Phase 3</b>; they show up here.")}`;
  const rows = d.findings.map((f) => {
    const esc1 = d.flags.find((x) => x.status === "open" && (x.feature ?? "") === f.id);
    const stat = esc1 ? chip("escalated in step 1", "org") : f.status === "waiting" ? chip("candidate in backlog", "grn") : chip(f.status, "org");
    return `<div class="runrow"><div><b data-fid="${esc(f.id)}" style="cursor:pointer">${esc(f.id)} · ${esc(f.name)}</b><div class="r2">${esc(f.source ?? "phase 3")} · ${esc(f.problem)}</div></div><div>${stat}</div><div></div><div></div><div>${esc1 ? `<button type="button" class="btn" data-go="s1-esc">open case</button>` : `<button type="button" class="btn" data-go="s1-backlog">backlog</button>`}</div></div>`;
  }).join("");
  wireRows(d);
  queueMicrotask(() => document.querySelectorAll<HTMLButtonElement>("[data-go]").forEach((b) => b.addEventListener("click", () => go(b.dataset.go as ViewId))));
  return `${h1("findings", STEP_TAG[3])}<p class="sub">What the watchers found. Findings become backlog candidates — never builds. Your triage happens in step 1.</p>${rows}`;
}
