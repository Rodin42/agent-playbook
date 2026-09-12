/*
 * Pakker agents.html til den formen Artifact-plattformen vil ha: uten
 * <!DOCTYPE>, <html>, <head> og <body>, siden den selv legger på et skall.
 *
 *   node wiersholm/tools/build-artifact.mjs [utmappe]
 *
 * Kildefilen er et komplett HTML-dokument som virker fra disk og fra en
 * webserver. Dette skriptet skriver index.html + agents.data.js til utmappen,
 * som er det som publiseres.
 */
import { readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const her = dirname(fileURLToPath(import.meta.url));
const rot = join(her, "..");
const ut = process.argv[2] || join(rot, "dist");

const kilde = await readFile(join(rot, "agents.html"), "utf8");

const hode = kilde.match(/<head>([\s\S]*?)<\/head>/i);
const kropp = kilde.match(/<body>([\s\S]*?)<\/body>/i);
if (!hode || !kropp) throw new Error("Fant ikke <head> og <body> i agents.html");

/* Plattformens skall har allerede charset og viewport. */
const hodeinnhold = hode[1]
  .replace(/^[ \t]*<meta\s+charset[^>]*>\s*$/gim, "")
  .replace(/^[ \t]*<meta\s+name="viewport"[^>]*>\s*$/gim, "")
  .trim();

await mkdir(ut, { recursive: true });
await writeFile(join(ut, "index.html"), hodeinnhold + "\n" + kropp[1].trim() + "\n", "utf8");
await copyFile(join(rot, "agents.data.js"), join(ut, "agents.data.js"));

console.log("skrev " + join(ut, "index.html") + " og agents.data.js");
