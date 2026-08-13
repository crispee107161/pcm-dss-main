# Messaging-conversations DV pivot — phased plan

> **Superseded 2026-08-14** by `docs/mvp.md` (rewritten 2026-08-12 for the MVP v2 respec) and `docs/PROGRESS.md`. This document reflects pre-respec scope/roles (e.g. Sales Director, cut analytics features) and is kept for historical reference only — do not treat it as current.

> **Status:** All 4 phases done or substantially done as of 2026-08-08 (Sales
> Director dashboard deferred within Phase 3 — see below). Written
> 2026-08-05, revised 2026-08-08 (multiple times) after architect +
> code-explorer review. Supersedes `ADS-DAILY-PLAN.md`'s "keep monthly and
> daily separate" approach — that plan is obsolete now that the outcome
> metric itself is changing, so there's no longer inquiry data on the
> monthly side worth protecting from being overwritten.

## Progress checklist

- [x] **Phase 1 — Stats layer + all `inquiries` consumers** — done, verified
      2026-08-08 (129/129 tests, `tsc` clean, retrained against real data).
- [x] **Phase 2 — Run the already-built upload pipeline** — done, verified
      2026-08-08 (8,220 daily rows + 133 monthly-survivors uploaded,
      regression retrained at n=186).
- [~] **Phase 3 — UI relabel + What-If Simulator fix** — mostly done,
      2026-08-08. Simulator confirmed already correct. Marketing/Owner
      dashboards fixed (real data bugs + relabeled). **Sales Director
      dashboard explicitly deferred** — see the Phase 3 section below.
- [x] **Phase 4 — Docs** — done, 2026-08-08. `SCOPE.md`, `ALGORITHMS.md`,
      `docs/data_catalog.md`, `docs/mvp.md` updated (title change +
      messaging-conversations DV framing). `system_design.md` and
      `docs/mvp.md` are historical design docs kept largely as-written, with
      a superseded-content banner added rather than rewriting their worked
      examples wholesale. `PRODUCT.md` needed no change (already generic).
      `docs/Chapter 3 (3.1 to 3.4).pdf` still carries the old title — that's
      the docs team's artifact, not something to edit in this repo (see
      Phase 4 section below).

## 2026-08-08 review findings (why this revision exists)

Three independent review passes were run against this plan before starting
Phase 1.

- **Code-explorer (pass 1)** confirmed every claim about *already-built*
  code (the upsert/validation/upload pipeline) is accurate as written —
  nothing fabricated. One gap at the time: `data/FB_Ads_Data/` did not exist
  on disk yet.
- **Architect (pass 1)** found the original Phase 1 file list was
  dangerously incomplete: `inquiries` is read in roughly 321 places across
  55 files, not the 3 files originally listed. Running Phase 2 against the
  original Phase 1 scope would silently break most of the app. Expanded
  Phase 1 accordingly and added a rollback step to Phase 2 and a merge gate
  before the single combined PR.
- **Architect (pass 2, after the 12 real CSVs landed in `data/FB_Ads_Data/`)**
  re-verified Phase 1's scope against current source (count drifted to ~419
  hits / ~68 files — added two more files below) and checked the real CSVs
  against the plan's assumptions (headers match, filenames don't matter,
  date coverage fully supersedes the three existing monthly rows). Found one
  new **blocking bug**: the upload pipeline's day-coverage supersession
  check can leave stale monthly rows alive alongside daily rows for ads with
  zero-delivery days, corrupting the training set with month-sized outliers.
  See the new blocking-bug note in Phase 2 — this must be fixed before
  Phase 2 runs, even though Phase 1 can start today.
