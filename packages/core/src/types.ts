// Data contracts for the agent factory console (BUILD-PLAN §2).
// Everything here is DERIVED from files in a project repo; nothing is stored separately.

export type Step = 1 | 2 | 3;

/** Console task status = feature-plan `Status:` mapped (BUILD-PLAN §2.1). No new field. */
export type ConsoleStatus = "waiting" | "approved" | "started" | "finished";

export const PLAN_STATUS_TO_CONSOLE: Record<string, ConsoleStatus> = {
  idea: "waiting",
  shaping: "waiting",
  ready: "approved",
  "in progress": "started",
  "in-progress": "started",
  shipped: "finished",
  observing: "finished",
};

export interface ProjectRef {
  name: string;
  /** absolute path */
  path: string;
  remote?: string;
}

export interface Workspace {
  /** absolute path of workspace.yaml, or null when the workspace is a bare folder */
  file: string | null;
  dir: string;
  projects: ProjectRef[];
}

export interface OpenQuestion {
  text: string;
  answered: boolean;
}

/** One entry of feature-plan.md: the table row + the `### F-NNN` block, merged by id. */
export interface FeatureEntry {
  id: string;
  name: string;
  problem: string;
  priority: string;
  /** the literal feature-plan Status column (Idea / Shaping / Ready / In progress / Shipped / Observing) */
  planStatus: string;
  status: ConsoleStatus;
  folder: string | null;
  po: string | null;
  hypothesis: string | null;
  metric: string | null;
  scope: string | null;
  dependsOn: string | null;
  sharedWork: string | null;
  substrateImpact: string | null;
  priorityWhy: string | null;
  answeredInAdvance: string | null;
  /** 0–3: how many of the three predictable questions the PO answered at intake */
  answeredInAdvanceCount: number;
  openQuestions: OpenQuestion[];
  signOff: string | null;
  source: string | null;
  /** derived intake check: "complete" | "N gap(s) → PO" | "high-stakes — escalated" */
  twinCheck: string;
  fromPhase3: boolean;
  line: number;
}

export type DiscoveryStatus = "draft" | "in-review" | "final" | "superseded";
export type ImplementationStatus = "in-progress" | "in-review" | "qa" | "merged";

export const ARTIFACT_KINDS = [
  "brainstorming",
  "online-research",
  "edge-case-analysis",
  "architecture-analysis",
  "masterplan",
  "implementation-plan",
  "implementation",
] as const;
export type ArtifactKind = (typeof ARTIFACT_KINDS)[number];

export interface Artifact {
  kind: ArtifactKind;
  /** path relative to the project root */
  path: string;
  exists: boolean;
  /** frontmatter `status:` as written, or null */
  status: string | null;
  frontmatter: Record<string, unknown>;
  body: string;
}

export type Verdict = "pass" | "fail" | null;
export interface GateVerdict {
  verdict: Verdict;
  /** for a fail: the role it was routed to, if stated */
  route: string | null;
  raw: string | null;
}

export interface PrInfo {
  number: number | null;
  state: "open" | "merged" | "closed" | null;
  url: string | null;
}

/** Pipeline board station states — the mockup's classes: "" | here | done | wait | block. */
export type StationState = "pending" | "here" | "done" | "wait" | "block";

export const STATIONS = [
  { id: "discovery", label: "discovery" },
  { id: "masterplan", label: "masterplan" },
  { id: "plan", label: "impl. plan" },
  { id: "build", label: "build" },
  { id: "adversarial", label: "adversarial" },
  { id: "pre-pr-qa", label: "pre-PR QA" },
  { id: "pr", label: "PR + merge" },
  { id: "post-pr-qa", label: "post-PR QA" },
  { id: "observing", label: "observing" },
] as const;
export type StationId = (typeof STATIONS)[number]["id"];

export interface Station {
  id: StationId;
  label: string;
  state: StationState;
  /** tooltip: done / running / waits for you / exception — with the concrete reason */
  detail: string;
}

export interface PipelineTag {
  kind: "dim" | "org" | "red";
  text: string;
  link: { view: string; flagId?: string; runId?: string } | null;
}

