import { execFileSync } from "node:child_process";
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadEffectiveConfig, parseFrontmatter } from "@factory/core";
import { envValue, readDotEnv, requireEnv } from "./env.js";
import { harnessFor } from "./harness.js";
import { FEATURE_TEMPLATE, PHASE1, featureFolder, locateRoleDoc, primaryWrite, repoSlug, resolveRef, toHttpsRepo, type ArtifactRef } from "./paths.js";
import { composePrompt, defaultInstruction } from "./prompt.js";
import { createE2bSandbox, type SandboxPort } from "./sandbox.js";
import { verifyArtifact } from "./verify.js";
import { loadSteps, verifyStep } from "./steps.js";

export interface RunOptions {
  project: string;
  role: string;
  feature: string;
  model?: string;
  /** branch to create the feature branch from when it does not exist yet (default: main_branch) */
  base?: string;
  /** keep the sandbox alive after the run (debugging) */
  keep?: boolean;
  log?: (line: string) => void;
}

export interface RunOutcome {
  id: string;
  status: "ok" | "failed" | "escalated";
  reason: string | null;
  artifact: string | null;
  branch: string;
  commit: string | null;
  costUsd: number;
  runFile: string;
  logFile: string;
}

const REPO_DIR = "/home/user/repo";
const PROMPT_PATH = "/home/user/prompt.md";
const GIT_ID = "-c user.name=factory -c user.email=factory@users.noreply.github.com";

function stepOf(roleDocRel: string): 1 | 2 | 3 {
  return roleDocRel.startsWith("phase-1") ? 1 : roleDocRel.startsWith("phase-3") ? 3 : 2;
}

function list(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String) : typeof v === "string" ? [v] : [];
}

