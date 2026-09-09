import { describe, expect, it } from "vitest";
import { parseFlag } from "./flags.js";

const OPEN = `---
id: flag-2026-09-05-0007
type: red-line
step: 2
feature: F-006
title: "New dependency — nodemailer"
created: 2026-09-05T09:12:00Z
status: open
recommendation: approve
from: senior-developer via twin
---
## Question
E-mail notifications need an SMTP client. Red line: no new dependency without an ADR.

## Options
- **approve** — nodemailer, pinned major, MIT — twin recommends
- **reject** — raw SMTP over net; more code to own

## Blocked until answered
- F-006 build cannot start
`;

const RESOLVED = OPEN.replace("status: open", "status: resolved") + `
## Decision
- **choice:** approve
- **by:** operator
- **at:** 2026-09-06T08:00:00Z
- **note:** pinned to ^7
`;

describe("parseFlag (BUILD-PLAN §2.2)", () => {
  it("parses an open flag with options, recommendation and blocked items", () => {
    const f = parseFlag(OPEN, "runtime/flags/flag-2026-09-05-0007.md")!;
    expect(f.id).toBe("flag-2026-09-05-0007");
    expect(f.type).toBe("red-line");
    expect(f.step).toBe(2);
    expect(f.feature).toBe("F-006");
    expect(f.status).toBe("open");
    expect(f.question).toContain("SMTP client");
    expect(f.options.map((o) => o.key)).toEqual(["approve", "reject"]);
    expect(f.options[0]?.recommended).toBe(true);
    expect(f.options[1]?.recommended).toBe(false);
    expect(f.blocked).toEqual(["F-006 build cannot start"]);
    expect(f.decision).toBeNull();
    expect(f.from).toBe("senior-developer via twin");
  });

  it("parses a resolved flag's decision", () => {
    const f = parseFlag(RESOLVED, "x.md")!;
    expect(f.status).toBe("resolved");
    expect(f.decision).toEqual({ choice: "approve", by: "operator", at: "2026-09-06T08:00:00Z", note: "pinned to ^7" });
  });

  it("a Decision section implies resolved even if status was not flipped", () => {
    const f = parseFlag(OPEN + "\n## Decision\n- **choice:** reject\n", "x.md")!;
    expect(f.status).toBe("resolved");
  });

  it("defaults unknown types to system and infers a step", () => {
    const f = parseFlag("---\nid: x\ntype: weird\ntitle: t\n---\n## Question\nq\n", "x.md")!;
    expect(f.type).toBe("system");
    expect(f.step).toBe(2);
  });
});

describe("flag stays open until a real Decision section exists", () => {
  it("does not treat 'Decisions needed' as a decision", () => {
    const f = parseFlag("---\nid: f1\ntype: sign-off\nstatus: open\n---\n## Question\nq\n## Decisions needed (blocking)\n- PO: yes or no\n", "runtime/flags/f1.md");
    expect(f?.status).toBe("open");
    expect(f?.decision).toBeNull();
  });
});
