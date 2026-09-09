import type { ArtifactRef } from "./paths.js";

export interface PromptInput {
  role: string;
  roleDoc: string;
  slug: string;
  reads: { path: string; text: string }[];
  writes: ArtifactRef[];
  instruction: string;
}

export const STATUS_VOCAB = ["draft", "in-review", "final", "superseded"] as const;

/** The step instruction every role receives; role docs carry the judgment, this carries the mechanics. */
export function defaultInstruction(role: string, slug: string, writes: ArtifactRef[]): string {
  const targets = writes.map((w) => `- \`${w.path}\`${w.section ? ` (section \`## ${w.section}\` only)` : ""}`).join("\n");
  return `You are the \`${role}\` role of the agent factory, running headless in a disposable sandbox on
feature \`${slug}\`. The repository is checked out in the current directory on the feature branch.

Do exactly this:
1. Read your role doc and the inputs below. They are the whole context; do not look elsewhere for guidance.
2. Write your output artifact(s):
${targets}
   Keep each file's frontmatter intact and valid YAML. Replace every \`<...>\` placeholder. Set
   \`feature:\` to \`${slug}\` and \`status:\` to one of ${STATUS_VOCAB.map((s) => `\`${s}\``).join(" | ")} —
   \`in-review\` when your work is complete and ready for the next role, \`draft\` only if you had to stop.
3. Do not touch files outside your \`writes:\` list. Do not run git commit or push — the orchestrator does that.
4. If an input is missing or contradictory, say so inside the artifact under "Open questions" instead of guessing.
5. When done, print one line: \`FACTORY-DONE <path of the primary artifact>\`.`;
}

export function composePrompt(input: PromptInput): string {
  const parts: string[] = [];
  parts.push(input.instruction, "", "=".repeat(78), `ROLE DOC — ${input.role}`, "=".repeat(78), input.roleDoc.trim(), "");
  for (const r of input.reads) {
    parts.push("=".repeat(78), `INPUT — ${r.path}`, "=".repeat(78), r.text.trim(), "");
  }
  return parts.join("\n");
}
