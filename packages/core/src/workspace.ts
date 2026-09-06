import { dirname, isAbsolute, join, resolve } from "node:path";
import { load as yamlLoad } from "js-yaml";
import { exists, listDirs, readText } from "./fs.js";
import type { ProjectRef, Workspace } from "./types.js";

/**
 * Load a workspace: a `workspace.yaml` (D4) or, failing that, a folder whose
 * subfolders that contain `factory.config.yaml` are the projects.
 */
export function loadWorkspace(pathOrFile: string): Workspace {
  const abs = resolve(pathOrFile);
  const file = abs.endsWith(".yaml") || abs.endsWith(".yml") ? abs : join(abs, "workspace.yaml");
  const dir = dirname(file);
  if (exists(file)) {
    const text = readText(file) ?? "";
    let doc: unknown = null;
    try {
      doc = yamlLoad(text);
    } catch {
      doc = null;
    }
    const raw = (doc as { projects?: unknown } | null)?.projects;
    const projects: ProjectRef[] = [];
    if (Array.isArray(raw)) {
      for (const p of raw) {
        if (!p || typeof p !== "object") continue;
        const o = p as Record<string, unknown>;
        const name = typeof o.name === "string" ? o.name : null;
        const path = typeof o.path === "string" ? o.path : null;
        if (!name || !path) continue;
        projects.push({
          name,
          path: isAbsolute(path) ? path : resolve(dir, path),
          remote: typeof o.remote === "string" ? o.remote : undefined,
        });
      }
    }
    return { file, dir, projects };
  }
  // bare folder: every subfolder with a factory.config.yaml is a project
  const projects = listDirs(abs)
    .filter((d) => exists(join(abs, d, "factory.config.yaml")))
    .map((d) => ({ name: d, path: join(abs, d) }));
  return { file: null, dir: abs, projects };
}
