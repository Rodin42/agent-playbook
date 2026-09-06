import { gateVerdicts, postMergeFilled, prInfo } from "./artifacts.js";
import {
  STATIONS,
  type Artifact,
  type Flag,
  type PipelineTag,
  type RunRecord,
  type Station,
  type StationId,
  type StationState,
} from "./types.js";

export interface StationInput {
  artifacts: Artifact[];
  planStatus: string;
  openFlags: Flag[];
  latestRun: RunRecord | null;
}

export interface StationOutput {
  stations: Station[];
  tag: PipelineTag | null;
  stage: StationId | null;
  state: StationState;
}

const DISCOVERY = ["brainstorming", "online-research", "edge-case-analysis", "architecture-analysis"] as const;

function docStation(id: StationId, label: string, a: Artifact | undefined): Station {
  if (!a || !a.exists) return { id, label, state: "pending", detail: `${label}: not started` };
  switch (a.status) {
    case "final":
      return { id, label, state: "done", detail: `${label}: final` };
    case "superseded":
      return { id, label, state: "block", detail: `${label}: superseded without a successor` };
    case "in-review":
      return { id, label, state: "here", detail: `${label}: in review` };
    default:
      return { id, label, state: "here", detail: `${label}: ${a.status ?? "draft"}` };
  }
}

