import { api, subscribe } from "./api.js";
import { toast, wireModal } from "./modal.js";
import { readHash, state, writeHash } from "./state.js";
import { renderNav, renderProjsel, renderStrip } from "./shell.js";
import type { ViewId } from "./types.js";
import { $, esc } from "./util.js";
import { config, files, finished, overview, setupNotice } from "./views-general.js";
import { backlog, escalations, findings, pipeline, runs } from "./views-steps.js";

async function loadWorkspace(): Promise<void> {
  state.workspace = await api.workspace();
}

async function loadProject(name: string): Promise<void> {
  try {
    state.data = await api.project(name);
    state.project = name;
    state.error = null;
  } catch (e) {
    state.data = null;
    state.error = `could not read ${name}: ${e instanceof Error ? e.message : String(e)}`;
  }
}

async function renderView(): Promise<void> {
  const main = $("#main");
  const d = state.data;
  if (!d) {
    const names = state.workspace?.projects.map((p) => p.name) ?? [];
    main.innerHTML = `<section class="view"><h1>agent pipeline<span class="tag">${esc(state.workspace?.file ?? state.workspace?.dir ?? "")}</span></h1>
      <div class="empty">${state.error ? `<b>${esc(state.error)}</b>` : names.length ? `pick a project in the upper-left selector — ${names.map((n) => `<a href="#${encodeURIComponent(n)}/overview">${esc(n)}</a>`).join(" · ")}` : `<b>no projects in this workspace.</b> seed one: <code>factory new &lt;name&gt; --workspace ${esc(state.workspace?.dir ?? "~/factory-workspace")}</code>, then run <code>start_prompt.md</code> in it.`}</div></section>`;
    return;
  }
  const notice = state.view === "overview" ? "" : setupNotice(d);
  let html = "";
  switch (state.view) {
    case "overview": html = overview(d, go); break;
    case "config": html = config(d); break;
    case "files": html = await files(d); break;
    case "finished": html = finished(d); break;
    case "s1-backlog": html = backlog(d); break;
    case "s1-esc": html = escalations(d, 1); break;
    case "s1-runs": html = runs(d, 1, go); break;
    case "s2-pipeline": html = pipeline(d); break;
    case "s2-esc": html = escalations(d, 2); break;
    case "s2-runs": html = runs(d, 2, go); break;
    case "s3-findings": html = findings(d, go); break;
    case "s3-esc": html = escalations(d, 3); break;
    case "s3-runs": html = runs(d, 3, go); break;
  }
  main.innerHTML = `<section class="view on" id="v-${state.view}">${notice}${html}</section>`;
  main.querySelectorAll<HTMLElement>("[data-go]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); go(b.dataset.go as ViewId); }));
}

function renderAll(): void {
  renderProjsel((name) => { void pick(name); });
  renderStrip();
  renderNav(go);
  void renderView();
  writeHash(state.project, state.view);
}

function go(v: ViewId): void {
  state.view = v;
  $("main").scrollTop = 0;
  renderAll();
}

async function pick(name: string): Promise<void> {
  await loadProject(name);
  renderAll();
}

async function refresh(): Promise<void> {
  const top = $("main").scrollTop;
  await loadWorkspace();
  if (state.project) await loadProject(state.project);
  renderAll();
  $("main").scrollTop = top;
}

async function boot(): Promise<void> {
  wireModal();
  $("#projbtn").addEventListener("click", () => $("#projsel").classList.toggle("open"));
  document.addEventListener("click", (e) => { const p = $("#projsel"); if (!p.contains(e.target as Node)) p.classList.remove("open"); });
  window.addEventListener("hashchange", () => { const h = readHash(); if (h.project && h.project !== state.project) void pick(h.project).then(() => { state.view = h.view; renderAll(); }); else if (h.view !== state.view) go(h.view); });

  // keyboard: g then 1/2/3 jumps to a step's main view (ux-review B)
  let chord = false;
  document.addEventListener("keydown", (e) => {
    if ((e.target as HTMLElement).tagName === "TEXTAREA" || (e.target as HTMLElement).tagName === "INPUT") return;
    if (e.key === "g") { chord = true; setTimeout(() => (chord = false), 900); return; }
    if (chord && ["1", "2", "3"].includes(e.key)) { chord = false; go(({ "1": "s1-backlog", "2": "s2-pipeline", "3": "s3-findings" } as Record<string, ViewId>)[e.key] as ViewId); }
  });

  await loadWorkspace();
  const h = readHash();
  const first = h.project && state.workspace?.projects.some((p) => p.name === h.project) ? h.project : state.workspace?.projects[0]?.name ?? null;
  state.view = h.view;
  if (first) await loadProject(first);
  renderAll();

  subscribe(
    (project) => { if (project === state.project) { void refresh(); toast(`${project} changed on disk — re-derived`, "info"); } else void loadWorkspace().then(() => renderProjsel((n) => void pick(n))); },
    (open) => { state.live = open; renderStrip(); },
  );
}

void boot();
