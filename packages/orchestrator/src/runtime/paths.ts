import { existsSync } from "node:fs";
import { join } from "node:path";

export const PHASE1 = "phase-1-product-development";
export const PHASE2 = "phase-2-implementation";
export const PHASE3 = "phase-3-housekeeping";
export const FEATURE_TEMPLATE = `${PHASE2}/features/_template`;

/** Where a role doc lives, relative to the project root. */
export function roleDocCandidates(role: string): string[] {
  return [`${PHASE1}/agents/${role}.md`, `${PHASE2}/${role}.md`, `${PHASE3}/${role}.md`, `${PHASE3}/log-analysis/${role.replace(/^log-analysis-/, "")}.md`];
}

export function locateRoleDoc(projectPath: string, role: string): string {
  const hit = roleDocCandidates(role).find((rel) => existsSync(join(projectPath, rel)));
  if (!hit) throw new Error(`unknown role: ${role} (looked in ${roleDocCandidates(role).join(", ")})`);
  return hit;
}

export function featureFolder(slug: string): string {
  return `${PHASE2}/features/${slug}`;
}

export interface ArtifactRef {
  /** repo-relative file path */
  path: string;
  /** optional section anchor (`implementation.md#review`) */
  section: string | null;
  /** true for `features/<slug>/*` */
  glob: boolean;
}

/**
 * Resolve one `reads:` / `writes:` entry from a role doc to a repo-relative path.
 * Returns null for non-file entries such as `<source code>` or `<pull request>`.
 * Rules: bare names live in phase-1; `features/<slug>/…` lives under phase-2.
 */
export function resolveRef(entry: string, slug: string): ArtifactRef | null {
  const withSlug = entry.replace(/<slug>/g, slug);
  if (/<[^>]+>/.test(withSlug)) return null;
  const [file, section] = withSlug.split("#");
  if (!file) return null;
  if (file.startsWith("features/")) {
    const glob = file.endsWith("/*");
    return { path: `${PHASE2}/${glob ? file.slice(0, -2) : file}`, section: section ?? null, glob };
  }
  if (file.includes("/")) return { path: file, section: section ?? null, glob: false };
  return { path: `${PHASE1}/${file}`, section: section ?? null, glob: false };
}

/** The artifact the run is judged on: the first `writes:` entry inside the feature folder, else the first file entry. */
export function primaryWrite(writes: string[], slug: string): ArtifactRef | null {
  const refs = writes.map((w) => resolveRef(w, slug)).filter((r): r is ArtifactRef => r !== null && !r.glob);
  return refs.find((r) => r.path.startsWith(`${featureFolder(slug)}/`)) ?? refs[0] ?? null;
}

export function toHttpsRepo(repo: string): string {
  const ssh = repo.match(/^git@([^:]+):(.+?)(\.git)?$/);
  if (ssh) return `https://${ssh[1]}/${ssh[2]}.git`;
  return repo.endsWith(".git") ? repo : `${repo}.git`;
}

export function repoSlug(repo: string): string {
  const m = toHttpsRepo(repo).match(/github\.com\/(.+?)\.git$/);
  return m?.[1] ?? repo;
}