/** BUILD-PLAN §2.1 — the nine stations of the mockup's ruler, derived from artifacts. */
export function deriveStations(input: StationInput): StationOutput {
  const byKind = new Map(input.artifacts.map((a) => [a.kind, a]));
  const impl = byKind.get("implementation");
  const implStatus = impl?.exists ? (impl.status ?? "in-progress") : null;
  const { review, qa } = gateVerdicts(impl);
  const pr = prInfo(impl);
  const merged = implStatus === "merged" || pr.state === "merged";
  const postMerge = postMergeFilled(impl);
  const plan = input.planStatus.toLowerCase();
  const run = input.latestRun;
  const label = (id: StationId) => STATIONS.find((s) => s.id === id)?.label ?? id;

  const st: Station[] = [];

  // discovery: four artifacts
  const disc = DISCOVERY.map((k) => byKind.get(k)).filter((a): a is Artifact => !!a);
  const present = disc.filter((a) => a.exists);
  if (present.length === 0) st.push({ id: "discovery", label: label("discovery"), state: "pending", detail: "discovery: not started" });
  else if (present.some((a) => a.status === "superseded")) {
    const s = present.find((a) => a.status === "superseded") as Artifact;
    st.push({ id: "discovery", label: label("discovery"), state: "block", detail: `discovery: ${s.kind} superseded without a successor` });
  } else if (present.length === 4 && present.every((a) => a.status === "final")) {
    st.push({ id: "discovery", label: label("discovery"), state: "done", detail: "discovery: all four final" });
  } else {
    const finals = present.filter((a) => a.status === "final").length;
    const open = present.filter((a) => a.status !== "final").map((a) => `${a.kind} ${a.status ?? "draft"}`);
    st.push({ id: "discovery", label: label("discovery"), state: "here", detail: `discovery: ${finals} of 4 final · ${open.join(", ")}` });
  }

  st.push(docStation("masterplan", label("masterplan"), byKind.get("masterplan")));
  st.push(docStation("plan", label("plan"), byKind.get("implementation-plan")));

  // build
  if (!impl?.exists) st.push({ id: "build", label: label("build"), state: "pending", detail: "build: not started" });
  else if (implStatus === "in-progress") {
    if (run && run.status === "failed") st.push({ id: "build", label: label("build"), state: "block", detail: `build: run ${run.id} failed${run.reason ? ` — ${run.reason}` : ""}` });
    else st.push({ id: "build", label: label("build"), state: "here", detail: run && run.status === "running" ? `build: ${run.role} in sandbox ${run.sandbox ?? "?"}` : "build: in progress" });
  } else st.push({ id: "build", label: label("build"), state: "done", detail: "build: complete" });

  // adversarial review
  if (review.verdict === "pass") st.push({ id: "adversarial", label: label("adversarial"), state: "done", detail: "adversarial review: pass" });
  else if (review.verdict === "fail") st.push({ id: "adversarial", label: label("adversarial"), state: "block", detail: `adversarial review: fail${review.route ? ` → ${review.route}` : ""}` });
  else if (implStatus === "in-review") st.push({ id: "adversarial", label: label("adversarial"), state: "here", detail: "adversarial review: in progress" });
  else if (implStatus === "qa" || merged) st.push({ id: "adversarial", label: label("adversarial"), state: "done", detail: "adversarial review: passed (status advanced)" });
  else st.push({ id: "adversarial", label: label("adversarial"), state: "pending", detail: "adversarial review: pending" });

  // pre-PR QA
  if (qa.verdict === "pass") st.push({ id: "pre-pr-qa", label: label("pre-pr-qa"), state: "done", detail: "pre-PR QA: pass" });
  else if (qa.verdict === "fail") st.push({ id: "pre-pr-qa", label: label("pre-pr-qa"), state: "block", detail: `pre-PR QA: fail${qa.route ? ` → ${qa.route}` : ""}` });
  else if (implStatus === "qa") st.push({ id: "pre-pr-qa", label: label("pre-pr-qa"), state: "here", detail: "pre-PR QA: in progress" });
  else if (merged) st.push({ id: "pre-pr-qa", label: label("pre-pr-qa"), state: "done", detail: "pre-PR QA: passed (status advanced)" });
  else st.push({ id: "pre-pr-qa", label: label("pre-pr-qa"), state: "pending", detail: "pre-PR QA: pending" });

  // PR + merge
  const prLabel = pr.number ? `PR #${pr.number}` : "PR";
  if (merged) st.push({ id: "pr", label: label("pr"), state: "done", detail: `${prLabel}: merged` });
  else if (pr.state === "open") st.push({ id: "pr", label: label("pr"), state: "here", detail: `${prLabel}: open` });
  else if (pr.state === "closed") st.push({ id: "pr", label: label("pr"), state: "block", detail: `${prLabel}: closed without merge` });
  else st.push({ id: "pr", label: label("pr"), state: "pending", detail: "PR: not opened" });

  // post-PR QA
  if (postMerge) st.push({ id: "post-pr-qa", label: label("post-pr-qa"), state: "done", detail: "post-PR QA: recorded" });
  else if (merged) st.push({ id: "post-pr-qa", label: label("post-pr-qa"), state: "here", detail: "post-PR QA: watching the health window" });
  else st.push({ id: "post-pr-qa", label: label("post-pr-qa"), state: "pending", detail: "post-PR QA: pending" });

  // observing
  if (plan === "observing") st.push({ id: "observing", label: label("observing"), state: "here", detail: "observing: Phase 3 watching the success metric" });
  else if (plan === "shipped" && postMerge) st.push({ id: "observing", label: label("observing"), state: "done", detail: "observing: closed" });
  else st.push({ id: "observing", label: label("observing"), state: "pending", detail: "observing: pending" });

  // flags overlay: the current station waits for the operator (orange) or is blocked (red)
  const current = st.find((s) => s.state === "here" || s.state === "block") ?? st.find((s) => s.state === "pending");
  let tag: PipelineTag | null = null;
  const hard = input.openFlags.find((f) => f.type === "red-line" || f.type === "system" || f.type === "rollback");
  const soft = input.openFlags.find((f) => f.type === "sign-off" || f.type === "triage");
  if (hard && current) {
    current.state = "block";
    current.detail = `${current.label}: ${hard.type} — ${hard.title}`;
    tag = { kind: "red", text: `${hard.type === "red-line" ? "red line" : hard.type}: ${hard.title}`, link: { view: `s${hard.step}-esc`, flagId: hard.id } };
  } else if (soft && current) {
    if (current.state !== "block") {
      current.state = "wait";
      current.detail = `${current.label}: waits for you — ${soft.title}`;
    }
    tag = { kind: "org", text: `${soft.title} — waiting for your ${soft.type === "triage" ? "triage" : "sign-off"}`, link: { view: `s${soft.step}-esc`, flagId: soft.id } };
  } else if (run && run.status === "failed" && current?.state === "block") {
    tag = { kind: "red", text: current.detail, link: { view: "s2-runs", runId: run.id } };
  } else if (run && run.status === "running") {
    tag = { kind: "dim", text: `${run.role} in sandbox ${run.sandbox ?? "?"} · ${run.model}`, link: { view: "s2-runs", runId: run.id } };
  } else if (current && current.state !== "pending") {
    tag = { kind: current.state === "block" ? "red" : "dim", text: current.detail, link: null };
  }

  const doneIds = st.filter((s) => s.state === "done").map((s) => s.id);
  const stage = doneIds.length ? (doneIds[doneIds.length - 1] as StationId) : null;
  const state: StationState = st.some((s) => s.state === "block")
    ? "block"
    : st.some((s) => s.state === "wait")
      ? "wait"
      : st.some((s) => s.state === "here")
        ? "here"
        : st.every((s) => s.state === "done")
          ? "done"
          : "pending";
  return { stations: st, tag, stage, state };
}
