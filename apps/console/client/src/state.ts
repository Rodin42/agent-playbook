import type { ProjectView } from "@factory/core";
import type { WorkspaceInfo } from "./api.js";
import { VIEWS, type ViewId } from "./types.js";

export interface State {
  workspace: WorkspaceInfo | null;
  project: string | null;
  view: ViewId;
  data: ProjectView | null;
  live: boolean;
  error: string | null;
}

export const state: State = { workspace: null, project: null, view: "overview", data: null, live: false, error: null };

/** `#<project>/<view>` — a refresh restores exactly where you were (BUILD-PLAN §0 rule 5). */
export function readHash(): { project: string | null; view: ViewId } {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  const [p, v] = h.split("/");
  const view = (VIEWS as string[]).includes(v ?? "") ? (v as ViewId) : "overview";
  return { project: p || null, view };
}

export function writeHash(project: string | null, view: ViewId): void {
  const next = `#${project ? encodeURIComponent(project) : ""}/${view}`;
  if (location.hash !== next) history.replaceState(null, "", next);
}
