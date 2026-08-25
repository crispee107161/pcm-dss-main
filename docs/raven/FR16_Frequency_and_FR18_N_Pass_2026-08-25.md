# FR-16 frequency correlation: built. FR-18 n/plain-language pass: mostly green, four partials.

**Date:** 25 August 2026
**Re:** `Closing_the_FR_Table.md` §1 (checkbox), §3, §4
**Method:** direct code reading — `lib/stats/ad-lifecycle.ts`, `AnalysisView.tsx`, and every page/component named in your §4 table. No DB queries needed. No writes made.

---

## §1 checkbox: no leftover UI implying ad performance by content category

Checked every ad-facing screen (Top Ads, Rankings, Budget Reallocation) and the Upload form for a stray filter, dropdown, heading, or empty state — none reference content category. `grep -i "content category"` across `app/` and `components/` returns exactly three hits, all organic-only:

- `components/dashboard/DashboardOverview.tsx:170` — "Performance by Content Category" section label, captioned "Median organic engagement rate" directly beneath it
- `components/dashboard/DashboardCharts.tsx:115` — a code comment
- `components/analytics/pages/CategoryPerformanceView.tsx:29` — the screen's own description

One thing worth flagging even though it isn't a label or code issue: on the Dashboard, that "Performance by Content Category" chart sits in the same grid row, side by side, with "Cost-per-Inquiry Distribution" (an ad metric). Nothing on either card claims a relationship between them and both are captioned correctly, but a panelist glancing at the two charts next to each other during a demo could get the wrong impression from layout alone, not from any text. Not proposing a change without your read on whether it's worth separating the rows — flagging since you asked specifically about "a leftover label" and this is adjacent to that without being one.

---

## §3: FR-16's frequency correlation is built

It exists, under the code name "Frequency Diagnostic" — I'd missed it in every prior inventory because it's a sub-section of the FR-27 Lifecycle card, not its own heading.