- **External data-scientist critique + fact-check + architect pass 3
  (2026-08-08).** An outside reviewer flagged 5 points. Two were
  independently fact-checked against the real CSVs and code, three held up:
  the claim that `total_messaging_contacts` "doesn't exist" and would null
  every row was **false** (see the clarifying note in Phase 1 — the ingestion
  code already derives it correctly); the specific VIF/correlation figures
  they cited were **not reproducible** from the actual data. But the
  pseudo-replication finding was **confirmed exactly** (4,986 ad-day rows
  across only 186 unique ads, median 17 rows/ad) and the "Purchases was
  unusable, not just unavailable" finding was **confirmed** (September: 19/65
  ads with any purchase, 40 events, zero conversion value on any row). Both
  are now reflected below — Phase 1 gains an aggregate-to-ad-level step and
  Phase 2's "several thousand" success criterion is corrected to ~186.

## Why this changed

`Daily vs Monthly Ads Export - Finding.pdf` correctly diagnosed that the new
daily Facebook export never carries a `Purchases` column — not a mapping bug,
a different export format. Verified independently against the raw CSVs
(September: 4,789 messaging conversations and ₱66,067.60 spend, exact match
both exports).

**This is not a substitution forced by the export format.** The
Facebook-reported Purchases field is unusable in every month where it
exists, independent of which export is used. In September 2025 — the one
month both exports overlap and can be directly compared — only 19 of 65 ads
recorded any purchase, 40 events in total, 12 of those recording exactly
one, with no conversion value on any row. Cost per purchase ranged from
₱106.41 to ₱5,110.67, driven almost entirely by single events. Purchases
also carries no monetary value in either export format, so it can never
produce ROAS or revenue regardless of which export the pivot chooses. And
the campaigns are optimized for messaging in the client's own account
(`messaging_conversation_started_7d` is the recorded result indicator), not
for purchases.

Decision made: adopt the daily export fully, and change the capstone's
outcome metric from Facebook-reported "Purchases" (`inquiries` in this
system) to "Messaging conversations started." Stated limitation, so it
doesn't get lost: a messaging conversation is a shallower indicator of
customer intent than a completed purchase. The study measures inquiry
generation as an indicator of purchase intent, not purchase itself — declare
that in scope rather than letting the larger sample size obscure it. The
choice is correct on the merits, not a concession to time pressure.

Full context and the draft revised `SCOPE.md` text: see the plan mode output
from 2026-08-05 (not yet copied into the repo — `SCOPE.md` itself is
untouched pending sign-off on Phase 3/4 below).

## The technical fork this requires

Current formula: `Inquiries = β₀ + β₁·Reach + β₂·MessagingContacts + β₃·Spend`
— messaging conversations is currently a *predictor*. It can't also be the
*outcome*. New formula, the only statistically valid option:

```
MessagingConversations = β₀ + β₁·Reach + β₂·Spend
```

## Phases

### Phase 1 — Stats layer + all `inquiries` consumers (not small — this is the real work) ✅ DONE

**Not just 3 files.** `inquiries` is read in ~419 places across ~68 files
(some of that is docs/plan text; roughly 55 are source files). The list
below is every category found across the 2026-08-08 reviews; grep for
`inquiries` before starting and treat any hit not covered here as a bug in
this plan, not a reason to skip it.

- `lib/stats/regression.ts` — training query and DV switch from `inquiries`
  to `total_messaging_contacts`; drop `messaging` from the predictor set
  (`X = [1, reach, amount_spent]` instead of `[1, reach, messaging, amount_spent]`).
  **Note for future reviewers:** `total_messaging_contacts` is populated in
  `lib/csv/validate-ads-daily.ts` from the `Results` column where
  `Result type == 'Messaging conversations started'` — there is no raw CSV
  column literally named "Total messaging contacts" and none is needed; the
  field is derived on ingest, not null on daily rows.
  Also fix `maybeRetrainRegression`'s filter (`where: { inquiries: { not: null } }`,
  currently at `lib/stats/regression.ts:153`) — daily rows have null
  `inquiries`, so this must switch to filtering on `total_messaging_contacts`
  or retraining silently yields `n = 0` after Phase 2. And fix
  `adj_r_squared`, which currently hardcodes `numPredictors = 3` — it must
  become `2` for the new formula.
