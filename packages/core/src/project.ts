import { join } from "node:path";
import { gateVerdicts, prInfo, readArtifacts, resolveFeatureFolder } from "./artifacts.js";
import { loadEffectiveConfig, readSecretsPresence } from "./config.js";
import { readDecisions } from "./decisions.js";
import { parseFeaturePlan, slugify } from "./feature-plan.js";
import { readFlags } from "./flags.js";
import { exists, readText, str } from "./fs.js";
import { buildOverview } from "./prework.js";
import { costSummary, readRuns } from "./runs.js";
import { deriveStations } from "./stations.js";
import type { Artifact, Counts, FeatureEntry, FeaturePipeline, FinishedEntry, Flag, ProjectRef, ProjectView, RunRecord, Step } from "./types.js";

const PLAN = "phase-1-product-development/feature-plan.md";

export function readFeaturePlan(projectPath: string): FeatureEntry[] {
  return parseFeaturePlan(readText(join(projectPath, PLAN)) ?? "");
}

function featureOf(f: Flag | RunRecord, id: string): boolean {
  return (f.feature ?? "").toUpperCase() === id.toUpperCase();
}

/** Everything the console shows for one project, derived from its files. Pure over the path. */
export function deriveProject(ref: ProjectRef, now = new Date()): ProjectView {
  const path = ref.path;
  const cfg = loadEffectiveConfig(path);
  const secrets = readSecretsPresence(path, cfg);
  const entries = readFeaturePlan(path);
  const flags = readFlags(path);
  const runs = readRuns(path);
  const decisions = readDecisions(path);
  const openFlags = flags.filter((f) => f.status === "open");

  // intake check gains the escalation signal once flags are known
  for (const e of entries) {
    if (openFlags.some((f) => f.type === "triage" && featureOf(f, e.id))) e.twinCheck = "high-stakes — escalated";
  }

  const pipeline: FeaturePipeline[] = entries
    .filter((e) => e.status === "started")
    .map((e) => {
      const folderRel = e.folder ?? `features/${slugify(e.name)}`;
      const folderAbs = resolveFeatureFolder(path, folderRel);
      const artifacts = readArtifacts(path, folderAbs);
      const impl = artifacts.find((a) => a.kind === "implementation");
      const featureRuns = runs.filter((r) => featureOf(r, e.id));
      const latestRun = featureRuns[0] ?? null;
      const flagsFor = openFlags.filter((f) => featureOf(f, e.id));
      const derived = deriveStations({ artifacts, planStatus: e.planStatus, openFlags: flagsFor, latestRun });
      const folderExists = exists(folderAbs);
      const tag = folderExists ? derived.tag : { kind: "red" as const, text: `feature folder missing: ${folderRel} — copy features/_template/ to start`, link: null };
      const { review, qa } = gateVerdictsOf(artifacts);
      return {
        id: e.id,
        name: e.name,
        slug: folderRel.replace(/^features\//, ""),
        folder: folderRel,
        branch: str(impl?.frontmatter.branch) ?? null,
        stations: derived.stations,
        tag,
        stage: derived.stage,
        state: folderExists ? derived.state : "block",
        artifacts,
        verdicts: { review, qa },
        pr: prInfo(impl),
        openFlagIds: flagsFor.map((f) => f.id),
        latestRun,
        costUsd: round(featureRuns.reduce((a, r) => a + r.cost_usd, 0)),
      };
    });

  const finished: FinishedEntry[] = entries
    .filter((e) => e.status === "finished")
    .map((e) => {
      const folderAbs = resolveFeatureFolder(path, e.folder ?? `features/${slugify(e.name)}`);
      const impl = readArtifacts(path, folderAbs).find((a) => a.kind === "implementation");
      const mergeDecision = decisions.find((d) => /merge/i.test(d.action) && d.subject.toUpperCase().includes(e.id.toUpperCase()));
      return {
        id: e.id,
        name: e.name,
        folder: e.folder,
        mergedAt: str(impl?.frontmatter.merged_at) ?? str(impl?.frontmatter.merged) ?? mergeDecision?.at ?? null,
        pr: prInfo(impl),
        costUsd: round(runs.filter((r) => featureOf(r, e.id)).reduce((a, r) => a + r.cost_usd, 0)),
      };
    });

  const findings = entries.filter((e) => e.fromPhase3 && e.status !== "finished");
  const escalations: Record<Step, number> = { 1: 0, 2: 0, 3: 0 };
  for (const f of openFlags) escalations[f.step] += 1;
  const counts: Counts = {
    backlog: entries.filter((e) => e.status !== "finished").length,
    finished: finished.length,
    pipeline: pipeline.length,
    findings: findings.length,
    escalations,
  };
  const overview = buildOverview(path, cfg, secrets, counts);
  const branch = cfg.project.main_branch;
  const subtitle = overview.setupComplete ? `${branch} · ${counts.pipeline} feature${counts.pipeline === 1 ? "" : "s"} in flight` : `${branch} · setup not finished`;

  return {
    ref,
    branch,
    subtitle,
    overview,
    config: cfg,
    secrets,
    backlog: entries.filter((e) => e.status !== "finished"),
    pipeline,
    finished,
    findings,
    runs,
    flags,
    decisions,
    counts,
    strip: {
      running: runs.filter((r) => r.status === "running").length,
      cost: costSummary(runs, now),
      ciMain: "unknown",
      escalationsOpen: openFlags.length,
      unpushed: null,
    },
    generatedAt: now.toISOString(),
  };
}

function gateVerdictsOf(artifacts: Artifact[]) {
  return gateVerdicts(artifacts.find((a) => a.kind === "implementation"));
}
const round = (n: number) => Math.round(n * 100) / 100;

export interface ProjectSummary {
  name: string;
  path: string;
  remote: string | null;
  subtitle: string;
  setupComplete: boolean;
  escalationsOpen: number;
}

export function summarizeProjects(refs: ProjectRef[]): ProjectSummary[] {
  return refs.map((ref) => {
    if (!exists(ref.path)) return { name: ref.name, path: ref.path, remote: ref.remote ?? null, subtitle: "path not found", setupComplete: false, escalationsOpen: 0 };
    const v = deriveProject(ref);
    return { name: ref.name, path: ref.path, remote: ref.remote ?? null, subtitle: v.subtitle, setupComplete: v.overview.setupComplete, escalationsOpen: v.strip.escalationsOpen };
  });
}
