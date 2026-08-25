# §1, §3, §4 built. §2 demographics answered — it's not a gap. §5 surfaced two real ones.

**Date:** 25 August 2026
**Re:** `FR16_Caveat_Demographics_Gap_and_FR18_Decisions.md`
**Status:** four code changes made and verified (`tsc`, 372/372 tests, build all clean). §2 answered — your premise doesn't hold, with receipts. §5 done for Upload Data and User Management; Content confirmed as already covered by earlier memos; two new findings surfaced.

---

## §1: the ad-month label — done

`lib/stats/ad-lifecycle.ts`'s `FrequencyDiagnostic` now carries `adCount` (distinct advertisements, computed via a `Set` on `ad_id`) alongside `n` (ad-month rows). The card heading in `AnalysisView.tsx` reads:

> **Frequency Diagnostic (n = 482 ad-months across 187 advertisements)**

with a line underneath: *"Each advertisement contributes multiple rows here, so this significance is indicative, not a formal test on independent observations."*

**Confirming the advertisement count:** 187. Verified two ways — it's the same n FR-21's correlation reports elsewhere on the same screen (also all messaging ads, one row per ad there), and I ran the distinct count directly against the eligible rows (`frequency > 0 && total_messaging_contacts > 0`) rather than assuming FR-21's population is identical in composition, just size. Both land on 187.

Added a test (`ad-lifecycle.test.ts`) exercising the ad-month-vs-distinct-ad distinction directly: 2 ads × 3 rows each → `n=6`, `adCount=2`.

---

## §3: the Dashboard row split — done

`DashboardOverview.tsx`: "Cost-per-Inquiry Distribution" (ad) now pairs with "Organic Reach & Views Trend" (organic). "Performance by Content Category" (organic) now pairs with "Follows per 100 Page Visits" (organic, page-level). No chart with an ad-efficiency metric shares a row with the category chart anymore. Left a code comment on both rows explaining why, pointing back at your memo, so a future edit doesn't recombine them without knowing this was deliberate.

---

## §4: the four fixes — done

- **FR-20 category distribution callout.** New `categoryDistributionCallout()` in `AnalysisView.tsx` — excludes UNCLASSIFIED and n<3 rows, states the highest and lowest median-engagement categories as a sentence above the table. Same pattern as Category Performance's existing "Best engagement" card.
- **Post Type Performance per-row interpretation.** New `describePostTypePerformance()` in `lib/stats/post-type-performance.ts`, wired into both the Owner and Marketing Manager/Team routes (identical page files). It specifically handles your Reels example — when the same format tops engagement and trails views, it states that as one contrast sentence rather than two disconnected ones: *"Reels has the highest median engagement rate (X%) but the lowest median views (Y) — engagement and reach don't move together here."* Restricted to n≥3 rows, same confidence floor the table already uses.
- **Top Ads eligible-pool count.** Added `countEligibleForCostPerInquiry`, `countEligibleForCtr`, `countEligibleForCostPerClick` to `lib/stats/campaign-rankings.ts`, mirroring each `rankBy*` function's own filter predicate exactly (kept as separate functions rather than changing what `rankBy*` returns, so the existing `RankedAd[]`/`RankRow[]` shape used elsewhere didn't need to change). Wired into both `campaign-rankings/page.tsx` routes (Owner and Marketing Manager) — each of the three efficiency panels' methodology note now states how many ads cleared its floor in the selected date range, e.g. *"14 ads cleared that floor in the selected range."*
- **Dashboard narrative on the two median cards.** Added an optional `note` prop to `KpiCard` (distinct from `sub`, which states sample size — `note` states what the number means). Median CPI: *"Half of ads this period cost less than this per inquiry, half cost more."* Median Engagement: *"Half of posts this period perform above this rate, half below."* Spend/Inquiries/Posts cards untouched, per your call that totals don't need this.

---

## §2: demographics — real ingestion path, real requirement coverage. Your premise doesn't hold.

