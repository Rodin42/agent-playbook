import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join, normalize, relative, resolve } from "node:path";

export interface FileNode {
  path: string;
  kind: "yaml" | "md" | "role" | "twin" | "locked";
  locked: boolean;
}
export interface FileGroup {
  group: string;
  files: FileNode[];
}

const P1 = "phase-1-product-development";
const P2 = "phase-2-implementation";
const P3 = "phase-3-housekeeping";

function mdFiles(root: string, rel: string, kind: FileNode["kind"], recursive = false): FileNode[] {
  const dir = join(root, rel);
  if (!existsSync(dir)) return [];
  const out: FileNode[] = [];
  for (const f of readdirSync(dir).sort()) {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) {
      if (recursive && !f.startsWith("_") && !f.startsWith(".")) out.push(...mdFiles(root, `${rel}/${f}`, kind, true));
      continue;
    }
    if (f.endsWith(".md") && f !== "README.md") out.push({ path: `${rel}/${f}`, kind, locked: false });
  }
  return out;
}

/** The mockup's file tree — every file that defines the factory, read-only in M1. `.env` is never opened. */
export function fileTree(root: string): FileGroup[] {
  const groups: FileGroup[] = [
    {
      group: "config",
      files: [
        { path: "factory.config.yaml", kind: "yaml", locked: false },
        { path: "runtime/factory.defaults.yaml", kind: "yaml", locked: false },
        { path: ".env", kind: "locked", locked: true },
      ],
    },
    {
      group: "docs",
      files: [`${P1}/project-brief.md`, `${P1}/substrate.md`, `${P1}/architecture.md`, `${P1}/feature-plan.md`].map((p) => ({ path: p, kind: "md" as const, locked: false })),
    },
    {
      group: "agents · step 1",
      files: mdFiles(root, `${P1}/agents`, "role").map((f) => (f.path.endsWith("rodin-twin.md") ? { ...f, kind: "twin" as const } : f)),
    },
    { group: "agents · step 2", files: mdFiles(root, P2, "role") },
    { group: "agents · step 3", files: mdFiles(root, P3, "role", true) },
    { group: "templates", files: mdFiles(root, `${P2}/features/_template`, "md") },
  ];
  return groups.map((g) => ({ ...g, files: g.files.filter((f) => f.locked || existsSync(join(root, f.path))) }));
}

/** Read one allow-listed file. Refuses anything outside the project or any `.env*`. */
export function readProjectFile(root: string, rel: string): { path: string; content: string } | { error: string; status: number } {
  const base = rel.split("/").pop() ?? "";
  if (base === ".env" || base.startsWith(".env")) return { error: ".env is never opened by the console", status: 403 };
  const abs = resolve(root, normalize(rel));
  const inside = !relative(root, abs).startsWith("..") && abs !== root;
  if (!inside) return { error: "outside the project", status: 403 };
  const allowed = fileTree(root).some((g) => g.files.some((f) => !f.locked && f.path === rel));
  if (!allowed) return { error: "not in the file tree", status: 404 };
  if (!existsSync(abs)) return { error: "not found", status: 404 };
  return { path: rel, content: readFileSync(abs, "utf8") };
}
