import type { FeatureEntry, FeaturePipeline, ProjectView } from "@factory/core";
import { api } from "./api.js";
import { openModal } from "./modal.js";
import type { FileGroup, ViewId } from "./types.js";
import { chip, dur, esc, pathTag, rel, usd } from "./util.js";

export const h1 = (title: string, tag: string) => `<h1>${esc(title)}<span class="tag">${esc(tag)}</span></h1>`;
export const empty = (html: string) => `<div class="empty">${html}</div>`;

export function setupNotice(d: ProjectView): string {
  return d.overview.setupComplete ? "" : `<div class="notice">setup is not finished for <b>${esc(d.ref.name)}</b> — the pipeline cannot run yet. <a href="#${encodeURIComponent(d.ref.name)}/overview">see the checklist</a></div>`;
}

export function overview(d: ProjectView, go: (v: ViewId) => void): string {
  const tick = { ok: "✓", wip: "◐", no: "✗" } as const;
  const cards = d.overview.cards.map((c) => `
    <div class="precard"><div class="who">${esc(c.who)}</div><h3>${esc(c.title)}</h3>
      ${c.docs.map((x) => `<div class="doc"><span class="tick ${x.tick}" title="${esc(x.note ?? (x.tick === "ok" ? "present and current" : x.tick))}">${tick[x.tick]}</span> ${esc(x.label)} ${pathTag(x.note && x.tick !== "ok" ? `${x.path} — ${x.note}` : x.path)}</div>`).join("")}
      <p>${esc(c.blurb)}${c.title === "Wire the machinery" ? ` Edit under <a href="#" data-go="config">configuration</a>.` : ""}</p></div>`).join("");
  const colors = ["var(--blu)", "var(--org)", "var(--vio)"];
  const targets: ViewId[] = ["s1-backlog", "s2-pipeline", "s3-findings"];
  const labels = ["open backlog", "open pipeline", "open findings"];
  const steps = d.overview.steps.map((s, i) => `
    <div class="stepcard"><b style="color:${colors[i]}">${esc(s.title)}</b><span>${esc(s.line)}</span>
      <div class="go"><button type="button" class="btn" data-go="${targets[i]}">${labels[i]}</button></div></div>`).join("");
  const setup = d.overview.setupComplete ? "" : `
    <div class="setup"><b>setup not finished</b><p>Red and orange ticks below are the missing pre-work. Continue in a Claude Code session in the project:
    <code>cd ${esc(d.ref.path)} && claude</code> → run <code>start_prompt.md</code>. The console renders progress as the files land.</p></div>`;
  const html = `${h1("overview", d.ref.name)}<p class="sub">The pre-work that must exist before the pipeline runs, and where each piece lives. Green tick = present and current in the repo; hover a tick for why it is not.</p>
    ${setup}<h2>pre-work</h2><div class="pre">${cards}</div><h2>the three steps</h2><div class="stepline">${steps}</div>`;
  queueMicrotask(() => document.querySelectorAll<HTMLElement>("[data-go]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); go(b.dataset.go as ViewId); })));
  return html;
}

export function config(d: ProjectView): string {
  const c = d.config;
  const seg = (opts: string[], on: string) => `<div class="seg">${opts.map((o) => `<button type="button" class="${o === on ? "on" : ""}" disabled>${esc(o)}</button>`).join("")}</div>`;
  const roles = ["implementer", "senior-developer", "adversarial-reviewer", "pre-pull-request-qa"];
  const roleModel = (r: string) => c.models.roles.find((x) => x.role === r)?.model ?? `${c.models.default.model} (default)`;
  return `${h1("configuration", "reads factory.config.yaml — the file stays the truth")}
    <p class="sub">Effective values: <code>runtime/factory.defaults.yaml</code> overridden key by key by <code>factory.config.yaml</code>. Secrets show presence only; values never leave .env. Editing arrives with M3 — until then, edit the file.</p>
    <div class="cfg">
      <div class="ccard"><h3>project</h3>
        <div class="cf"><label>name</label><input value="${esc(c.project.name)}" disabled></div>
        <div class="cf"><label>git remote</label><input value="${esc(c.project.repo)}" disabled></div>
        <div class="cf"><label>main branch</label><input value="${esc(c.project.main_branch)}" disabled></div>
        <div class="cf"><label>path</label><input value="${esc(d.ref.path)}" disabled></div></div>
      <div class="ccard"><h3>sandbox</h3>
        <div class="cf"><label>provider</label>${seg(["e2b", "local-docker"], c.sandbox.provider)}</div>
        <div class="cf"><label>template</label><input value="${esc(c.sandbox.template ?? "—")}" disabled></div>
        <div class="cf"><label>timeout (minutes)</label><input value="${esc(c.sandbox.timeout_minutes ?? "—")}" style="width:110px" disabled></div>
        <p class="hint">fresh sandbox per step is enforced (kill_on_done: ${c.sandbox.kill_on_done ?? "default"}) — the fresh-context rule, physically</p></div>
      <div class="ccard"><h3>harness — the one-line switch</h3>
        <div class="cf">${seg(["claude-code", "pi"], c.harness.provider)}
        <p class="hint">${c.harness.provider === "claude-code" ? "claude-code runs on the Max subscription (token in .env). switching to pi changes nothing else and opens every pi provider." : "pi: multi-provider; API keys in .env. never together with the OAuth token."}</p></div>
        <h3 style="margin-top:16px">model per role</h3>
        <div class="rg"><span>default (all roles)</span><span class="val">${esc(c.models.default.model)}</span>
          ${roles.map((r) => `<span>${esc(r)}</span><span class="val">${esc(roleModel(r))}</span>`).join("")}
          ${c.models.roles.filter((r) => !roles.includes(r.role)).map((r) => `<span>${esc(r.role)}</span><span class="val">${esc(r.model)}</span>`).join("")}</div></div>
      <div class="ccard"><h3>secrets — presence only</h3>
        ${d.secrets.file ? "" : `<p class="hint warn">.env is missing — copy .env.example and fill it in your own editor</p>`}
        ${d.secrets.keys.map((k) => `<div class="sec"><span title="${esc(k.note ?? "")}">${esc(k.name)}</span>${k.set ? chip("set", "grn") : chip(k.required ? "not set" : `not set — ${k.note ?? "optional"}`, k.required ? "red" : "")}</div>`).join("")}
        <p class="hint">rotate tokens by editing .env directly; the console never displays or stores values</p></div>
      <div class="ccard"><h3>console</h3>
        <div class="rg"><span>run mode</span><span class="val">${esc(c.console.run_mode)}</span><span>paused</span><span class="val">${c.console.paused ? "yes" : "no"}</span>
        <span>max concurrent sandboxes</span><span class="val">${c.console.max_concurrent_sandboxes}</span><span>budget / month</span><span class="val">${c.console.budget_monthly_usd === null ? "—" : usd(c.console.budget_monthly_usd)}</span>
        <span>notify</span><span class="val">${esc(c.console.notify.kind)}</span></div></div>
      <div class="savebar"><button type="button" class="btn primary" disabled title="config editing lands in M3">save to factory.config.yaml</button><span class="diff">read-only in M1 · the file is the truth</span></div>
    </div>`;
}

export async function files(d: ProjectView): Promise<string> {
  let groups: FileGroup[] = [];
  try { groups = await api.files(d.ref.name); } catch { groups = []; }
  const tree = groups.map((g) => `<div class="fg">${esc(g.group)}</div>${g.files.map((f) => `<button type="button" data-f="${esc(f.path)}" data-k="${f.kind}" class="${f.locked ? "locked" : ""}">${esc(f.path.split("/").pop() ?? f.path)}${f.locked ? `<span class="lk">locked</span>` : ""}</button>`).join("")}`).join("");
  queueMicrotask(() => {
    document.querySelectorAll<HTMLButtonElement>(".ftree button[data-f]").forEach((b) => b.addEventListener("click", async () => {
      const note = document.getElementById("fnote") as HTMLElement;
      const ta = document.getElementById("fedit") as HTMLTextAreaElement;
      if (b.classList.contains("locked")) { note.className = "fnote warn"; note.textContent = ".env is never opened by the console — edit it in your own editor; values must not pass through here"; return; }
      document.querySelectorAll(".ftree button").forEach((x) => x.classList.remove("on")); b.classList.add("on");
      try {
        const r = await api.file(d.ref.name, b.dataset.f as string);
        ta.value = r.content;
        (document.getElementById("fpath") as HTMLElement).textContent = r.path;
        const k = b.dataset.k;
        note.className = k === "twin" || k === "role" ? "fnote warn" : "fnote";
        note.textContent = k === "twin" ? "self-authored mandate — editing is yours alone (M3). a stale twin drops to advise-only." : k === "role" ? "this is the process itself — saving (M3) will ask you to confirm and commit with a factory: prefix." : k === "yaml" ? "schema-checked on save (M3); secrets belong in .env, not here" : "markdown template — keep frontmatter intact so the pipeline can trace it";
      } catch (e) { note.className = "fnote warn"; note.textContent = String(e); }
    }));
  });
  return `${h1("file editor", "agent definitions · templates · config — read-only in M1")}
    <p class="sub">Everything that defines the factory is a file. Saving arrives with M3 (every save = a commit); until then this is the reader.</p>
    <div class="fed"><div class="ftree" id="ftree">${tree || empty("no files found — is this a project folder?")}</div>
      <div class="fpane"><div class="fbar"><span class="fp2" id="fpath">select a file</span><span class="state" id="fstate"></span><span class="spacer"></span>
        <button type="button" class="btn" disabled>revert</button><button type="button" class="btn primary" disabled title="M3">save + commit</button></div>
        <textarea id="fedit" spellcheck="false" readonly placeholder="// pick a file from the tree"></textarea>
        <div class="fnote" id="fnote">yaml files are schema-checked on save · markdown role docs are checked for frontmatter (id, reads, writes, handoff_to)</div></div></div>`;
}

export function finished(d: ProjectView): string {
  if (!d.finished.length) return `${h1("finished tasks", "merged — the archive, not the trash")}${empty("nothing merged yet — the first feature to pass <b>PR + merge</b> lands here with its full artifact trail.")}`;
  const rows = d.finished.map((f) => `<tr class="row" data-fid="${esc(f.id)}"><td class="fid">${esc(f.id)}</td><td><b>${esc(f.name)}</b><div class="fp">${esc(f.folder ?? "")}</div></td><td>${rel(f.mergedAt)}</td><td>${f.pr.number ? (f.pr.url ? `<a href="${esc(f.pr.url)}" target="_blank" rel="noopener">#${f.pr.number}</a>` : `#${f.pr.number}`) : "—"}</td><td>${usd(f.costUsd)}</td><td><button type="button" class="btn" data-trail="${esc(f.id)}">open trail</button></td></tr>`).join("");
  queueMicrotask(() => document.querySelectorAll<HTMLButtonElement>("[data-trail]").forEach((b) => b.addEventListener("click", () => {
    const f = d.finished.find((x) => x.id === b.dataset.trail);
    if (f) openModal(`${f.id} — ${f.name}`, `<div class="kv"><span>folder</span><b>phase-2-implementation/${esc(f.folder ?? "")}</b><span>merged</span><b>${esc(f.mergedAt ?? "—")}</b><span>PR</span><b>${f.pr.number ? `#${f.pr.number}` : "—"}</b><span>cost</span><b>${usd(f.costUsd)}</b></div><p>The folder outlives the feature: brainstorming → online-research → edge-case-analysis → architecture-analysis → masterplan → implementation-plan → implementation.md (review · QA · post-merge).</p>`);
  })));
  return `${h1("finished tasks", "merged — the archive, not the trash")}<p class="sub">Tasks land here on merge. Each row keeps its full artifact trail in the repo — the folder outlives the feature.</p>
    <table class="bl"><tr><th>entry</th><th>task</th><th>merged</th><th>pr</th><th>cost</th><th></th></tr>${rows}</table>`;
}

/** M2 feature drawer — everything about one feature, from the repo */
export function featureDrawer(d: ProjectView, entry: FeatureEntry, p: FeaturePipeline | null): { title: string; body: string } {
  const q = entry.openQuestions.length ? `<ol>${entry.openQuestions.map((x) => `<li>${x.answered ? "☑" : "☐"} ${esc(x.text)}</li>`).join("")}</ol>` : "<span>—</span>";
  const trail = p ? `<div class="trail">${p.artifacts.map((a) => {
    const t = !a.exists ? "no" : a.status === "final" || a.status === "merged" ? "done" : a.status === "superseded" ? "block" : "here";
    return `<div class="a"><span class="tick ${t}">${t === "done" ? "✓" : t === "here" ? "◐" : t === "block" ? "✗" : "·"}</span>${esc(a.kind)} ${a.exists ? chip(a.status ?? "?", t === "done" ? "grn" : t === "block" ? "red" : "org") : chip("missing")} ${pathTag(a.path)}</div>`;
  }).join("")}</div>` : `<p>no feature folder yet — <code>${esc(entry.folder ?? "")}</code></p>`;
  const runs = d.runs.filter((r) => (r.feature ?? "").toUpperCase() === entry.id.toUpperCase());
  const runRows = runs.length ? runs.slice(0, 8).map((r) => `<div class="a"><span class="tick ${r.status === "ok" ? "done" : r.status === "running" ? "here" : r.status === "failed" ? "block" : "no"}">${r.status === "running" ? "▮" : "·"}</span>${esc(r.role)} · ${esc(r.model)} ${chip(r.status, r.status === "ok" ? "grn" : r.status === "running" ? "grn" : r.status === "failed" ? "red" : "org")}<span class="path" style="margin-left:auto">${dur(r.durationSec)} · ${usd(r.cost_usd)}</span></div>`).join("") : "<span>no runs recorded</span>";
  const body = `
    <div class="kv"><span>status</span><b>${esc(entry.planStatus)} → ${esc(entry.status)}</b><span>PO</span><b>${esc(entry.po ?? "—")}</b><span>problem / user</span><b>${esc(entry.problem)}</b>
      <span>hypothesis</span><b>${esc(entry.hypothesis ?? "—")}</b><span>success metric</span><b>${esc(entry.metric ?? "—")}</b><span>scope</span><b>${esc(entry.scope ?? "—")}</b>
      <span>depends on</span><b>${esc(entry.dependsOn ?? "—")}</b><span>shared work</span><b>${esc(entry.sharedWork ?? "—")}</b><span>substrate</span><b>${esc(entry.substrateImpact ?? "—")}</b>
      <span>answered in advance</span><b>${esc(entry.answeredInAdvance ?? "—")}</b><span>twin check</span><b>${esc(entry.twinCheck)}</b><span>sign-off</span><b>${esc(entry.signOff ?? "—")}</b><span>source</span><b>${esc(entry.source ?? "—")}</b>
      ${p ? `<span>branch</span><b>${esc(p.branch ?? "—")}</b><span>PR</span><b>${p.pr.number ? (p.pr.url ? `<a href="${esc(p.pr.url)}" target="_blank" rel="noopener">#${p.pr.number}</a>` : `#${p.pr.number}`) + ` · ${esc(p.pr.state ?? "")}` : "—"}</b><span>cost so far</span><b>${usd(p.costUsd)}</b>` : ""}
      <span>file</span><b>phase-1-product-development/feature-plan.md:${entry.line}</b></div>
    <p><b>open questions → PO</b></p>${q}
    <p><b>artifact trail</b></p>${trail}
    <p><b>runs</b></p><div class="trail">${runRows}</div>`;
  return { title: `${entry.id} — ${entry.name}`, body };
}
