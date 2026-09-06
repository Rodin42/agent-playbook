import { execFileSync } from "node:child_process";

/** BUILD-PLAN §0 rule 6: commits not yet on origin. null when not a repo / no upstream. */
export function unpushedCount(repoPath: string): number | null {
  try {
    const out = execFileSync("git", ["rev-list", "--count", "@{u}..HEAD"], { cwd: repoPath, stdio: ["ignore", "pipe", "ignore"], timeout: 3000 }).toString().trim();
    const n = Number(out);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}
