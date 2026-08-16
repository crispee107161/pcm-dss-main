# QA Concerns — 2026-08-14

Raised after using both accounts. Leader reportedly QA'd/addressed these last night — this doc is the checklist to reconcile against that conversation. Findings below are from reading the actual code, not guesses; each has a file reference so you can verify.

Status key: 🟢 already explained/intentional (code confirms) · 🟡 real UI/UX problem, worth fixing · ✅ fixed · 🔵 open question — needs the leader's answer, not a code question.

---

## Marketing Account

### 1. "Why is there still a circularity warning?"
🟢 Intentional, not a bug. `app/dashboard/marketing/method-evaluation/page.tsx:39-45` shows it conditionally, only when `keywordFinalMatchShare > 0.8` — i.e. when most "final" category labels are byte-identical to the keyword method's own suggestion, which happens when someone bulk-accepts keyword suggestions via Auto-Categorize instead of manually reviewing. It's a self-check flag, not a static banner: if the marketing team actually does independent manual review, the share drops and the warning disappears on its own. The FR-15 ground-truth comparison lower on the page is explicitly walled off from this (`category_final_source = MANUAL_GROUND_TRUTH` only), so the warning doesn't contaminate the "real" kappa numbers.
**Question for you to confirm with leader:** is the marketing team aware bulk-accept is what's triggering it, or did they expect manual review already happened?

### 2. "Method evaluation should not be shown."
🔵 Open question — this is a scope decision, not a bug. The page exists and is linked in the marketing nav (`app/dashboard/marketing/layout.tsx:26`) and also exists under Owner. If the intent is that only Owner (or only Marketing Manager, not Team) should see method comparison/kappa internals, that's a per-page `auth()` gate to add — currently nothing in the file gates it beyond the general Marketing route split. Need the leader's call on who's supposed to see this.

### 3. "Everything in the marketing account needs questioning."
🔵 Too broad to act on — noted as a placeholder. Bring the specific list when ready; happy to walk each screen's data source and caveats against `mvp.md`.

---

## Owner Account

### 4. "How does this help the owner, and how did we get those numbers?"
🔵 Open question, but answerable per-chart from `mvp.md` §4.5 and the caveat table at `docs/mvp.md:183-189` — every FR-25 through FR-30 chart has a documented confound and a documented fix. Once you send the specific chart(s) you want walked through, I can trace the number back to the exact `lib/stats/*.ts` calculation and phrase the "why this helps the owner decide X" in plain language.

### 5. "What does the slider do? I thought it was a design element."
✅ Fixed (2026-08-14). It controls "what % of Q4's (worst-performing) spend to compare against Q1's (best) rate" — dragging it recomputes the counterfactual inquiry count live. `components/analytics/BudgetReallocation.tsx:75-95` now has: an explicit instruction line above the track ("Drag to compare a different share of Q4's spend"), a bold `X% of Q4 spend` readout instead of tiny muted text, a thicker rounded track (`bg-secondary`), and a real 20px circular thumb with border/shadow (WebKit + Firefox). No longer reads as a decorative line.

### 6. "Where is the reallocation comparison hinging?"
🟢 Answerable directly. It hinges on the minimum-spend filter (`lib/stats/budget-reallocation.ts:63-67`, `docs/mvp.md:101`): ads are grouped into 4 spend-CPI quartiles, but only after filtering out low-spend ads, because an unfiltered split is dominated by regression to the mean (Q4's unfiltered median spend was ₱333 vs Q1's ₱5,587 — an 8-inquiry ad has a wildly noisy CPI, not a "bad" one). The comparison then asks: if X% of Q4 (worst quartile) spend had instead converted at Q1's (best quartile) rate, how many more inquiries would that have produced. It's retrospective, not predictive — the mandatory caption on the page says so.

### 7. "What's the confounding caveat in rankings mean in simple terms?"
🟢 There are two separate ones, both real statistical caveats, not boilerplate:
- **Ad-set ranking** (`app/dashboard/owner/ad-set-ranking/page.tsx:35-37`): ad sets didn't run at the same time or with the same targeting, so a top-ranked set might just be riding a good season/audience rather than better creative. Plain-language: *"don't assume the top ad set is objectively the best strategy — it might just have run at a better time."*
- **Post-type performance** (`app/dashboard/owner/post-type-performance/page.tsx:35-37`): Meta's algorithm distributes Reels differently from photo posts (pushes them more/less regardless of quality), so higher Reels engagement partly reflects the algorithm, not just content quality. Plain-language: *"don't conclude 'Reels are better content' — Facebook shows them differently in the first place."*

### 8. "Why is there missing data in trend analysis?"
🟢 Intentional and disclosed, not a bug. `components/analytics/pages/TrendAnalysisView.tsx:23-36,104-112` — the view computes which months in the target period have no uploaded rows and explicitly bannering it: *"Data is available for [X, Y] only — [Z] is not in the uploaded dataset."* It's a genuine data-coverage gap (nobody's uploaded a CSV for that month), surfaced honestly instead of interpolated/faked. If this is about production data rather than the synthetic set, the fix is "upload the missing month's CSV," not a code change.

### 9. "I need an explanation for every chart — what insight, how it helps the owner decide."
🔵 Doable, needs a chart-by-chart pass. Recommend doing this as one follow-up session working through `mvp.md` §4.1–§4.5 chart-by-chart rather than cramming it in here.

### 10. "I need an explanation for every caveat in simple terms."
🔵 Same as above — `docs/mvp.md:183-189` already has a caveat table (bias → mitigation) for FR-25–30; I can rewrite each row in plain language in one pass once you're ready.

---

## Cross-cutting UI issues

### 11. Export CSV button unreadable in dark mode (looked unclickable)
✅ Fixed (2026-08-14). `components/reports/CsvExportButton.tsx` no longer hardcodes `border-neutral-300 hover:bg-neutral-100 text-neutral-800`. It now renders through the shared `Button` component (`components/ui/button.tsx`, `variant="outline"`), which uses theme tokens (`border-border`, `bg-background`, `hover:bg-muted`) and already has correct dark-mode contrast — same as every other outline button in the app.

### 12. Budget reallocation slider read as decoration (duplicate of #5)
✅ Fixed — see #5, same change.

---

## Suggested next steps
1. Reconcile items marked 🔵 against what the leader actually said last night — some of these may already have answers you just haven't relayed to me yet.
2. When ready, send the actual documents/leader notes so items 1, 2, 3, 4, 9, 10 can be closed out with certainty instead of my inference from code.
