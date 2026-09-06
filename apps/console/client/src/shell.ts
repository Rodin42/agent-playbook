import { state } from "./state.js";
import type { ViewId } from "./types.js";
import { $, esc, usd } from "./util.js";
import { toast } from "./modal.js";

export function renderProjsel(onPick: (name: string) => void): void {
  const ws = state.workspace;
  $("#projname").textContent = state.project ?? (ws?.projects.length ? "pick a project" : "no projects");
  const menu = $("#projmenu");
  menu.innerHTML = (ws?.projects ?? [])
    .map((p) => `<button type="button" data-p="${esc(p.name)}"><b>${esc(p.name)}</b><span>${esc(p.subtitle)}${p.escalationsOpen ? ` · ${p.escalationsOpen} open` : ""}</span></button>`)
    .join("") + `<button type="button" class="newp" data-new="1">+ add project</button>`;
  menu.querySelectorAll<HTMLButtonElement>("button[data-p]").forEach((b) => b.addEventListener("click", () => { onPick(b.dataset.p as string); $("#projsel").classList.remove("open"); }));
  menu.querySelector<HTMLButtonElement>("button[data-new]")?.addEventListener("click", () => {
    $("#projsel").classList.remove("open");
    toast(`factory new <name> --workspace ${ws?.dir ?? "~/factory-workspace"} — then run start_prompt.md in the project`, "info");
  });
}

export function renderStrip(): void {
  const d = state.data;
  const el = $("#topstrip");
  if (!d) { el.innerHTML = `<div class="tstat"><span>${state.error ? esc(state.error) : "no project selected"}</span></div>`; return; }
  const mix = d.strip.cost.byModel7d.map((m) => `${m.model} ${m.share}`).join(" / ") || "no runs";
  const ci = d.strip.ciMain === "green" ? `<b class="ok">green</b>` : d.strip.ciMain === "red" ? `<b class="bad">red</b>` : `<b class="na" title="CI state arrives with the merge milestone (M6)">n/a</b>`;
  const n = d.strip.escalationsOpen;
  el.innerHTML = `
    <div class="tstat"><span>sandboxes</span><b class="${d.strip.running ? "livecur" : ""}">${d.strip.running} running</b></div>
    <div class="tstat"><span>cost today</span><b class="${d.strip.cost.todayUsd > 0 ? "hot" : ""}">${usd(d.strip.cost.todayUsd)}</b></div>
    <div class="tstat"><span>model mix 7d</span><b title="share of calls, last 7 days">${esc(mix)}</b></div>
    <div class="tstat"><span>ci main</span>${ci}</div>
    <div class="tstat"><span>live</span><b class="${state.live ? "ok" : "bad"}" title="server-sent events from the file watcher">${state.live ? "watching" : "reconnecting"}</b></div>
    <div class="spacer"></div>
    ${d.strip.unpushed ? `<div class="unpushed" title="GitHub is the system of record — these commits exist only on this machine">${d.strip.unpushed} unpushed commit${d.strip.unpushed === 1 ? "" : "s"}</div>` : ""}
    <div class="escsum ${n ? "" : "zero"}" id="escsum">${n} escalation${n === 1 ? "" : "s"} open</div>`;
}

const NAV: { sect?: string; cls?: string; id?: ViewId; label?: string; badge?: (d: NonNullable<typeof state.data>) => { n: number; hot?: boolean } | null }[] = [
  { sect: "GENERAL" },
  { id: "overview", label: "overview" },
  { id: "config", label: "configuration" },
  { id: "files", label: "file editor" },
  { id: "finished", label: "finished tasks", badge: (d) => ({ n: d.counts.finished }) },
  { sect: "STEP 1 / PRODUCT DEV", cls: "s1" },
  { id: "s1-backlog", label: "backlog", badge: (d) => ({ n: d.counts.backlog }) },
  { id: "s1-esc", label: "escalation to human", badge: (d) => ({ n: d.counts.escalations[1], hot: true }) },
  { id: "s1-runs", label: "runs & audit" },
  { sect: "STEP 2 / IMPLEMENTATION", cls: "s2" },
  { id: "s2-pipeline", label: "pipeline", badge: (d) => ({ n: d.counts.pipeline }) },
  { id: "s2-esc", label: "escalation to human", badge: (d) => ({ n: d.counts.escalations[2], hot: true }) },
  { id: "s2-runs", label: "runs & audit" },
  { sect: "STEP 3 / HOUSEKEEPING", cls: "s3" },
  { id: "s3-findings", label: "findings", badge: (d) => ({ n: d.counts.findings }) },
  { id: "s3-esc", label: "escalation to human", badge: (d) => ({ n: d.counts.escalations[3], hot: true }) },
  { id: "s3-runs", label: "runs & audit" },
];

export function renderNav(onGo: (v: ViewId) => void): void {
  const d = state.data;
  const html = NAV.map((n) => {
    if (n.sect) return `<div class="sect ${n.cls ?? ""}">${n.sect}</div>`;
    const b = d && n.badge ? n.badge(d) : null;
    const badge = b ? `<span class="n ${b.hot && b.n > 0 ? "hot" : ""} ${b.n === 0 ? "zero" : ""}">${b.n}</span>` : "";
    return `<button type="button" class="nv ${state.view === n.id ? "on" : ""}" data-v="${n.id}">${n.label} ${badge}</button>`;
  }).join("");
  $("#nav").innerHTML = html + `<div class="grow"></div><div class="foot">the repo is the source of truth —<br>this console renders it,<br>it never owns it<br><span title="keyboard: g then 1/2/3 jumps to a step"><kbd>g</kbd>+<kbd>1‑3</kbd> jump</span></div>`;
  $("#nav").querySelectorAll<HTMLButtonElement>("button.nv").forEach((b) => b.addEventListener("click", () => onGo(b.dataset.v as ViewId)));
}
