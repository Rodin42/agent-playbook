// @vitest-environment jsdom
import { copyFileSync, cpSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { deriveProject, type ProjectView } from "@factory/core";
import { state } from "../src/state.js";
import { renderNav, renderProjsel, renderStrip } from "../src/shell.js";
import { config, finished, overview } from "../src/views-general.js";
import { backlog, escalations, findings, pipeline, runs } from "../src/views-steps.js";

const FIXTURES = resolve(__dirname, "../../fixtures");
const SHELL = `<div class="projsel" id="projsel"><button id="projbtn"><span class="pname" id="projname"></span></button><div class="menu" id="projmenu"></div></div>
<div class="topstrip" id="topstrip"></div><nav id="nav"></nav><main id="main"></main>
<div class="overlay" id="overlay"><div class="modal"><b id="mtitle"></b><button id="mclose"></button><div id="mbody"></div><button id="mcancel"></button><button id="mconfirm"></button></div></div><div id="toast"></div>`;

let d: ProjectView;
beforeAll(() => {
  const dir = mkdtempSync(join(tmpdir(), "factory-client-"));
  cpSync(join(FIXTURES, "demo-project"), dir, { recursive: true });
  copyFileSync(join(dir, ".env.example"), join(dir, ".env"));
  d = deriveProject({ name: "jbr-factory", path: dir }, new Date("2026-09-06T12:00:00Z"));
  document.body.innerHTML = SHELL;
  state.workspace = { file: join(FIXTURES, "workspace.yaml"), dir: FIXTURES, projects: [{ name: "jbr-factory", path: dir, remote: null, subtitle: d.subtitle, setupComplete: true, escalationsOpen: 3 }] };
  state.project = "jbr-factory";
  state.data = d;
  state.live = true;
});

const noop = () => undefined;

describe("shell renders from the derived view", () => {
  it("project selector, top strip and nav badges", () => {
    renderProjsel(noop);
    renderStrip();
    renderNav(noop);
    expect(document.getElementById("projname")?.textContent).toBe("jbr-factory");
    expect(document.getElementById("topstrip")?.textContent).toContain("1 running");
    expect(document.getElementById("topstrip")?.textContent).toContain("3 escalations open");
    const nav = document.getElementById("nav")!;
    expect(nav.querySelectorAll("button.nv")).toHaveLength(13);
    expect(nav.querySelector('[data-v="s2-esc"] .n')?.textContent).toBe("2");
    expect(nav.querySelector('[data-v="s2-esc"] .n')?.classList.contains("hot")).toBe(true);
    expect(nav.querySelector('[data-v="s3-esc"] .n')?.classList.contains("zero")).toBe(true);
    expect(nav.querySelector('[data-v="s1-backlog"] .n')?.textContent).toBe("8");
  });
});

describe("every M1 view renders the fixture without throwing", () => {
  const views: [string, () => string][] = [
    ["overview", () => overview(d, noop)],
    ["config", () => config(d)],
    ["finished", () => finished(d)],
    ["backlog", () => backlog(d)],
    ["pipeline", () => pipeline(d)],
    ["s1-esc", () => escalations(d, 1)],
    ["s2-esc", () => escalations(d, 2)],
    ["s3-esc", () => escalations(d, 3)],
    ["s1-runs", () => runs(d, 1, noop)],
    ["s2-runs", () => runs(d, 2, noop)],
    ["s3-runs", () => runs(d, 3, noop)],
    ["findings", () => findings(d, noop)],
  ];
  for (const [name, fn] of views) {
    it(name, () => {
      const html = fn();
      expect(html.length).toBeGreaterThan(200);
      document.getElementById("main")!.innerHTML = html;
      expect(document.querySelector("h1")).not.toBeNull();
    });
  }

  it("overview shows three green foundation ticks and the wire-the-machinery card", () => {
    document.getElementById("main")!.innerHTML = overview(d, noop);
    expect(document.querySelectorAll(".doc .tick.ok").length).toBeGreaterThanOrEqual(6);
    expect(document.querySelector(".setup")).toBeNull();
  });

  it("pipeline board: nine stations per row, F-006 red-lined, F-004 waiting", () => {
    document.getElementById("main")!.innerHTML = pipeline(d);
    const rows = document.querySelectorAll(".pline");
    expect(rows).toHaveLength(3);
    for (const r of rows) expect(r.querySelectorAll(".st")).toHaveLength(9);
    expect(document.querySelector(".ptag.red")?.textContent).toContain("nodemailer");
    expect(document.querySelector(".ptag.org")?.textContent).toContain("PR #61");
    expect(document.querySelectorAll(".st.wait")).toHaveLength(1);
    expect(document.querySelectorAll(".st.block")).toHaveLength(1);
    expect(document.querySelector(".st[title]")?.getAttribute("title")).toContain("discovery");
  });

  it("escalations: cases carry options, the recommendation, and disabled actions (M4)", () => {
    document.getElementById("main")!.innerHTML = escalations(d, 2);
    expect(document.querySelectorAll(".case:not(.resolved)")).toHaveLength(2);
    expect(document.querySelectorAll(".case.redl")).toHaveLength(1);
    expect(document.querySelectorAll(".opt.rec")).toHaveLength(2);
    expect(document.querySelectorAll(".acts button:disabled").length).toBeGreaterThan(3);
    document.getElementById("main")!.innerHTML = escalations(d, 3);
    expect(document.querySelector(".empty")?.textContent).toContain("nothing needs you");
  });

  it("backlog: rows for every non-finished entry, phase-3 chips, answered-in-advance bars", () => {
    document.getElementById("main")!.innerHTML = backlog(d);
    expect(document.querySelectorAll("tr.row")).toHaveLength(8);
    expect(document.querySelectorAll(".chip.vio").length).toBe(2);
    expect(document.querySelectorAll(".aia i.ok").length).toBeGreaterThan(10);
  });

  it("runs & audit: live log slot for the running run and a two-actor decision table", () => {
    document.getElementById("main")!.innerHTML = runs(d, 2, noop);
    expect(document.getElementById("live-run-2026-09-06-014")).not.toBeNull();
    expect(document.querySelectorAll(".audit td.actor-twin").length).toBeGreaterThanOrEqual(3);
    expect(document.querySelector(".runrow.cost")?.textContent).toContain("total");
  });

  it("secrets never render a value", () => {
    const html = config(d);
    expect(html).not.toContain("fixture-dummy");
    expect(html).toContain("CLAUDE_CODE_OAUTH_TOKEN");
  });
});
