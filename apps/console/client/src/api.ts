import type { ProjectSummary, ProjectView } from "@factory/core";
import type { FileGroup } from "./types.js";

async function get<T>(url: string): Promise<T> {
  const r = await fetch(url, { headers: { accept: "application/json" } });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return (await r.json()) as T;
}

export interface WorkspaceInfo {
  file: string | null;
  dir: string;
  projects: ProjectSummary[];
}

export const api = {
  workspace: () => get<WorkspaceInfo>("/api/workspace"),
  project: (name: string) => get<ProjectView>(`/api/projects/${encodeURIComponent(name)}`),
  log: (name: string, run: string, lines = 120) => get<{ run: string; lines: string[] }>(`/api/projects/${encodeURIComponent(name)}/runs/${encodeURIComponent(run)}/log?lines=${lines}`),
  files: (name: string) => get<FileGroup[]>(`/api/projects/${encodeURIComponent(name)}/files`),
  file: (name: string, path: string) => get<{ path: string; content: string }>(`/api/projects/${encodeURIComponent(name)}/file?path=${encodeURIComponent(path)}`),
};

/** SSE: the server pushes `changed` when a project's files change; the client re-derives by re-fetching. */
export function subscribe(onChanged: (project: string) => void, onState: (open: boolean) => void): () => void {
  let es: EventSource | null = null;
  let retry = 1000;
  let closed = false;
  const connect = () => {
    if (closed) return;
    es = new EventSource("/api/events");
    es.addEventListener("hello", () => { retry = 1000; onState(true); });
    es.addEventListener("changed", (e) => {
      try { onChanged((JSON.parse((e as MessageEvent).data) as { project: string }).project); } catch { /* ignore */ }
    });
    es.onerror = () => {
      onState(false);
      es?.close();
      setTimeout(connect, retry);
      retry = Math.min(retry * 2, 15000);
    };
  };
  connect();
  return () => { closed = true; es?.close(); };
}