/** `factory run <role> <feature>` — one pipeline step in a fresh sandbox, verified by artifact, committed and pushed. */
export async function factoryRun(opts: RunOptions): Promise<RunOutcome> {
  const project = resolve(opts.project);
  const cfg = loadEffectiveConfig(project);
  if (cfg.placeholder) throw new Error("factory.config.yaml still has placeholders — finish start_prompt Stage 5b");
  const env = readDotEnv(project);
  const harness = harnessFor(cfg.harness.provider);
  requireEnv(env, ["E2B_API_KEY", "GITHUB_TOKEN", ...harness.secrets]);

  const slug = opts.feature;
  const roleDocRel = locateRoleDoc(project, opts.role);
  const roleDocText = readFileSync(join(project, roleDocRel), "utf8");
  const fm = parseFrontmatter(roleDocText);
  const reads = list(fm.data.reads);
  const writes = list(fm.data.writes).map((w) => resolveRef(w, slug)).filter((r): r is ArtifactRef => r !== null);
  const step = loadSteps(project, opts.role, slug);
  const primary = step?.targets[0]?.ref ?? primaryWrite(list(fm.data.writes), slug);
  if (!primary) throw new Error(`role ${opts.role} has no file in writes: — nothing to verify`);
  const judged = step ? step.targets.map((t) => t.ref.path) : [primary.path];
  const model = opts.model ?? cfg.models.roles.find((r) => r.role === opts.role)?.model ?? cfg.models.default.model;
  const branch = `feature/${slug}`;
  const base = opts.base ?? cfg.project.main_branch;
  const id = `${new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "")}-${opts.role}-${slug}`;
  const started = new Date().toISOString();

  // Local record lives outside the tree the sandbox commits into (.factory is gitignored); the
  // committed copy travels with the step's commit. The console merges both (core readRuns).
  const runsDir = join(project, ".factory", "runs");
  const logsDir = join(project, "runtime", "logs");
  mkdirSync(runsDir, { recursive: true });
  mkdirSync(logsDir, { recursive: true });
  const runFile = join(runsDir, `${id}.json`);
  const logFile = join(logsDir, `${id}.log`);
  const log = (line: string) => {
    appendFileSync(logFile, line.endsWith("\n") ? line : `${line}\n`);
    opts.log?.(line.replace(/\n$/, ""));
  };
  const record = (patch: Record<string, unknown>) => {
    const cur = existsSync(runFile) ? (JSON.parse(readFileSync(runFile, "utf8")) as Record<string, unknown>) : {};
    writeFileSync(runFile, `${JSON.stringify({ ...cur, ...patch }, null, 2)}\n`);
  };
  record({ id, feature: slug, role: opts.role, step: stepOf(roleDocRel), harness: harness.provider, model, sandbox: null, started, ended: null, status: "running", cost_usd: 0, tokens: { in: 0, out: 0 }, reason: null, branch });

  let sandbox: SandboxPort | null = null;
  let outcome: RunOutcome = { id, status: "failed", reason: "not started", artifact: primary.path, branch, commit: null, costUsd: 0, runFile, logFile };
  const fail = (reason: string): RunOutcome => {
    log(`FAILED: ${reason}`);
    record({ status: "failed", reason, ended: new Date().toISOString() });
    return { ...outcome, status: "failed", reason };
  };
  try {
    log(`run ${id}: role=${opts.role} feature=${slug} model=${model} harness=${harness.provider} template=${cfg.sandbox.template}`);
    sandbox = await createE2bSandbox({ apiKey: envValue(env, "E2B_API_KEY"), template: cfg.sandbox.template ?? "factory-base", timeoutMs: (cfg.sandbox.timeout_minutes ?? 30) * 60_000 });
    record({ sandbox: sandbox.id });
    log(`sandbox ${sandbox.id} created`);

    // Git auth: the token lives only in the env of git commands, never on disk.
    const gitEnv = { GITHUB_TOKEN: envValue(env, "GITHUB_TOKEN") };
    const cred = `git config --global credential.helper '!f() { echo username=x-access-token; echo password=$GITHUB_TOKEN; }; f'`;
    const https = toHttpsRepo(cfg.project.repo);
    const clone = await sandbox.exec(`${cred} && git clone -q ${https} ${REPO_DIR} && cd ${REPO_DIR} && (git checkout -q ${branch} 2>/dev/null || git checkout -q -b ${branch} origin/${base})`, { envs: gitEnv, timeoutMs: 300_000 });
    if (clone.exitCode !== 0) return (outcome = fail(`clone/checkout failed: ${clone.stderr.slice(-400)}`));
    log(`cloned ${repoSlug(cfg.project.repo)} on ${branch} (base ${base})`);

    // Seed the feature folder from _template if this is the feature's first step.
    const folder = featureFolder(slug);
    const seed = await sandbox.exec(`cd ${REPO_DIR} && if [ ! -d ${folder} ]; then cp -r ${FEATURE_TEMPLATE} ${folder} && echo seeded; fi`);
    if (seed.stdout.includes("seeded")) log(`seeded ${folder} from _template`);

    // Compose the prompt from the sandbox's own checkout (the branch is the truth, not the operator's tree).
    const readTexts: { path: string; text: string }[] = [];
    for (const r of reads) {
      const ref = resolveRef(r, slug);
      if (!ref) continue;
      if (ref.glob) {
        const ls = await sandbox.exec(`ls ${REPO_DIR}/${ref.path}/*.md 2>/dev/null`);
        for (const p of ls.stdout.trim().split("\n").filter(Boolean)) {
          const t = await sandbox.readFile(p);
          if (t !== null) readTexts.push({ path: p.replace(`${REPO_DIR}/`, ""), text: t });
        }
      } else {
        const t = await sandbox.readFile(`${REPO_DIR}/${ref.path}`);
        if (t !== null) readTexts.push({ path: ref.path, text: t });
        else log(`warning: input missing: ${ref.path}`);
      }
    }
    const before = new Map<string, string | null>();
    for (const p of judged) before.set(p, await sandbox.readFile(`${REPO_DIR}/${p}`));
    const flagsBefore = (await sandbox.exec(`ls ${REPO_DIR}/runtime/flags 2>/dev/null`)).stdout;
    log(step ? `contract: ${judged.length} target(s) from runtime/steps.yaml` : "contract: none in runtime/steps.yaml — falling back to primary write");
    const prompt = composePrompt({ role: opts.role, roleDoc: roleDocText, slug, reads: readTexts, writes, instruction: defaultInstruction(opts.role, slug, writes) });
    await sandbox.writeFile(PROMPT_PATH, prompt);
    log(`prompt: ${prompt.length} chars, ${readTexts.length} inputs`);

    // Run the harness. Exit code is informational only.
    const cmd = harness.command(model, PROMPT_PATH);
    log(`$ ${cmd}`);
    const harnessEnv = Object.fromEntries(harness.secrets.map((k) => [k, envValue(env, k)]));
    const res = await sandbox.exec(cmd, { cwd: REPO_DIR, envs: harnessEnv, timeoutMs: (cfg.sandbox.timeout_minutes ?? 30) * 60_000 });
    const parsed = harness.parse(res.stdout);
    log(`harness exit=${res.exitCode} cost=$${parsed.costUsd.toFixed(4)} tokens=${parsed.tokensIn}/${parsed.tokensOut}${parsed.parseError ? ` (${parsed.parseError})` : ""}`);
    if (res.stderr.trim()) log(`stderr: ${res.stderr.trim().slice(-2000)}`);
    log(`result: ${parsed.text.slice(0, 2000)}`);
    record({ cost_usd: parsed.costUsd, tokens: { in: parsed.tokensIn, out: parsed.tokensOut } });
    outcome = { ...outcome, costUsd: parsed.costUsd };

    // Verify by artifact against the contract — never by exit code.
    const after = new Map<string, string | null>();
    for (const p of judged) after.set(p, await sandbox.readFile(`${REPO_DIR}/${p}`));
    const verdict = step
      ? verifyStep(step, before, after)
      : { ...verifyArtifact(primary, before.get(primary.path) ?? null, after.get(primary.path) ?? null), gate: null as "pass" | "fail" | null, route: null as string | null };
    const flagsAfter = (await sandbox.exec(`ls ${REPO_DIR}/runtime/flags 2>/dev/null`)).stdout;
    const newFlag = flagsAfter.split("\n").find((f) => f.trim() && !flagsBefore.includes(f)) ?? null;
    let escalated = false;
    if (!verdict.ok) {
      if (step?.escalate && newFlag) {
        escalated = true;
        log(`escalated: ${opts.role} wrote runtime/flags/${newFlag.trim()} (${verdict.reason})`);
      } else return (outcome = fail(`artifact check: ${verdict.reason}${parsed.isError ? " (harness reported an error)" : ""}`));
    } else log(`contract ok: ${judged.join(", ")} status=${verdict.status}${verdict.gate ? ` verdict=${verdict.gate}${verdict.route ? ` → ${verdict.route}` : ""}` : ""}`);

    // First phase-2 run flips the plan entry Ready → In progress (features/README).
    if (stepOf(roleDocRel) === 2 && !escalated) {
      const planPath = `${REPO_DIR}/${PHASE1}/feature-plan.md`;
      const plan = await sandbox.readFile(planPath);
      if (plan) {
        const re = new RegExp(`^(\\|[^\\n]*\\|\\s*)Ready(\\s*\\|[^\\n]*\`features/${slug}/\`[^\\n]*)$`, "m");
        if (re.test(plan)) {
          await sandbox.writeFile(planPath, plan.replace(re, "$1In progress$2"));
          log("plan entry: Ready → In progress");
        }
      }
    }

    // The run record travels with the commit (runtime/runs is part of the trail).
    const finalStatus = escalated ? "escalated" : "ok";
    record({ status: finalStatus, ended: new Date().toISOString(), reason: escalated ? `flag runtime/flags/${newFlag?.trim()}` : null });
    await sandbox.exec(`mkdir -p ${REPO_DIR}/runtime/runs`);
    await sandbox.writeFile(`${REPO_DIR}/runtime/runs/${id}.json`, readFileSync(runFile, "utf8"));

    // Commit + push: the durable trail.
    const msg = `factory: ${opts.role} ${slug}\n\nFactory-Role: ${opts.role}\nFactory-Run: ${id}`;
    const commit = await sandbox.exec(`cd ${REPO_DIR} && git add -A && git ${GIT_ID} commit -q -F - <<'MSG'\n${msg}\nMSG\ngit rev-parse HEAD && git push -q -u origin ${branch}`, { envs: gitEnv, timeoutMs: 120_000 });
    if (commit.exitCode !== 0) return (outcome = fail(`commit/push failed: ${commit.stderr.slice(-400)}`));
    const sha = commit.stdout.trim().split("\n").pop() ?? null;
    log(`pushed ${branch} @ ${sha?.slice(0, 7)}`);
    try {
      execFileSync("git", ["fetch", "-q", "origin", `${branch}:${branch}`], { cwd: project, stdio: "ignore" });
    } catch {
      log("note: could not update the local branch ref (checked out?) — run git fetch");
    }
    record({ commit: sha });
    await updateWorktree(project, slug, branch, log);
    outcome = { ...outcome, status: finalStatus, reason: escalated ? `flag runtime/flags/${newFlag?.trim()}` : null, commit: sha };
    return outcome;
  } catch (err) {
    return (outcome = fail(err instanceof Error ? err.message : String(err)));
  } finally {
    if (sandbox && !opts.keep) {
      await sandbox.destroy().catch(() => undefined);
      log(`sandbox ${sandbox.id} destroyed`);
    } else if (sandbox) log(`sandbox ${sandbox.id} kept alive (--keep)`);
  }
}

/**
 * The console reads the operator's working tree; sandbox commits live on origin/feature/<slug>.
 * Keep a worktree per feature under .factory/worktrees/<slug> so the console can overlay it (A7).
 */
async function updateWorktree(project: string, slug: string, branch: string, log: (l: string) => void): Promise<void> {
  const dir = join(project, ".factory", "worktrees", slug);
  const git = (...args: string[]) => execFileSync("git", args, { cwd: project, stdio: ["ignore", "pipe", "pipe"] }).toString().trim();
  try {
    if (!existsSync(dir)) {
      mkdirSync(join(project, ".factory", "worktrees"), { recursive: true });
      git("worktree", "add", "-q", "--force", dir, branch);
    } else {
      execFileSync("git", ["-C", dir, "checkout", "-q", branch], { stdio: "ignore" });
      execFileSync("git", ["-C", dir, "reset", "-q", "--hard", `origin/${branch}`], { stdio: "ignore" });
    }
    log(`worktree .factory/worktrees/${slug} at ${branch}`);
  } catch (err) {
    log(`note: worktree update failed: ${err instanceof Error ? err.message.split("\n")[0] : String(err)}`);
  }
}