- **Where:** `lib/stats/ad-lifecycle.ts`, `computeFrequencyDiagnostic()` (lines 187–206), called from `computeAdLifecycle()`. Rendered in `AnalysisView.tsx`'s `LifecycleSection`, under the heading "Frequency Diagnostic (n=...)" — **Owner-only**, since Lifecycle is only passed on the Owner route, never Marketing.
- **Method:** fixed, not Shapiro-Wilk-gated. It rank-transforms both variables (`rankArray`) and runs Pearson on the ranks — i.e. Spearman, always, with no normality test and no Pearson branch. This is a real difference from FR-21's method-selection pattern; worth deciding whether that's acceptable or whether FR-16 should match FR-21's gated approach.
- **Population:** row-level ad-month records, restricted to messaging ads (`total_messaging_contacts > 0`) with `frequency > 0` — confirmed **n=482** in the code comment, verified against the live DB. This is **not** the ₱1,000-filtered n=108 population FR-25/FR-31 use — it's the same unfiltered messaging-ad population FR-21 uses (n=187 there, but FR-21 is one-row-per-ad while this is one-row-per-ad-month, which is why the n differs from FR-21's too).
- **What it computes:** Spearman ρ and p between frequency and cost-per-result (spend ÷ messaging contacts, the row's own CPI), plus median frequency. Rendered with a plain-language interpretation (`interpretCorrelation`) and an explicit ad-fatigue sentence when ρ < 0.

Since frequency is already an FR-31 regression predictor, as you noted, the data path was already there — this wasn't a new computation, just an existing one that hadn't surfaced in any inventory by name yet.

---

## §4: n / plain-language pass

Two ticks per screen, per your table. ✅ = shown/present, ⚠ = partial, checked and explained below the table.

| Screen | Shows n | Plain-language statement |
|---|---|---|
| Analysis, ranking comparison (FR-19) | ✅ `ranking.n` in the section heading, `excludedNullViews` called out separately | ✅ `rankingInterpretation.summary` (magnitude-labelled) |
| Analysis, category distribution (FR-20) | ✅ per-row `n`, "Low confidence" flag under 3 | ⚠ see below |
| Analysis, correlation (FR-21) | ✅ `correlation.n` in the section heading | ✅ `correlationInterpretation.summary` |
| Analysis, regression (FR-31) | ✅ `n` on every fit, every table, every panel | ✅ narrative on every panel (model spec, diagnostics narrative, residual caption) |
| Analysis, lifecycle (FR-27, Owner) | ✅ per-cohort `n`, per-month-of-life `n`, frequency diagnostic `n` | ⚠ see below |
| Method Evaluation | ✅ `n` on every comparison (inter-coder, ground truth, acceptance rate) | ✅ inter-coder/ground-truth prose explains what's being compared |
| Category Performance | ✅ `post_count` per row, uncategorised count banner | ✅ "Best engagement" summary card + methodology note |
| Post Type Performance | ✅ `n` column, "Low confidence" flag under 3 | ⚠ see below |
| Top Ads | ⚠ see below | ⚠ see below |
| Rankings | ✅ `adCount` per row, group-count headers | ✅ methodology note + "low confidence" tooltip |
| Budget Reallocation | ✅ `n = {result.n} ads`, per-quartile `n` | ✅ quartile framing (best/worst) + reallocation slider prose |
| Trend Analysis | ✅ `ad_count`/`post_count` per period card | ✅ `InsightHeader` headline+detail with a confidence label |
| Page Metrics | ⚠ see below | ✅ `InsightHeader` on nearly every chart |
| Dashboard | ⚠ see below | ⚠ see below |

**The four partials:**

- **FR-20 category distribution.** Every row shows its own `n`, but there's no per-row textual interpretation — just the median numbers and a low-confidence flag. Compare to FR-19/FR-21 on the same screen, which both get a magnitude-labelled sentence (`interpretCorrelation`). Cheap fix if you want it: a one-line "highest/lowest" callout, same pattern as Category Performance's "Best engagement" card.
- **FR-27 lifecycle.** The frequency diagnostic sub-section has full interpretation (rho, p, plain-language sentence, fatigue note). The cohort CPI curves and the single-month-vs-long-run comparison do not — they're numbers only, no "this means X" sentence, even though `n` is shown at every level.
- **Post Type Performance.** Same pattern as FR-20: `n` and a low-confidence flag per row, plus a general methodology note (median-not-mean, confounding caveat), but no per-row "this format outperforms because Y."
- **Top Ads.** Each of the six panels' methodology note explains *how* the ranking was computed (which column, which filter, which minimum) but not the eligible-pool size for that specific panel — e.g. the CTR panel doesn't say how many ads cleared the `MIN_IMPRESSIONS_FOR_CTR` floor before the top 10 were picked, only the floor value itself. The three summary cards at the top (`Total Ads Tracked`, `Ads with Messaging Conversations`) partially cover this for two of the six panels but not CTR/cost-per-click. If you want this closed, the fix is adding an eligible-count to each panel's methodology note — small, mechanical.
- **Page Metrics.** Plain language is thorough (`InsightHeader` on almost every section). `n` is inconsistent: Daily Activity, Views & Clicks, Gender, Territory, Age/Gender, and Top Cities charts show absolute totals but not an explicit record count (how many days, how many followers surveyed); Follower Growth is the one section that does show it explicitly ("Data Points... days of history").
- **Dashboard.** Two of the five KPI cards show explicit `n=` (Median CPI, Median Engagement); the other three (Spend, Inquiries, Posts Published) are totals, which arguably don't need an `n` since the number itself is the full count, not a sample statistic. But there's no `InsightHeader`-style narrative anywhere on the Dashboard overview the way Trend Analysis and Page Metrics have it — deltas are shown as colored badges, not sentences. This is the one screen where "plain-language statement of what the result indicates" is weakest across the board, not just one section.

None of this is broken — every screen shows real numbers with real methodology notes nearby. The gaps are specifically the "and a plain-language statement of what the result indicates" half of FR-18 for four screens, and the "eligible pool n" half for one screen's sub-panels. Your call on which of these are worth closing before October versus documenting as a partial in the matrix.

---

## §5: sidebar pass

Per your note, folding this into the above rather than a separate pass — FR-19 and FR-20 are both already covered in the §4 table (FR-20 is one of the four partials above). The remaining sidebar items (Dashboard, Content, Upload Data, Method Evaluation, Page Metrics) are also touched by §4 where relevant (Dashboard and Page Metrics both got their own row above). Content, Upload Data, and the account-management pair weren't part of §4's list and I haven't walked those — say if you still want them confirmed separately, or if §4's coverage is enough for the matrix.
