I'll draft a feature-plan entry from the product-strategist's lens, reframing the brief as a user problem with a defensible scope.

---

### F-NNN · Shipped features changelog

- **PO (owner):** [Name needed] — owner@company.com

- **Problem / user:** Support team spends time answering "did you ship X?" and users don't discover recently-added features because there's no single source of truth. New users especially can't calibrate what's possible without asking.

- **Hypothesis:** Publishing a visible, regularly-updated changelog will reduce support churn on "what's new" questions by 30%+ and increase organic feature discovery, measured by adoption velocity of new features and support ticket volume.

- **Success metric:** Phase 3 tracks: (1) support tickets mentioning "what's new / did you ship / feature status" drop by target %; (2) month-over-month feature adoption for recent releases increases by %; (3) changelog page drives X% of traffic to features not yet obvious in the product.

- **Scope:** 
  - **In:** chronological list of shipped features with ship dates, one-line user-facing description, and link to in-product feature location. Auto-update on release.
  - **Explicitly out:** technical release notes, commit-level diffs, version numbers, future roadmap, detailed upgrade guides, screenshots, API-level changes.

- **Depends on:** — (no blocking dependencies)

- **Shared work needed:** assumes a release/versioning system exists and is accessible to generate the list; if not, that's a blocker.

- **Substrate impact:** respects `substrate.md` ✓ (assume no infra or security impact; flag if wrong).

- **Priority & why:** **P1** — reduces support volume and improves user satisfaction with minimal effort; high confidence it works.

- **Answered in advance:** [PO to fill: What's the constraint that matters most — freshness, visual design, or something else? What's "good enough for v1"?]

- **Open questions → PO:**
  1. Who's the *primary* audience — existing users, support team, prospects, or all three? Changes if we add filtering/search.
  2. What's the update cadence? Per-release, or continuously as features ship? Affects design and automation.
  3. How much detail per feature? (Name + date only, or user-facing description too? Screenshots?)
  4. Is this a standalone page, or integrated into existing docs/marketing site? Affects discovery and design.
  5. Success metric: what does "reduced support volume" look like numerically? What's the baseline you're measuring against?

- **Sign-off:** rodin-twin — *pending*.

- **Source:** Stakeholder request (PO input).

---

**Flag for shaping phase:** This entry is intentionally tight to force the PO to answer whether the real problem is support load, feature discovery, or both. The scope boundary (no technical release notes, no roadmap) is deliberate—changelog creep is real. Pressure-test with `ux-strategist` on whether this is the right solution for the stated problem (could it be in-product notifications instead?).