- **Unit of analysis — aggregate to ad level (new, confirmed 2026-08-08):**
  `maybeRetrainRegression` currently does a flat `prisma.ad.findMany` with no
  aggregation, so after Phase 2 every ad-day row becomes one training
  observation. The real daily data is 4,986 messaging-result rows across
  only 186 unique ads (median 17 rows/ad, max 93) — treating those as
  independent observations is pseudo-replication and deflates standard
  errors. Add an aggregation step in Phase 1 that rolls daily rows up to one
  row per ad (sum spend, sum messaging contacts) before training; expect
  n≈186 (or ~160 with a ≥₱100 lifetime-spend floor), not several thousand.
  State explicitly how `Reach` is aggregated — Facebook's `Reach` is
  deduplicated per period, so summing daily reach overstates lifetime reach;
  either take the max daily reach as a floor-estimate or document the known
  overstatement rather than silently summing.
- `lib/stats/ad-set-metrics.ts`, `lib/stats/cost-cutting.ts`,
  `lib/stats/health-score.ts`, `lib/stats/budget-allocator.ts`,
  `lib/stats/campaign-rankings.ts`, `lib/stats/laggedCorrelation.ts`,
  `lib/stats/spearman.ts`, `lib/stats/simulation.ts` — every one of these
  reads or ranks on `inquiries` today and needs to move to
  `total_messaging_contacts`.
- `lib/data/analytics.ts`, `lib/reports/report-data.ts`, `lib/insights/*` —
  data-layer and report aggregation also read `inquiries`; audit each.
- Owner dashboard's `category-performance` view and the sales dashboards —
  both display inquiry-derived figures and need the same swap.
- `lib/csv/validate-ads.ts` + `lib/csv/detect.ts` — the monthly upload path
  still maps a Purchases column to `inquiries`; confirm whether monthly
  uploads stay supported post-pivot or should be retired.
- `types/index.ts` / `prisma/schema.prisma` — shared type/schema definitions
  reference `inquiries`; audit whether the field itself should be renamed,
  deprecated, or just left nullable-and-unused going forward.
- **Collinearity check:** the two-predictor formula (`Reach`, `Spend`) risks
  near-collinearity in Facebook ad delivery data. `gaussianElimination`
  currently `continue`s silently on pivots below `1e-12`, returning a
  coefficient of 0 instead of erroring — this can misread as "spend doesn't
  matter" when it's actually a numerically singular fit. Add a condition
  number or VIF check and surface a warning (not a silent zero) when
  triggered. **Compute VIF against the actual post-aggregation, post-Phase-2
  training set** before deciding anything — an external reviewer's claimed
  VIF of 14.3 (r=0.964, "160 obs") could not be reproduced against the real
  data under any tested aggregation method (best match found: r≈0.29–0.41).
  Don't preemptively drop to a spend-only model on that reviewer's numbers;
  only drop `Reach` if the real computed VIF actually exceeds the threshold.
- **RegressionModel table:** rows are append-only; old models trained under
  inquiry-semantics remain in the table. A tagging scheme is overkill here —
  just purge the stale inquiry-era rows in a one-off cleanup so
  `predictFromModel` can never accidentally load one after the switch.
- Verify: retrain against real data, confirm `n` and coefficients are sane,
  and run `npm test` — multiple existing `*.test.ts` files assert
  inquiry-DV semantics and will need updating alongside the code, not after.

### Phase 2 — Run the already-built upload pipeline ✅ DONE