Checked all three questions directly in code before accepting the framing.

**Q1 — how does demographic data get in?** The real upload form, same path as every other file. `lib/csv/detect.ts` has dedicated detection: `detectIfAudienceBuffer()` for `Audience.csv` (checked before the generic page-metric buffer check, since both match the same UTF-16LE `sep=,` shape) and header-based detection for `Gender.csv`/`FollowerTopTerritories.csv` → `DEMOGRAPHICS_CSV`. `actions/upload.ts` routes both through real validate/upsert pipelines (`validateAudienceResult`/`upsertAudience`, `validateDemographicsRows`/`upsertDemographics`) with the same inserted/updated/unchanged accounting every other file type gets. Not a seed script, not a side channel.

**Q2 — what happens if someone uploads `Audience.csv` today?** Clean detection and ingestion — validated, upserted, logged to `UploadLog` like any other file. If a genuinely unrecognised file is uploaded, `detectCsvType()` throws an error that names every accepted type explicitly (ADS, POSTS, FollowerHistory, Viewers, FollowerGender, FollowerTopTerritories, or any page-level metric CSV) — not a crash, not silent partial ingestion, a clean rejection with a specific message.

**Q3 — which requirement authorises this, and this is the one that matters.** Split into two separately-answerable questions, because you'd bundled them:

- **Ingestion is already authorised.** `data_catalog.md` describes the client's actual page-level export bundle as *"Page-level export → `FB_PageLevel_Data/` (9 files: 6 daily series + 3 demographic snapshots)."* Gender.csv, FollowerTopTerritories.csv, and Audience.csv are not a fourth export family invented by the code — they're the demographic-snapshot subset of the same page-level bundle the client already exports from Meta Business Suite, alongside the 6 daily-series files. Manuscript FR-05 (*"determine whether an uploaded file is a page-level, organic post, or advertising export from its column composition, and reject files that match none of the three"*) already covers this: these are page-level files, detected by a finer-grained shape check within that bucket (daily series vs. demographic snapshot), the same way the code already distinguishes FollowerHistory from PageViewers from a generic page-metric file — all three are "page-level," none of them get their own manuscript requirement, and demographics fitting the same pattern isn't a new problem. There is no fourth ingestion path.
- **Display is not authorised — you're right about this half.** I read all 24 manuscript requirements directly (`docs/CHAPTER 1_Capstone.txt`, FR-01 through FR-24). None of them mention gender, territory, age bracket, or city-level audience composition reporting. Page Metrics' Gender/Territory/Age-Gender/Top-Cities charts have no manuscript requirement naming them, in either numbering scheme. This part of your concern is confirmed, not resolved by the ingestion answer.

So the corrected framing: **ingestion is fine, already covered, nothing to fix on that side. Display is the actual gap**, and it's narrower than "an unauthorised fourth path" — it's "four charts with real data and no requirement sentence." Your inclination to write the requirement rather than remove the charts reads right to me given that framing, but that's your call to make, not mine to build toward without you saying so.

**On the scale trap:** already handled, confirmed in `data_catalog.md` directly — *"the scale problem was already handled: `Gender.csv` is percent-form with no 'Other' bucket (73.7 + 26.3 = 100 exactly), `FollowerTopTerritories` is fraction-form, and `validate-demographics.ts`'s fraction/percent auto-detection normalises both to one scale."* Not a live risk, already caught during the original Audience.csv ingestion work.

---

## §5: Upload Data and User Management walked. Content already covered. Two real findings.

### Upload Data

