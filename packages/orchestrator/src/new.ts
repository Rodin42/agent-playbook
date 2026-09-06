import { execFileSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { dump, load } from "js-yaml";

const here = dirname(fileURLToPath(import.meta.url));
/** template/ at the monorepo root, whether running from dist/ or src/ */
export const TEMPLATE_DIR = [join(here, "..", "..", "..", "template"), join(here, "..", "..", "template")].find((p) => existsSync(join(p, "CONTEXT.md"))) ?? join(here, "..", "..", "..", "template");

export interface NewOptions {
  name: string;
  workspace: string;
  remote?: string;
}

/** D5: copy template → workspace project, git init + first commit, register in workspace.yaml. Never overwrites. */
export function factoryNew(opts: NewOptions): { path: string; workspaceFile: string; next: string } {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(opts.name)) throw new Error(`project name must be kebab-case: ${opts.name}`);
  const ws = resolve(opts.workspace);
  const target = join(ws, opts.name);
  if (existsSync(target)) throw new Error(`already exists: ${target} — the template seeds, it never overwrites`);
  if (!existsSync(TEMPLATE_DIR)) throw new Error(`template not found at ${TEMPLATE_DIR}`);
  mkdirSync(ws, { recursive: true });
  cpSync(TEMPLATE_DIR, target, { recursive: true, filter: (src) => !/[/\\]\.git([/\\]|$)/.test(src) });

  const cfgPath = join(target, "factory.config.yaml");
  const cfg = readFileSync(cfgPath, "utf8").replace('name: "<project-name>"', `name: "${opts.name}"`).replace('repo: "<git remote url>"', `repo: "${opts.remote ?? ""}"`);
  writeFileSync(cfgPath, cfg);

  const git = (...args: string[]) => execFileSync("git", args, { cwd: target, stdio: ["ignore", "pipe", "pipe"] });
  git("init", "-q");
  git("add", "-A");
  git("-c", "user.name=factory", "-c", "user.email=factory@users.noreply.github.com", "commit", "-q", "-m", "factory: seed from template");
  if (opts.remote) git("remote", "add", "origin", opts.remote);

  const wsFile = join(ws, "workspace.yaml");
  const doc = (existsSync(wsFile) ? (load(readFileSync(wsFile, "utf8")) as { projects?: unknown[] } | null) : null) ?? {};
  const projects = Array.isArray(doc.projects) ? doc.projects : [];
  projects.push({ name: opts.name, path: `./${opts.name}`, ...(opts.remote ? { remote: opts.remote } : {}) });
  writeFileSync(wsFile, `# workspace.yaml — registry of codebases the console manages. Paths are relative to this file.\n${dump({ projects })}`);

  return { path: target, workspaceFile: wsFile, next: `cd ${target} && open start_prompt.md — run it in a Claude Code session to finish the foundation (Stage 1 is already done)` };
}
