import { parseFrontmatter, hasPlaceholder } from "@factory/core";
import { STATUS_VOCAB } from "./prompt.js";
import type { ArtifactRef } from "./paths.js";

export interface Verdict {
  ok: boolean;
  reason: string | null;
  status: string | null;
}

/**
 * The run is `ok` only if the primary artifact exists, its frontmatter parses, its status is in the
 * vocabulary, no placeholders remain in the frontmatter, and the content changed — never from the exit code.
 */
export function verifyArtifact(ref: ArtifactRef, before: string | null, after: string | null): Verdict {
  if (after === null) return { ok: false, reason: `artifact not written: ${ref.path}`, status: null };
  if (ref.section) {
    const re = new RegExp(`^##\\s+${ref.section}\\b`, "mi");
    if (!re.test(after)) return { ok: false, reason: `section "## ${ref.section}" missing in ${ref.path}`, status: null };
  }
  const fm = parseFrontmatter(after);
  if (!fm.valid) return { ok: false, reason: `frontmatter does not parse: ${ref.path}`, status: null };
  const status = typeof fm.data.status === "string" ? fm.data.status : null;
  if (!status || !(STATUS_VOCAB as readonly string[]).includes(status)) return { ok: false, reason: `status "${status ?? ""}" not in ${STATUS_VOCAB.join("|")}`, status };
  const fmText = after.slice(0, after.indexOf("\n---", 4) + 4);
  if (hasPlaceholder(fmText)) return { ok: false, reason: "placeholders left in frontmatter", status };
  if (before !== null && before === after) return { ok: false, reason: "artifact unchanged", status };
  return { ok: true, reason: null, status };
}
