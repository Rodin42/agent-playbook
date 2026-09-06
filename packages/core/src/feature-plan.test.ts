import { describe, expect, it } from "vitest";
import { countAnsweredInAdvance, parseFeaturePlan, toConsoleStatus } from "./feature-plan.js";

const PLAN = `
# Feature Plan

## Backlog

| ID | Feature | Problem it solves | Priority | Status | Feature folder |
| --- | --- | --- | --- | --- | --- |
| F-001 | \`<name>\` | \`<user problem>\` | P1 | Idea / Ready / In progress | \`features/<slug>/\` |
| F-004 | \`booking calendar\` | shared calendar across teams | P1 | In progress | \`features/booking-calendar/\` |
| F-007 | \`changelog page\` | users forget what shipped | P2 | Shaping | \`features/changelog-page/\` |
| F-003 | \`user roles\` | who may do what | P1 | Shipped | \`features/user-roles/\` |

## Entry format

### F-NNN · \`<feature name>\`

- **PO (owner):** who proposed it.
- **Open questions → PO:** the async queue.

### F-007 · \`changelog page\`

- **PO (owner):** Marta K. — marta@example.com
- **Problem / user:** Users forget which features we already shipped.
- **Hypothesis:** we believe a changelog will cause fewer "did you ship X" tickets.
- **Success metric:** support tickets mentioning "did you ship" drop 30%.
- **Scope:** in: chronological list · out: release notes, roadmap
- **Answered in advance:** out of scope: technical release notes; constraint: freshness; v1 good enough: manual list
- **Open questions → PO:**
  1. Who is the primary audience?
  2. Update cadence — per release or continuous?
  3. Standalone page or in docs? — answered: standalone
- **Sign-off:** rodin-twin — pending
- **Source:** stakeholder

### F-010 · \`reminder e-mails, phase 2\`

- **PO (owner):** step 3
- **Problem / user:** log analysis found 14% bounce on reminder sends
- **Status:** Idea
- **Answered in advance:** [PO to fill]
- **Source:** Phase 3 finding — log-analysis
`;

describe("parseFeaturePlan", () => {
  const entries = parseFeaturePlan(PLAN);
  const byId = Object.fromEntries(entries.map((e) => [e.id, e]));

  it("skips the template's placeholder rows and the F-NNN example block", () => {
    expect(byId["F-001"]).toBeUndefined();
    expect(byId["F-NNN"]).toBeUndefined();
    expect(entries.map((e) => e.id)).toEqual(["F-004", "F-007", "F-003", "F-010"]);
  });

  it("maps feature-plan Status to console status without a new field", () => {
    expect(byId["F-004"]?.status).toBe("started");
    expect(byId["F-007"]?.status).toBe("waiting");
    expect(byId["F-003"]?.status).toBe("finished");
    expect(byId["F-010"]?.status).toBe("waiting");
    expect(toConsoleStatus("Ready")).toBe("approved");
    expect(toConsoleStatus("Observing")).toBe("finished");
    expect(toConsoleStatus("nonsense")).toBe("waiting");
  });

  it("merges table row and entry block by id", () => {
    const f7 = byId["F-007"]!;
    expect(f7.name).toBe("changelog page");
    expect(f7.folder).toBe("features/changelog-page");
    expect(f7.po).toContain("Marta");
    expect(f7.metric).toContain("30%");
    expect(f7.priority).toBe("P2");
  });

  it("collects open questions with an answered flag and derives the twin check", () => {
    const f7 = byId["F-007"]!;
    expect(f7.openQuestions).toHaveLength(3);
    expect(f7.openQuestions[2]?.answered).toBe(true);
    expect(f7.twinCheck).toBe("2 gaps → PO");
    expect(byId["F-004"]?.twinCheck).toBe("complete");
  });

  it("counts answered-in-advance out of three, ignoring placeholders", () => {
    expect(byId["F-007"]?.answeredInAdvanceCount).toBe(3);
    expect(byId["F-010"]?.answeredInAdvanceCount).toBe(0);
    expect(countAnsweredInAdvance("only one answer here")).toBe(1);
    expect(countAnsweredInAdvance(null)).toBe(0);
  });

  it("detects Phase-3 findings and entry-only items with a Status bullet", () => {
    const f10 = byId["F-010"]!;
    expect(f10.fromPhase3).toBe(true);
    expect(f10.planStatus).toBe("Idea");
    expect(f10.folder).toBe("features/reminder-e-mails-phase-2");
    expect(byId["F-007"]?.fromPhase3).toBe(false);
  });
});