export interface FeaturePipeline {
  id: string;
  name: string;
  slug: string;
  folder: string;
  branch: string | null;
  stations: Station[];
  tag: PipelineTag | null;
  /** last station that is done */
  stage: StationId | null;
  /** first station that is here/wait/block, else "done" or "pending" */
  state: StationState;
  artifacts: Artifact[];
  verdicts: { review: GateVerdict; qa: GateVerdict };
  pr: PrInfo;
  openFlagIds: string[];
  latestRun: RunRecord | null;
  costUsd: number;
}

export type FlagType = "sign-off" | "red-line" | "triage" | "rollback" | "system";

export interface FlagOption {
  key: string;
  text: string;
  recommended: boolean;
}

export interface FlagDecision {
  choice: string;
  by: string;
  at: string;
  note: string | null;
}

/** runtime/flags/<id>.md (BUILD-PLAN §2.2) */
export interface Flag {
  id: string;
  type: FlagType;
  step: Step;
  feature: string | null;
  title: string;
  created: string;
  status: "open" | "resolved";
  recommendation: string | null;
  from: string | null;
  question: string;
  options: FlagOption[];
  blocked: string[];
  decision: FlagDecision | null;
  path: string;
}

export type RunStatus = "running" | "ok" | "failed" | "stopped" | "escalated";

/** runtime/runs/<runid>.json (BUILD-PLAN §2.3) */
export interface RunRecord {
  id: string;
  feature: string | null;
  role: string;
  step: Step;
  harness: string;
  model: string;
  sandbox: string | null;
  started: string;
  ended: string | null;
  status: RunStatus;
  cost_usd: number;
  tokens: { in: number; out: number };
  reason: string | null;
  /** path of the log relative to the project root, if it exists */
  logPath: string | null;
  durationSec: number | null;
}

/** one line of runtime/decisions.log (JSONL, BUILD-PLAN §2.4) */
export interface Decision {
  at: string;
  actor: "operator" | "rodin-twin" | string;
  action: string;
  subject: string;
  rule: string | null;
  step: Step | null;
}

export type Tick = "ok" | "wip" | "no";

export interface PreworkDoc {
  label: string;
  path: string;
  tick: Tick;
  note: string | null;
}

export interface PreworkCard {
  who: string;
  title: string;
  docs: PreworkDoc[];
  blurb: string;
}

export interface StepSummary {
  step: Step;
  title: string;
  line: string;
  escalations: number;
}

export interface Overview {
  setupComplete: boolean;
  cards: PreworkCard[];
  steps: StepSummary[];
}

export interface SecretKey {
  name: string;
  set: boolean;
  required: boolean;
  note: string | null;
}

/** presence only — values never leave .env (BUILD-PLAN §0 rule 2) */
export interface Secrets {
  file: boolean;
  keys: SecretKey[];
}

export interface RoleModel {
  role: string;
  provider: string;
  model: string;
}

export interface EffectiveConfig {
  project: { name: string; repo: string; main_branch: string };
  sandbox: { provider: string; template: string | null; timeout_minutes: number | null; kill_on_done: boolean | null };
  harness: { provider: string };
  models: { default: { provider: string; model: string }; roles: RoleModel[] };
  console: { run_mode: string; paused: boolean; max_concurrent_sandboxes: number; budget_monthly_usd: number | null; notify: { kind: string; url: string } };
  /** true when the project config still carries template placeholders */
  placeholder: boolean;
  files: { config: boolean; defaults: boolean };
}

export interface FinishedEntry {
  id: string;
  name: string;
  folder: string | null;
  mergedAt: string | null;
  pr: PrInfo;
  costUsd: number;
}

export interface CostSummary {
  todayUsd: number;
  sevenDayUsd: number;
  byModel7d: { model: string; usd: number; calls: number; share: number }[];
}

export interface TopStrip {
  running: number;
  cost: CostSummary;
  ciMain: "green" | "red" | "unknown";
  escalationsOpen: number;
  unpushed: number | null;
}

export interface Counts {
  backlog: number;
  finished: number;
  pipeline: number;
  findings: number;
  escalations: Record<Step, number>;
}

export interface ProjectView {
  ref: ProjectRef;
  branch: string;
  subtitle: string;
  overview: Overview;
  config: EffectiveConfig;
  secrets: Secrets;
  backlog: FeatureEntry[];
  pipeline: FeaturePipeline[];
  finished: FinishedEntry[];
  findings: FeatureEntry[];
  runs: RunRecord[];
  flags: Flag[];
  decisions: Decision[];
  counts: Counts;
  strip: TopStrip;
  generatedAt: string;
}
