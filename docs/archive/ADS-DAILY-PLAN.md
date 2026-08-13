# Separate daily ads data from monthly — drop the supersede mechanism

> **Superseded 2026-08-14** by `docs/mvp.md` (rewritten 2026-08-12 for the MVP v2 respec) and `docs/PROGRESS.md`. This document reflects pre-respec scope/roles (e.g. Sales Director, cut analytics features) and is kept for historical reference only — do not treat it as current.

> **Status:** Planned, not started. Written 2026-08-05. Supersedes the
> "daily supersedes monthly" approach that was partially implemented and is
> currently sitting uncommitted in the working tree.

## Context

We added an `ADS_DAILY_CSV` upload path for Facebook's per-day ad export. To avoid
double-counting against the existing monthly `ADS_CSV` rows (both land in the `Ad`
table, and no `lib/stats/` consumer is granularity-aware), we built
`deleteSupersededMonthlyRows` — daily rows delete the monthly rows they cover.

**That design is based on a false premise.** It assumed daily data is strictly more
informative than monthly. It isn't:

| | Old `ADS_CSV` (monthly) | New `ADS_DAILY_CSV` |
|---|---|---|
| Grain | ad/ad-set/**month** | ad/ad-set/**day** |
| Columns | 33 | 19 |
| Metric shape | one explicit column per metric | polymorphic `Results` + `Result type` |
| `Purchases` → `inquiries` | ✅ | ❌ **absent** |
| `Link clicks` | ✅ | ❌ |
| This dataset | 230 rows, ₱215k, 3 months | 4,986 kept rows, ₱710k, 12 months |

The daily export is finer in *time* but poorer in *fields*. Every daily row gets
`inquiries: null`, and `inquiries` is the dependent variable of the whole DSS:

- `lib/stats/regression.ts:153` — `findMany({ where: { inquiries: { not: null } } })` is the only training source
- `lib/stats/regression.ts:74` — `const y = data.map(d => d.inquiries)`
- `lib/stats/ad-set-metrics.ts:68` — `.filter(g => g.total_inquiries > 0)` gates every cost-cutting recommendation

Verified against the real files: **all 33** inquiry-bearing (ad, ad-set) pairs — 42 rows,
180 inquiries — also appear as messaging pairs in the daily files. A full daily upload
would therefore delete every row carrying inquiry data, leaving the regression with
**zero training rows** and cost-cutting with **zero eligible ad sets**.

`SCOPE.md` (panel-reviewed 2026-08-02) locks this: it names the model
`inquiries ~ reach + messaging + spend`, defines inquiries as *"the CSV column Facebook
labels 'Purchases'"*, and lists *customer inquiries* as one of four locked scope pillars.
Dropping `Purchases` is a scope change, not a refactor.

**Intended outcome:** treat the two exports as what they are — different datasets that
share a shape, not two granularities of one dataset. Monthly keeps feeding the inquiry
model; daily powers time-resolution and spend-coverage features. The supersede/delete
mechanism disappears entirely, removing the highest-risk code in the changeset.

## Approach

Give daily rows their own table. Zero changes to any existing `lib/stats/` consumer, so
no regression risk to the defended analysis before a capstone defense.

### 1. Schema — new `AdDaily` model (`prisma/schema.prisma`)

Mirror `Ad` minus the fields this export cannot carry (`inquiries`, `link_clicks`),
same unique key so re-uploads upsert cleanly:

```prisma
model AdDaily {
  id                       Int      @id @default(autoincrement())
  day                      DateTime
  ad_name                  String
  ad_set_name              String
  attribution_setting      String
  reach                    Int?
  impressions              Int
  amount_spent             Float
  total_messaging_contacts Int?
  results                  Int?
  cost_per_result          Float?
  created_at               DateTime @default(now())

  @@unique([ad_name, ad_set_name, day])
  @@index([day])
}
```

Migration is purely additive. Also drop the now-unused `UploadLog.records_superseded`
column added in `20260805071251_add_upload_log_superseded_count` (it only existed to
audit the supersede delete).

### 2. Delete the supersede mechanism (`lib/db/upsert-ads.ts`)

Remove `findSupersededMonthlyRowIds`, `deleteSupersededMonthlyRows`, the `ExistingAdRow`
interface, and `ONE_DAY_MS`. **Keep** the `Db` type parameter and the collision-safe
`pairKey` (`JSON.stringify`) fix — both are improvements independent of supersede.
Remove the corresponding `describe('findSupersededMonthlyRowIds')` block from
`lib/db/upsert-ads.test.ts`.

### 3. New `lib/db/upsert-ads-daily.ts`

Follow the existing upsert pattern exactly — reuse `emptyCounts` / `isUnchanged` from
`lib/db/upsert-counts.ts` as `upsert-ads.ts` does. Same find/create/update/unchanged
counting. No transaction needed: without a delete, a partial failure is now merely
incomplete, not destructive.

### 4. Daily validator returns its own record type (`lib/csv/validate-ads-daily.ts`)

Currently returns `AdRecord[]` with `inquiries: null` / `link_clicks: null` padding, and
maps `Day` onto both `reporting_starts` and `reporting_ends`. Change to a dedicated
`AdDailyRecord` with a single `day` field, dropping the null padding. Remove
`supersededMonthlyRows` from `AdsDailyFilterSummary`.

**Keep unchanged** — these are correct and well-tested (`validate-ads-daily.test.ts`):
the `Result type` messaging filter, the blank-row rescue (prevents censoring
zero-conversion days), and the duplicate `(ad, ad-set, day)` merge.

### 5. Route the upload (`actions/upload.ts`)

The `ADS_DAILY_CSV` branch calls `upsertAdsDaily(adRecords)` — no `$transaction`, no
supersede call, no `records_superseded` on the `uploadLog.create`. Keep skipping
`maybeRetrainRegression` (still correct: no inquiries in this export).

### 6. UI (`types/index.ts`, `components/upload/`)

Drop `supersededMonthlyRows` from `UploadResult.filter_summary` and its display in
`UploadForm.tsx`; revert the `records_superseded` line in `UploadHistory.tsx`. Keep the
`droppedByResultType` breakdown — it tells the uploader what the filter removed.
Keep the `ADS_DAILY_CSV` badge in `TYPE_LABELS`.

### 7. Keep the detect-order fix (`lib/csv/detect.ts`)

`ADS_DAILY_REQUIRED_HEADERS` checked before `ADS_REQUIRED_HEADERS` stays — it guards
against a future daily export gaining a `Purchases` column and being misrouted to the
unfiltered monthly validator.

## Follow-up (not code — worth doing before the defense)

The inquiry regression trains on 42 rows / 180 events. Daily data cannot improve this
(no `Purchases` column). The real fix: `data/Ads/` has only **Sep '25, Dec '25, Jan '26**,
while `data/FB_Ads_Data/` covers **Aug '25 – Jul '26**. Re-exporting the missing ~9 months
**in the monthly Ads Manager format** would grow the inquiry sample roughly 4x with real
DV data, strengthening the model the defense rests on.

## Verification

1. `npx prisma migrate dev` — additive migration applies cleanly
2. `npx prisma generate && npx tsc --noEmit` — clean
3. `npm test` — existing 121 tests pass; the `findSupersededMonthlyRowIds` block is
   removed, new `upsert-ads-daily` coverage added
4. **Confirm no data loss path remains:** `grep -rn "deleteMany\|delete(" lib/db/` should
   return nothing for ads
5. **End-to-end on real data:** upload a file from `data/FB_Ads_Data/` via the Marketing
   Manager upload page. Verify: rows land in `AdDaily`, `Ad` row count stays **230**,
   and `SELECT COUNT(*) FROM "Ad" WHERE inquiries IS NOT NULL` still returns **42**
6. Confirm the owner dashboard's regression and cost-cutting cards still render with
   real output (they read `Ad`, so they must be unaffected)

## Out of scope

- Building daily-granularity features (trend charts, forecasting on daily spend). This
  change only lands the data safely; consuming it is separate work.
- Changing the regression's dependent variable away from `inquiries` — that is a
  `SCOPE.md` change requiring panel approval, not a code decision.

## Current working-tree state (as of writing)

Uncommitted on `refactor/inquiries`. 121 tests pass, `tsc --noEmit` clean, but the
supersede code should **not** be run against the production DB — it is the thing this
plan removes.

```
 M actions/upload.ts
 M components/upload/UploadForm.tsx
 M components/upload/UploadHistory.tsx
 M lib/csv/detect.ts
 M lib/csv/validate-ads.ts
 M lib/db/upsert-ads.test.ts
 M lib/db/upsert-ads.ts
 M prisma/schema.prisma
 M types/index.ts
?? data/FB_Ads_Data/                                    # real client CSVs, not gitignored
?? lib/csv/validate-ads-daily.ts / .test.ts
?? prisma/migrations/20260804183127_add_ads_daily_csv_upload_type/
?? prisma/migrations/20260805071251_add_upload_log_superseded_count/
```

Note: both migrations have already been applied to the Neon database.