**Your specific ask — does the ingestion summary show five figures (read, stored, updated, rejected, duplicates)?** No. `UploadResult` (`types/index.ts`) carries exactly three: `records_inserted`, `records_updated`, `records_unchanged`. There's no "read" total distinct from the sum of those three, no per-file "rejected" count, and "duplicates" isn't a separate concept from `records_unchanged` (a row identical to what's already stored). FR-09 in the manuscript (*"the number of records read, stored, rejected, and identified as duplicates"*) is a four-figure requirement (read/stored/rejected/duplicates — your memo said five, but I only count four named in the sentence); the code shows three, and none of them is literally "rejected."

**Why there's no rejected count — and this is the bigger finding.** `lib/csv/validate-ads.ts` and `validate-posts.ts` throw on the *first* invalid row (`Row ${index + 1}: ${message}`), which propagates to `actions/upload.ts`'s outer catch and fails the **entire file** — zero records inserted, a generic client-facing message ("Upload failed. Please check your file and try again."), and the specific row/reason is logged internally but never shown to the user. This directly contradicts manuscript **FR-07**: *"validate uploaded records... and report rows that fail validation without discarding the remainder of the file."* Right now, one bad row discards the whole file. This isn't a labelling gap like the others — it's a real behavioral gap against a manuscript requirement, and it's why there's no "rejected" figure to display: the code has no concept of a partially-rejected file, only whole-file success or whole-file failure.

I haven't touched this — it's a bigger change than a label (per-row validation would need to collect errors instead of throwing, then decide what to do with the valid rows around a bad one), and it changes upload semantics, so flagging rather than guessing at the fix.

**What does work, confirmed:** file-type detection from column composition (FR-05, `detectCsvType`), rejection of genuinely unmatched files with a listed set of accepted types, UTF-8/UTF-16 encoding + preamble handling (FR-06 — confirmed in `detect.ts`'s buffer-level BOM checks and `parse.ts`'s multi-line preamble skip), and the overlap-confirmation flow (FR-05-adjacent: warns before silently replacing a period already on file, per `checkAdPeriodOverlap`/`checkPostPeriodOverlap`).

### User Management (account management, manuscript FR-03)

**Create:** works (`createUser` action, form in `UserManagement.tsx`). **Modify (role):** works (`updateUserRole`). **Reset credentials:** works (`resetPassword`).

**Deactivate — this is the second real finding.** The manuscript says *"create, modify, deactivate, and reset the credentials."* The code's fourth action is `deleteUser`, which runs `prisma.user.delete()` — a hard delete, not a deactivation. There's no `is_active` flag or equivalent soft-delete field on the `User` model (checked `prisma/schema.prisma` directly). Two consequences beyond the wording mismatch:

1. It's more destructive than the requirement calls for — a deleted user's identity is gone, not suspended, which also runs against FR-24 (audit trail: *"the user... for every upload and every manual category assignment"*) for any history tied to that user going forward.
2. `UploadLog.user_id` has a required, non-optional relation to `User` with no `onDelete` behavior specified in the schema, which under Prisma's default is `Restrict` — meaning deleting a user who has ever uploaded a file should fail with a foreign-key constraint error rather than succeed. I haven't run this against the live DB to confirm the failure mode (that's a five-minute check if you want it), but the schema shape says it's a real risk, not a hypothetical one, for any account that isn't brand new.

Same as the upload-validation finding — not fixing without your read on it, since "deactivate" vs. "delete" is a product decision (add an `is_active` column and flip a flag instead of deleting?) not a one-line label fix.

### Content

Already covered in `FR_Table_Clarifications_Response_2026-08-25.md` §2.6 (this session, earlier thread) — confirmed server-side role gating on all three write paths (`updatePostCategory`, `autoCategorizeAll`, `batchConfirmAgreed`) restricted to `MARKETING_MANAGER`, Team included in the restriction, not just a UI hide. Nothing new to add there.

---

## What's still open

- The FR-07 whole-file-rejection gap and the deleteUser/deactivate gap are new findings, not yet fixed. Both need a decision from you on the intended behavior before I build anything.
- Whether demographics gets a written requirement or the charts come out — still your call per §2's framing above.
- The FR-27 cohort-curve interpretation you said was low-value/optional — not done, per your explicit "your call, low value either way."
