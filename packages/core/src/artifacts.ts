import { join } from "node:path";
import { exists, readFrontmatter, str } from "./fs.js";
import { ARTIFACT_KINDS, type Artifact, type ArtifactKind, type GateVerdict, type PrInfo } from "./types.js";

/** `features/<slug>` in the plan lives under phase-2-implementation/ in the repo. */
export function resolveFeatureFolder(projectPath: string, folder: string): string {
  const rel = folder.replace(/^\.?\//, "").replace(/\/$/, "");
  const candidates = [join(projectPath, "phase-2-implementation", rel), join(projectPath, rel)];
  return candidates.find((c) => exists(c)) ?? (candidates[0] as string);
}

export function readArtifacts(projectPath: string, folderAbs: string): Artifact[] {
  const relBase = folderAbs.startsWith(projectPath) ? folderAbs.slice(projectPath.length + 1) : folderAbs;
  return ARTIFACT_KINDS.map((kind: ArtifactKind): Artifact => {
    const p = join(folderAbs, `${kind}.md`);
    const fm = readFrontmatter(p);
    return {
      kind,
      path: `${relBase}/${kind}.md`,
      exists: fm !== null,
      status: fm ? str(fm.data.status)?.toLowerCase() ?? null : null,
      frontmatter: fm?.data ?? {},
      body: fm?.body ?? "",
    };
  });
}

function section(body: string, heading: RegExp): string | null {
  const lines = body.split(/\r?\n/);
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    const l = lines[i] ?? "";
    if (start === -1) {
      if (/^##\s/.test(l) && heading.test(l)) start = i + 1;
    } else if (/^##\s/.test(l)) {
      return lines.slice(start, i).join("\n");
    }
  }
  return start === -1 ? null : lines.slice(start).join("\n");
}

/** `**Verdict:** pass` / `**Verdict:** fail — code wrong → implementer`; the template's own
 *  instruction line (`pass → pre-PR QA · fail → …`) counts as not filled in. */
export function parseVerdict(sectionText: string | null): GateVerdict {
  if (!sectionText) return { verdict: null, route: null, raw: null };
  const m = /\*\*Verdict:\*\*\s*(.+)$/im.exec(sectionText);
  if (!m) return { verdict: null, route: null, raw: null };
  const raw = (m[1] ?? "").trim();
  if (/^pass\s*(→|->)/i.test(raw)) return { verdict: null, route: null, raw: null };
  if (/^pass/i.test(raw)) return { verdict: "pass", route: null, raw };
  if (/^fail/i.test(raw)) {
    const routes = [...raw.matchAll(/(?:→|->)\s*`?([a-z][a-z-]+)`?/gi)].map((r) => r[1] as string);
    return { verdict: "fail", route: routes.length ? (routes[routes.length - 1] as string) : null, raw };
  }
  return { verdict: null, route: null, raw };
}

export function gateVerdicts(implementation: Artifact | undefined): { review: GateVerdict; qa: GateVerdict } {
  const body = implementation?.body ?? "";
  return {
    review: parseVerdict(section(body, /adversarial review/i)),
    qa: parseVerdict(section(body, /pre-pr qa|pre-pull-request qa/i)),
  };
}

/** post-merge section counts as filled when the deploy-result bullet is not a placeholder */
export function postMergeFilled(implementation: Artifact | undefined): boolean {
  const s = section(implementation?.body ?? "", /post-merge/i);
  if (!s) return false;
  const m = /\*\*Deploy\/rollout result:\*\*\s*(.*)$/im.exec(s);
  const v = (m?.[1] ?? "").trim();
  return v.length > 0 && !/^`?<[^>]*>`?$/.test(v);
}

/** `pr:` on implementation.md — number, `#61`, or `{ number, state, url }` (D-05). */
export function prInfo(implementation: Artifact | undefined): PrInfo {
  const none: PrInfo = { number: null, state: null, url: null };
  if (!implementation) return none;
  const v = implementation.frontmatter.pr;
  if (v === undefined || v === null) {
    return implementation.status === "merged" ? { number: null, state: "merged", url: null } : none;
  }
  if (typeof v === "number") return { number: v, state: implementation.status === "merged" ? "merged" : "open", url: null };
  if (typeof v === "string") {
    const n = /(\d+)/.exec(v);
    return { number: n ? Number(n[1]) : null, state: implementation.status === "merged" ? "merged" : "open", url: /^https?:/.test(v) ? v : null };
  }
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    const stateRaw = str(o.state)?.toLowerCase() ?? null;
    const state = stateRaw === "merged" || stateRaw === "closed" || stateRaw === "open" ? stateRaw : implementation.status === "merged" ? "merged" : "open";
    return { number: typeof o.number === "number" ? o.number : Number(str(o.number)) || null, state, url: str(o.url) };
  }
  return none;
}
