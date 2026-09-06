import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { deriveProject, loadWorkspace, readLogTail, summarizeProjects, type ProjectView } from "@factory/core";
import { fileTree, readProjectFile } from "./files.js";
import { unpushedCount } from "./git.js";
import { ProjectWatcher } from "./watcher.js";

export interface AppOptions {
  workspace: string;
}

const here = dirname(fileURLToPath(import.meta.url));
const CLIENT_DIST = [join(here, "..", "..", "client", "dist"), join(here, "..", "client", "dist")].find((p) => existsSync(join(p, "index.html")));
const TYPES: Record<string, string> = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".map": "application/json", ".css": "text/css; charset=utf-8" };

export function createApp(opts: AppOptions): { app: Hono; watcher: ProjectWatcher } {
  const app = new Hono();
  const watcher = new ProjectWatcher();

  const workspace = () => loadWorkspace(opts.workspace);
  const project = (name: string) => workspace().projects.find((p) => p.name === name) ?? null;
  const view = (name: string): ProjectView | null => {
    const ref = project(name);
    if (!ref || !existsSync(ref.path)) return null;
    const v = deriveProject(ref);
    v.strip.unpushed = unpushedCount(ref.path);
    return v;
  };
  for (const p of workspace().projects) if (existsSync(p.path)) watcher.watchProject(p.name, p.path);

  app.get("/api/health", (c) => c.json({ ok: true, workspace: opts.workspace }));

  app.get("/api/workspace", (c) => {
    const ws = workspace();
    return c.json({ file: ws.file, dir: ws.dir, projects: summarizeProjects(ws.projects) });
  });

  app.get("/api/projects/:name", (c) => {
    const v = view(c.req.param("name"));
    return v ? c.json(v) : c.json({ error: "unknown project" }, 404);
  });

  app.get("/api/projects/:name/runs/:run/log", (c) => {
    const ref = project(c.req.param("name"));
    if (!ref) return c.json({ error: "unknown project" }, 404);
    const lines = Math.min(2000, Number(c.req.query("lines") ?? 120) || 120);
    return c.json({ run: c.req.param("run"), lines: readLogTail(ref.path, c.req.param("run"), lines) });
  });

  app.get("/api/projects/:name/files", (c) => {
    const ref = project(c.req.param("name"));
    return ref ? c.json(fileTree(ref.path)) : c.json({ error: "unknown project" }, 404);
  });

  app.get("/api/projects/:name/file", (c) => {
    const ref = project(c.req.param("name"));
    if (!ref) return c.json({ error: "unknown project" }, 404);
    const r = readProjectFile(ref.path, c.req.query("path") ?? "");
    return "error" in r ? c.json({ error: r.error }, r.status as 403 | 404) : c.json(r);
  });

  app.get("/api/events", (c) =>
    streamSSE(c, async (stream) => {
      let alive = true;
      const unsub = watcher.subscribe((e) => {
        if (alive) void stream.writeSSE({ event: "changed", data: JSON.stringify(e) });
      });
      stream.onAbort(() => {
        alive = false;
        unsub();
      });
      await stream.writeSSE({ event: "hello", data: JSON.stringify({ at: new Date().toISOString() }) });
      while (alive) {
        await stream.sleep(25_000);
        if (alive) await stream.writeSSE({ event: "ping", data: "" });
      }
    }),
  );

  // static client — four files, served from the bundle dir
  app.get("/*", (c) => {
    if (!CLIENT_DIST) return c.text("client not built — run `npm run build`", 503);
    const url = new URL(c.req.url);
    const name = url.pathname === "/" ? "index.html" : url.pathname.slice(1);
    if (!/^[a-zA-Z0-9_.-]+$/.test(name)) return c.notFound();
    const file = join(CLIENT_DIST, name);
    if (!existsSync(file)) return c.text(readFileSync(join(CLIENT_DIST, "index.html"), "utf8"), 200, { "content-type": TYPES[".html"] as string });
    const ext = name.slice(name.lastIndexOf("."));
    return c.body(readFileSync(file), 200, { "content-type": TYPES[ext] ?? "application/octet-stream", "cache-control": "no-cache" });
  });

  return { app, watcher };
}
