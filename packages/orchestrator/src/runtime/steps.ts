import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { load } from "js-yaml";
import { parseFrontmatter, parseVerdict, hasPlaceholder } from "@factory/core";
import { resolveRef, type ArtifactRef } from "./paths.js";

/** One judged target of a role run — see template/runtime/steps.yaml for the semantics. */
export interface StepTarget {
  ref: ArtifactRef;
  status?: string;
  secondPass: boolean;
  section?: string;
  verdict: boolean;
  statusOnPass?: string;
  statusOnFail?: string;
  frontmatter?: string;
}

export interface RoleStep {
  role: string;
  targets: StepTarget[];
  mayEdit: string[];
  escalate: boolean;
}

interface RawTarget {
  path: string;
  status?: string;
  second_pass?: boolean;
  section?: string;
  verdict?: boolean;
  status_on_pass?: string;
  status_on_fail?: string;
  frontmatter?: string;
}

export function parseSteps(yamlText: string, role: string, slug: string): RoleStep | null {
  const doc = load(yamlText) as { roles?: Record<string, { targets?: RawTarget[]; may_edit?: string[]; escalate?: boolean }> } | null;
  const r = doc?.roles?.[role];
  if (!r) return null;
  const targets: StepTarget[] = [];
  for (const t of r.targets ?? []) {
    const ref = resolveRef(t.path, slug);
    if (!ref || ref.glob) continue;
    targets.push({
      ref: { ...ref, section: t.section ?? ref.section },
      status: t.status,
      secondPass: t.second_pass === true,
      section: t.section,
      verdict: t.verdict === true,
      statusOnPass: t.status_on_pass,
      statusOnFail: t.status_on_fail,
      frontmatter: t.frontmatter,
    });
  }
  return { role, targets, mayEdit: r.may_edit ?? [], escalate: r.escalate === true };
}

export function loadSteps(projectPath: string, role: string, slug: string): RoleStep | null {
  const p = join(projectPath, "runtime", "steps.yaml");
  if (!existsSync(p)) return null;
  return parseSteps(readFileSync(p, "utf8"), role, slug);
}

export interface ContractVerdict {
  ok: boolean;
  reason: string | null;
  /** status of the first target after the run */
  status: string | null;
  /** gate verdict when the step is a gate */
  gate: "pass" | "fail" | null;
  route: string | null;
}

function sectionText(body: string, name: string): string | null {
  const re = new RegExp(`^##\\s+${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`, "im");
  const m = re.exec(body);
  if (!m) return null;
  const rest = body.slice(m.index + m[0].length);
  const next = /^##\s+/m.exec(rest);
  return next ? rest.slice(0, next.index) : rest;
}

/** Judge one run against its contract. `before`/`after` are keyed by repo-relative path. */
export function verifyStep(step: RoleStep, before: Map<string, string | null>, after: Map<string, string | null>): ContractVerdict {
  let changed = false;
  let firstStatus: string | null = null;
  let gate: "pass" | "fail" | null = null;
  let route: string | null = null;
  for (const t of step.targets) {
    const p = t.ref.path;
    const text = after.get(p) ?? null;
    if (text === null) return fail(`not written: ${p}`);
    const prev = before.get(p) ?? null;
    if (prev !== text) changed = true;
    const fm = parseFrontmatter(text);
    if (!fm.valid) return fail(`frontmatter does not parse: ${p}`);
    const fmEnd = text.indexOf("\n---", 4);
    if (fmEnd > 0 && hasPlaceholder(text.slice(0, fmEnd))) return fail(`placeholders left in frontmatter: ${p}`);
    const status = typeof fm.data.status === "string" ? fm.data.status : null;
    firstStatus ??= status;
    if (t.section) {
      const sec = sectionText(fm.body, t.section);
      if (sec === null) return fail(`section "## ${t.section}" missing in ${p}`);
      if (hasPlaceholder(sec)) return fail(`placeholders left in "## ${t.section}" of ${p}`);
      if (t.verdict) {
        const v = parseVerdict(sec);
        if (!v.verdict) return fail(`no literal verdict line in "## ${t.section}" of ${p}`);
        gate = v.verdict;
        route = v.route;
        const want = v.verdict === "pass" ? t.statusOnPass : t.statusOnFail;
        if (want && status !== want) return fail(`status is "${status}", expected "${want}" after verdict ${v.verdict}`);
        continue;
      }
    }
    if (t.frontmatter) {
      const v = fm.data[t.frontmatter];
      if (v === undefined || v === null || v === "" || (typeof v === "string" && hasPlaceholder(v))) return fail(`frontmatter "${t.frontmatter}:" not set in ${p}`);
    }
    if (t.status && status !== t.status) return fail(`status is "${status ?? ""}", expected "${t.status}" in ${p}`);
    if (t.secondPass && prev === text) return fail(`second pass did not change ${p}`);
  }
  if (!changed) return fail("nothing changed");
  return { ok: true, reason: null, status: firstStatus, gate, route };

  function fail(reason: string): ContractVerdict {
    return { ok: false, reason, status: firstStatus, gate, route };
  }
}
