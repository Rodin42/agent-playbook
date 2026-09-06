import { cpSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { deriveProject } from "./project.js";
import { twinTick } from "./prework.js";

const TEMPLATE = resolve(__dirname, "../../../template");

function seed(): string {
  const dir = mkdtempSync(join(tmpdir(), "factory-prework-"));
  cpSync(TEMPLATE, dir, { recursive: true });
  return dir;
}

describe("overview pre-work ticks (ux-review A12)", () => {
  it("a freshly seeded template is an unfinished setup, not an empty dashboard", () => {
    const dir = seed();
    const v = deriveProject({ name: "fresh", path: dir });
    expect(v.overview.setupComplete).toBe(false);
    expect(v.subtitle).toContain("setup not finished");
    const docs = v.overview.cards.flatMap((c) => c.docs);
    const by = Object.fromEntries(docs.map((d) => [d.label, d]));
    expect(by["project-brief.md"]?.tick).toBe("wip");
    expect(by["factory.config.yaml"]?.tick).toBe("wip");
    expect(by[".env secrets"]?.tick).toBe("no");
    expect(by["rodin-twin.md"]?.tick).toBe("ok"); // dated 2026-09-05, no placeholders
    expect(v.backlog).toEqual([]); // the template's example row is a placeholder
    expect(v.counts.escalations).toEqual({ 1: 0, 2: 0, 3: 0 });
  });

  it("twin freshness: missing date is wip, >90 days is stale, recent is ok", () => {
    const dir = seed();
    const p = join(dir, "phase-1-product-development/agents/rodin-twin.md");
    writeFileSync(p, "# twin\nno date here\n");
    expect(twinTick(dir).tick).toBe("wip");
    writeFileSync(p, "_Last updated by the human: `2020-01-01`_\n");
    expect(twinTick(dir, new Date("2026-09-06")).tick).toBe("wip");
    expect(twinTick(dir, new Date("2026-09-06")).note).toContain("stale");
    writeFileSync(p, "_Last updated by the human: `2026-09-01`_\n");
    expect(twinTick(dir, new Date("2026-09-06")).tick).toBe("ok");
  });
});
