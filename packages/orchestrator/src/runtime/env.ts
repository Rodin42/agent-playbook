import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

/** Minimal .env reader: KEY=value lines, optional quotes, # comments. Values are never logged. */
export function parseDotEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    if (val) out[key] = val;
  }
  return out;
}

export function readDotEnv(projectPath: string): Record<string, string> {
  const p = join(projectPath, ".env");
  return existsSync(p) ? parseDotEnv(readFileSync(p, "utf8")) : {};
}

export function requireEnv(env: Record<string, string>, keys: string[]): void {
  const missing = keys.filter((k) => !env[k] && !process.env[k]);
  if (missing.length) throw new Error(`missing in .env: ${missing.join(", ")}`);
}

export function envValue(env: Record<string, string>, key: string): string {
  return env[key] ?? process.env[key] ?? "";
}
