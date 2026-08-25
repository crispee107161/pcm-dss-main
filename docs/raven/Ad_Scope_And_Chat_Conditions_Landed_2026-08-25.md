# Ad scope, chat conditions, FR-07/FR-09 — all landed

**Date:** 25 August 2026
**Re:** `Scope_Call_Both_and_Clauses_Restored.md`
**Status:** all open items built and verified (376 tests, tsc, production build all clean)

---

## §3 — the figures, and the filter is confirmed a no-op today

| Figure | Live DB, today |
|---|---|
| Min `reporting_starts` | 2025-08-01 |
| Max `reporting_starts` | 2026-07-01 |
| Distinct months | 12 |
| Total `amount_spent` | **PHP 901,196.96** |

Matches the raw twelve-month exports to the centavo. Confirmed: the advertising records are already exactly the study period. Built the filter regardless, per your "this does not change the decision" note — it's now a structural guarantee rather than an incidental one.

## §2 — both. Full call-site list

Grepped `lib/`, `actions/`, and `app/` for every `prisma.ad.findMany` / `.aggregate` / `.findFirst` / `.count` feeding a reachable screen. Added `STUDY_PERIOD_AD_WHERE` (on `reporting_starts`) and a `withStudyPeriodAd()` helper to `lib/data/study-period.ts`, mirroring the post-side pattern exactly. Applied at:

- `actions/chat.ts` — the ad query (the one that started this)
- `lib/data/analysis.ts` — all three ad loaders: `loadAnalysisScreenData` (FR-21), `loadAdLifecycleData` (FR-27, both queries), `loadRegressionAnalysis` (FR-31)
- `lib/data/dashboard.ts` — `latestAdForAnchor`, `earliestAd`, `curAdWhere`/`priorAdWhere` (now AND, not replace, the UI date-range picker), `allAdsForGaps`
- `lib/reports/report-data.ts` — both ad queries feeding the FR-23 CSV/PDF export
- `app/dashboard/owner/campaign-rankings/page.tsx` and the marketing equivalent — `adWhere`, which every query on that page shares
- `app/dashboard/owner/ad-set-ranking/page.tsx`
- `app/dashboard/owner/budget-reallocation/page.tsx`
- `components/analytics/pages/TrendAnalysisView.tsx`

**Found and deliberately left unscoped, with reasons:**

- `lib/upload/coverage.ts` — the upload-coverage widget answers "has this file type already been uploaded, and for what range," which needs the true ingested range, not the study window, to be useful.
- `actions/upload.ts`'s ad dedup check — needs to see the full ingested range to catch duplicate imports regardless of whether the duplicate falls inside the declared period.
- `lib/data/analytics.ts`, `lib/stats/spearman.ts` (`CorrelationView.tsx`), `lib/stats/regression.ts`, `lib/stats/simulation.ts`, `lib/stats/laggedCorrelation.ts`, `lib/stats/ad-set-metrics.ts` (via `budget-allocator.ts`/`cost-cutting.ts`) — confirmed unreferenced from any route in `app/`, per this repo's cut-feature convention (mvp.md §5). Not analytical outputs because nothing routes to them.

One thing worth flagging while I was in `chat.ts`: the "Predictive Model" section it renders (`prisma.regressionModel`, coefficients/R²/n) is the **cut** simple/multiple-linear-regression model, not FR-31's live explanatory regression (`RegressionRun`/`fr31-regression.ts`). It's a different table entirely. I didn't touch it — out of scope for this pass — but it means the coefficients §1's gate is hiding from Marketing Team are from a feature that's off the nav everywhere else. Worth a decision on whether the chat should reference FR-31's model instead, or drop the "Predictive Model" section, separately from this memo.

## §1 — chat gated to Owner and Marketing Manager

`Sidebar.tsx` takes a `showChat?: boolean` prop (default `true`), same shape as `AnalysisView`'s `hideAdEfficiency`. `app/dashboard/marketing/layout.tsx` passes `showChat={!isTeam}`; the owner layout needs no change since Owner always gets it. Marketing Team no longer renders the widget at all — not a stripped context, the component itself is absent.

## §4 condition 3 — visible caption

Added a caption bar under the chat header, always visible when the panel is open:

> "Figures are drawn from the consolidated dataset and summarized by AI — confirm against the reports before acting on them."

## FR-07 — building it, done

Two additive columns on `FacebookPost` (migration `20260825060000`, applied the same way as the last two — `prisma db execute` + `migrate resolve --applied`, Neon's pooled connection can't hold the advisory lock):

- `category_llm_model` — set to `CLASSIFICATION_MODEL` at the moment `actions/classify-posts.ts` writes `category_llm`.
- `category_keyword_lexicon_count` — the lexicon is DB-backed (`prisma.keyword`), not a static file with its own version number, so the term count at run time is the version stamp; set in `actions/categorize.ts`'s `autoCategorizeAll`.

Both null on historical rows, same convention as `MANUAL_CHANGE_AFTER_FINALISATION`. Clause stays as written — record it as implemented.

## FR-09 — building it, done

`lib/stats/ranking-comparison.ts`'s `computeRankingComparison` now also returns `viewsReachRho`/`viewsReachP` — same eligible population as the existing Views/engagement-rate figure (Reach is a non-null column, so nothing further is excluded), same Spearman method. Sits directly beneath the existing ranking-comparison card on the Analysis screen, both roles. Clause stays as written — record it as implemented.

---

## Summary for the matrix

| Item | Status |
|---|---|
| Chat gated to Owner/Manager | Done |
| Ad query scoped — chat and dashboard and every other reachable screen | Done, 9 call sites, list above |
| §3 figures | Confirmed — PHP 901,196.96, 12 months, exact match |
| Chat caption | Done |
| `category_llm_model` + lexicon term-count stamp | Done |
| Views-to-reach correlation (FR-09) | Done |
| Per-row validation, all seven paths | Done (prior memo) |

Everything in `Six_Edits_and_Chat_Feature_Decision.md`'s open list is now closed. The one open thread is the chat's cut-model mismatch noted above — your call on how to handle it, not blocking anything else.
