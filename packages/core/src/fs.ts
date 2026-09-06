import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import matter from "gray-matter";

export function exists(p: string): boolean {
  try {
    return existsSync(p);
  } catch {
    return false;
  }
}

export function readText(p: string): string | null {
  try {
    return readFileSync(p, "utf8");
  } catch {
    return null;
  }
}

export function listFiles(dir: string, ext?: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => !f.startsWith(".") && (!ext || f.endsWith(ext)))
      .filter((f) => statSync(join(dir, f)).isFile())
      .sort();
  } catch {
    return [];
  }
}

export function listDirs(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((f) => !f.startsWith(".") && !f.startsWith("_"))
      .filter((f) => statSync(join(dir, f)).isDirectory())
      .sort();
  } catch {
    return [];
  }
}

export interface Frontmatter {
  data: Record<string, unknown>;
  body: string;
  /** false when the file exists but its frontmatter failed to parse */
  valid: boolean;
}

/** gray-matter with a safety net: a broken frontmatter never throws, it reports `valid:false`. */
export function parseFrontmatter(text: string): Frontmatter {
  try {
    const r = matter(text);
    return { data: (r.data ?? {}) as Record<string, unknown>, body: r.content ?? "", valid: true };
  } catch {
    return { data: {}, body: text, valid: false };
  }
}

export function readFrontmatter(p: string): Frontmatter | null {
  const t = readText(p);
  return t === null ? null : parseFrontmatter(t);
}

export function str(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s === "" ? null : s;
}

const PLACEHOLDER = /`?<[^<>\n]{1,60}>`?/g;
/** `<slug>` is the role-contract wildcard in `reads:`/`writes:` paths, not an unfilled field */
const WILDCARD = /<slug>/g;

/** true when text still carries a template placeholder like `<feature-slug>` or `<...>` */
export function hasPlaceholder(text: string | null): boolean {
  return placeholderCount(text) > 0;
}

export function placeholderCount(text: string | null): number {
  if (!text) return 0;
  return (text.replace(WILDCARD, "").match(PLACEHOLDER) ?? []).length;
}
