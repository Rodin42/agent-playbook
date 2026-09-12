/*
 * Skriver én Markdown-fil per agent, i samme frontmatter-form som
 * template/phase-1-product-development/agents/*.md i agent-playbook.
 * Validerer samtidig at hver post peker på et domene, en gruppe, en status,
 * en autoritet og et konfidensialitetsnivå katalogen kjenner.
 *
 *   node wiersholm/tools/export-markdown.mjs [utmappe]     # standard: wiersholm/agents
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const her = dirname(fileURLToPath(import.meta.url));
const rot = join(her, "..");
const ut = process.argv[2] || join(rot, "agents");

globalThis.window = {};
const kildekode = await readFile(join(rot, "agents.data.js"), "utf8");
new Function(kildekode).call(globalThis);
const kat = globalThis.window.WIERSHOLM_KATALOG;

const domener = new Set(kat.domener.map(d => d.id));
const grupper = new Set(kat.domener.flatMap(d => d.grupper.map(g => d.id + "/" + g.id)));
const statuser = new Set(kat.statuser.map(s => s.id));
const autoriteter = new Set(kat.autoriteter.map(s => s.id));
const konfid = new Set(kat.konfidensialitet.map(s => s.id));

const feil = [];
const sette = new Set();
for (const a of kat.agenter){
  if (!a.id || !/^[a-z0-9][a-z0-9-]*$/.test(a.id)) feil.push(`ugyldig id: ${JSON.stringify(a.id)}`);
  if (sette.has(a.id)) feil.push(`duplisert id: ${a.id}`);
  sette.add(a.id);
  if (!a.name) feil.push(`${a.id}: mangler name`);
  if (!a.tagline) feil.push(`${a.id}: mangler tagline`);
  if (!domener.has(a.domain)) feil.push(`${a.id}: ukjent domain ${a.domain}`);
  if (!grupper.has(a.domain + "/" + a.group)) feil.push(`${a.id}: ukjent group ${a.group}`);
  if (!statuser.has(a.status)) feil.push(`${a.id}: ukjent status ${a.status}`);
  if (!autoriteter.has(a.authority)) feil.push(`${a.id}: ukjent authority ${a.authority}`);
  if (!konfid.has(a.confidentiality)) feil.push(`${a.id}: ukjent confidentiality ${a.confidentiality}`);
  if (!Array.isArray(a.sections) || !a.sections.length) feil.push(`${a.id}: ingen seksjoner`);
}
if (feil.length){
  console.error("Katalogen har feil:\n" + feil.map(f => "  - " + f).join("\n"));
  process.exit(1);
}

const liste = v => "[" + (v || []).map(x => (/[:#,[\]]/.test(x) ? JSON.stringify(x) : x)).join(", ") + "]";

function tilMarkdown(a){
  const l = ["---", `id: ${a.id}`, "kind: ai-role", `domain: ${a.domain}`, `group: ${a.group}`,
    `status: ${a.status}`, `authority: ${a.authority}`, `signoff: ${JSON.stringify(a.signoff || "")}`,
    `confidentiality: ${a.confidentiality}`, `owner: ${JSON.stringify(a.owner || "")}`,
    `systems: ${liste(a.systems)}`, `reads: ${liste(a.inputs)}`, `writes: ${liste(a.outputs)}`,
    `tags: ${liste(a.tags)}`, "---", "", `# ${a.name}`, "", `> ${a.tagline}`];
  for (const s of a.sections) l.push("", `## ${s.title}`, "", s.body);
  if (a.inputs?.length) l.push("", "## Input", "", ...a.inputs.map(i => `- ${i}`));
  if (a.outputs?.length) l.push("", "## Leveranse", "", ...a.outputs.map(i => `- ${i}`));
  return l.join("\n") + "\n";
}

await mkdir(ut, { recursive: true });
for (const a of kat.agenter) await writeFile(join(ut, a.id + ".md"), tilMarkdown(a), "utf8");
console.log(`${kat.agenter.length} agenter validert og skrevet til ${ut}`);