The ingestion side is **done**, not new work: `lib/db/upsert-ads.ts`,
`lib/csv/validate-ads-daily.ts`, `actions/upload.ts` already implement daily
uploads superseding overlapping monthly rows, atomically, with a
day-coverage containment check (a partial/truncated file can never delete a
monthly row it doesn't fully cover) and an audit trail (`UploadLog.records_superseded`).
This was safe to hold off running only because it depended on Phase 1 landing
first — running it before Phase 1 would null out `inquiries` while the
dashboards still read that field, breaking them. Note this dependency only
holds if Phase 1 actually covers the full consumer list above — the original
3-file Phase 1 scope did not.

- **Precondition: met as of 2026-08-08.** `data/FB_Ads_Data/` now has all 12
  monthly CSVs (Aug 2025–Jul 2026, one per month). Headers were checked
  against `ADS_DAILY_REQUIRED_HEADERS` and match exactly — the inconsistent
  filenames/casing are harmless since file-type detection is header-based,
  not filename-based. Coverage fully spans the three existing monthly rows
  in `data/Ads/` (Sep 2025, Dec 2025, Jan 1–27 2026), which means after this
  phase runs, **zero inquiry data remains anywhere in the DB** — the
  pre-upload snapshot and those three original monthly CSVs become the only
  recovery path if something goes wrong.
- **Rollback step:** the monthly-row deletion in `upsert-ads.ts` is a real
  `deleteMany` — irreversible, and `UploadLog.records_superseded` only
  stores a count, not the deleted rows. Take a DB snapshot/backup immediately
  before running uploads, and if possible dry-run against a copy of the DB
  first rather than production/dev data directly.
- **Blocking bug found 2026-08-08 — supersession gap:** the day-coverage
  containment check in `upsert-ads.ts:60-77` is per-(ad, ad set) pair and
  requires *every* day in a monthly row's span to be covered by daily rows
  before that monthly row is deleted. But daily exports omit zero-delivery
  days for a given ad, so some monthly aggregate rows will survive uploads
  and sit alongside their own daily rows — double-counting reach/spend, and
  (unlike today) those survivors will carry non-null
  `total_messaging_contacts`, entering training as month-sized outliers
  mixed into daily observations. **Fix before running Phase 2:** add a
  post-upload assertion that no `Ad` row with a multi-day span
  (`reporting_ends - reporting_starts >= 1 day`) remains inside the uploaded
  date range; fail loudly if one does, rather than letting it upsert.
- Upload all 12 files from `data/FB_Ads_Data/` via the Marketing Manager
  upload page
- **Verify (corrected 2026-08-08):** regression `n` jumps from 42 to
  approximately **186 ads** (or ~160 with the ≥₱100 lifetime-spend floor),
  *not* "several thousand" — the 4,986 daily rows are not independent
  observations once aggregated to the ad level (see the unit-of-analysis
  note in Phase 1). Fewer-but-independent observations is the correct
  outcome here, not a shortfall; say so explicitly if this comes up at the
  defense. Also verify: cost-cutting has eligible ad sets again; owner
  dashboard renders; run `npm test` again post-upload.

### Phase 3 — UI relabel + What-If Simulator fix 🟡 MOSTLY DONE (Sales deferred)

- "Inquiries" → "Messaging Conversations" (or final wording, TBD) across KPI
  cards, `RegressionSummary`, `CorrelationTable`, `ReportView`, chat/AI copy
  (`actions/chat.ts`, `actions/ai-insights.ts`), login stat cards
- Text relabeling is cosmetic, no runtime/data risk — can happen any time
  after Phase 2.
- **Not cosmetic (moved out of "deferred," see below):** `predictFromModel`
  and the What-If Simulator still take `messaging` as an input slider. Once
  the DV switch lands, that means the simulator predicts messaging
  conversations *from* a messaging-conversations input — a real correctness
  bug, not a rename. This must be fixed (reduce the simulator to reach/spend
  inputs) or explicitly disabled with a "temporarily unavailable" state
  before the defense — do not ship it silently broken.
- **Verified 2026-08-08: this was already fixed.** `lib/stats/simulation.ts`,
  `components/analytics/WhatIfSimulator.tsx`, and
  `components/analytics/pages/SimulationView.tsx` only take `reach` and
  `amount_spent` as predictors; `messaging_input` is hardcoded to `null`.
  No lingering `actions/simulate.ts` exists either. Nothing to do here.
- **Skipped for now, 2026-08-08 — Sales Director dashboard.** Everything
  under `app/dashboard/sales/` (`page.tsx`, `campaign-rankings/page.tsx`) and
  its shared components (`SalesDashboardTabs.tsx`, `CampaignHealthTable.tsx`,
  `lib/stats/health-score.ts` + its test) still reads the deprecated
  `inquiries` field and needs the same `total_messaging_contacts` swap as the
  marketing side, plus the "Inquiries" → "Messaging Conversations" relabel.
  Explicitly deferred by user request to save tokens/scope this pass —
  **not** fixed, **not** started. `lib/stats/health-score.ts` is only
  consumed by the sales dashboard (confirmed via grep — no other caller), so
  it's entirely in scope for this deferral, not a shared dependency.
  **Correction, 2026-08-08:** `app/dashboard/owner/category-performance/page.tsx`
  was flagged as a bug by an earlier Explore-agent pass in this session, but
  a direct read shows it already correctly uses `total_messaging_contacts`
  throughout (queries, aggregation, labels) — that finding was stale/wrong.
  No action needed there; it's Owner-dashboard code anyway, not Sales.

### Phase 4 — Docs ✅ DONE

- `SCOPE.md` (the one that matters most — panel-facing), `PRODUCT.md`,
  `ALGORITHMS.md`, `CAPSTONE-IMPROVEMENTS.md`, `system_design.md`,
  `docs/data_catalog.md`, `docs/mvp.md`
- Pure text, zero code risk, but this is what the defense narrative rests on
  — don't skip it just because it doesn't block the app running
- **Title change (new, 2026-08-08):** the paper's official title is now "A
  Decision Support System (DSS) for Facebook Content Performance and
  Advertising Efficiency Analysis at PC Merchandise," replacing "Linking
  Facebook Engagement to Sales: A Decision Support System for Targeted
  Marketing at PC Merchandise." This retitling drops sales/purchases framing
  entirely — scope is strictly ad efficiency, expense reduction, engagement,
  and customer inquiries, which is exactly the direction this DV pivot was
  already heading. Two files in the repo still carry the old title and old
  "Purchases → inquiries is the regression outcome variable" framing and
  need both fixed together, not just the header text:
  - `docs/data_catalog.md` line 4 (old title in the doc header) and its
    "Ads CSVs → T4" section, which still describes `Purchases` as the
    **primary regression outcome variable** — needs to describe
    `total_messaging_contacts`/`Results` (filtered by `Result type`)
    instead, consistent with Phase 1's DV switch.
  - `docs/mvp.md` — "Core Purpose" and the Stage 2/3 regression descriptions
    still say `Inquiries = 1.8168 + 0.000705 × Amount Spent` and frame the
    whole MVP loop around inquiries-from-spend; needs the same DV/formula
    update as `SCOPE.md` and `ALGORITHMS.md`.
  - `docs/Chapter 3 (3.1 to 3.4).pdf` also carries the old title — flagged
    here for awareness, but as a submitted PDF chapter it's the docs team's
    artifact to update, not something to edit directly in this repo.

### Deferred, not in this plan

- Nothing currently deferred. The What-If Simulator rework was previously
  listed here but is real correctness work required before the DV switch can
  ship safely — it has been moved into Phase 3 above.

## Before any of this touches git

- `data/FB_Ads_Data/` (real client CSVs, landed on disk 2026-08-08) is
  untracked and was **not gitignored** — now added to `.gitignore` (line 54)
  so it never lands in git history.
- Nothing from the whole session so far is committed. Recommend committing
  Phases 1+2 together as one PR — that's the first point where the repo is
  fully working end-to-end (broken 42-row model → working ~186-ad model),
  not a halfway state.
- **Merge gate — do not open the PR until all of these are true:**
  1. `.gitignore` covers `data/FB_Ads_Data/` — **done, 2026-08-08.**
  2. `npm test` is green, including any tests updated for the new DV
     semantics (several existing tests assert `inquiries`-based behavior and
     need rewriting, not deleting).
  3. `npm run build` is clean.
  4. A DB snapshot was taken before Phase 2's upload ran, per the rollback
     step above.
