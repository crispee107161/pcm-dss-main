# Owner Dashboard — Plain-Language Review

**Date:** 2026-08-18
**Scope:** Can a non-technical business owner (no stats/data-science background) understand what the owner dashboard is showing them, without help?
**Status:** Audit complete, no code changes made yet — pending leader review.

## Method

Read every page reachable from the owner sidebar (`app/dashboard/owner/layout.tsx`) and judged each against one question: does this page use plain business language with a "so what" takeaway, or does it expose raw statistical/technical terms without explanation?

## Verdict: narrow problem, not systemic

11 of 12 reachable owner pages already pass. The dashboard mostly does the right thing — plain KPI names ("Cost / Inquiry"), deltas with a one-line meaning ("lower is better"), and methodology caveats written out in full sentences instead of stats jargon (e.g. `campaign-rankings`, `ad-set-ranking`, and `post-type-performance` all explain their "confounding caveat" in plain English immediately after naming it).

Three issues found, all fixable without a redesign:

### 1. `app/dashboard/owner/method-evaluation/page.tsx` — HIGH, needs restructuring (not a from-scratch rewrite)

This page is one click away in the owner sidebar. On closer read of the actual source, part of it is already handled correctly and part isn't:

- **Already correct:** the Cohen's kappa / Landis & Koch definition text is already wrapped in `components/analytics/MethodologyNote.tsx`, the shared collapsed "See the numbers behind this" disclosure used elsewhere in the app (`page-metrics`, etc.). It's closed by default. No change needed there.
- **The actual leak:** `components/analytics/MethodAgreementCard.tsx` renders raw `Cohen's Kappa: 0.444 (moderate)` plus a full confusion-matrix table **unconditionally, by default** — every owner sees this the moment the page loads, with no plain-language framing above it. And the page never uses `components/analytics/InsightHeader.tsx` — a component that already exists and already has a built-in Reliable / Rough guide / Weak signal confidence badge — despite that being exactly the right tool here. Instead the page opens straight into a stack of permanently-visible technical caveat boxes ("Sample caveat," "Circularity warning," `MANUAL_GROUND_TRUTH`) that assume the reader already understands the stats framing.

**Proposed fix, revised after architect review (see below):**
- **One `InsightHeader` per section, not one per page.** The page has three sections with genuinely different trust bases — current-queue (circularity-contaminated), ground-truth (authoritative), inter-coder (ceiling). A single page-level confidence badge would collapse to the worst case and wrongly label the trustworthy ground-truth section as low-confidence. Each section gets its own `InsightHeader` wrapping its keyword+LLM `MethodAgreementCard` pair as `children`.
- **Do not modify `MethodAgreementCard` itself.** It's also used by `app/dashboard/marketing/method-evaluation/page.tsx` (a near-duplicate page for the marketing role, not in scope for this audit) — changing its default visibility would silently change that page too. Instead, put the disclosure at the `InsightHeader` wrapper level and leave the card component untouched. (The owner/marketing page duplication is separate debt worth flagging to the team, not fixing in this change.)
- **Confidence-derivation logic goes in `lib/insights/agreement-insight.ts`**, following the existing pattern already established by `lib/insights/{correlation,regression,trend}-insight.ts` (each exports `{ confidence, headline, detail }`) — not inline in the page, and not in `lib/stats/agreement.ts`, which should stay pure math with no presentation vocabulary. Reuse the existing `Confidence` type (already defined in `InsightHeader.tsx` / `correlation-insight.ts`) rather than declaring a third copy.
- **Keep the circularity warning as its own visual block**, not folded into `InsightHeader`'s `detail` (which is typed `string`) — that would flatten a red-bordered alarm into plain grey body text and lose the visual urgency the warning needs. **Decided:** leave `InsightHeader.detail` typed as `string` (don't widen it to `ReactNode` for every caller just to fit this one page's edge case — same reasoning as not touching `MethodAgreementCard`); keep the existing bordered circularity box as-is, positioned directly beneath its section's `InsightHeader`.
- **Add a unit test for the new `lib/insights/agreement-insight.ts`**, mirroring `page-metrics-insight.test.ts` — currently the only tested module in `lib/insights/`, so the pattern exists but isn't enforced across the other insight modules yet.

**Architect review score: 8/10** (see review notes above). The two items above were the stated path to 10 and have now been decided/added to close the gap.

### 2. `app/dashboard/owner/page-metrics/page.tsx:277` — LOW, one-line fix

Otherwise plain-language copy has one sentence that drops in unexplained jargon:

> *"Holt-Winters triple exponential smoothing (α=0.3, β=0.1, γ=0.3; captures trend + weekly seasonality)"*

**Proposed fix:** Replace with a plain description of what the forecast does (e.g. "predicts near-term trends using recent patterns, including typical weekly ups and downs") and drop the formula/parameter notation, or move it to a tooltip/technical-details toggle.

### 3. `app/dashboard/owner/budget-reallocation/page.tsx:53` — LOW, minor

"Regression to the mean" is used unexplained in an otherwise-clear methodology note about CPI quartiles.

**Proposed fix:** Add a short plain-language clause explaining the effect in context (e.g. "...so a group that looked unusually good or bad last period tends to land closer to average next period").

## Out of scope / no action needed

`regression`, `simulation`, `trend-analysis`, and `correlation` pages still exist on disk but were confirmed **not** owner-navigable — they were deliberately dropped from the owner nav when the MVP v2 respec (2026-08-12) cut regression/simulation/forecast from scope. Route files are pending a later dedicated deletion pass; this is already tracked and doesn't need to be part of this fix.

`analysis/page.tsx` and `report/page.tsx` are thin wrappers around `AnalysisView`/`ReportView` components that weren't read in this pass — flagged for a follow-up look if their copy matters.

## Next step

Pending leader sign-off on the proposed fix for item 1 (rewrite scope/tone) before implementation. Items 2–3 are small enough to bundle in with whichever pass touches item 1.
