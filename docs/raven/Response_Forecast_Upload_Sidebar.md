# Response: forecast removal, upload decision, and outstanding sidebar work

**Date:** 21 August 2026
**Re:** your memo on the live Holt-Winters section, the §1.1–§1.3 corrections, and the open questions
**Decisions in this document:** three. Two require code changes, one closes an open question.

---

## 0. Summary

| Item | Status | Action |
|---|---|---|
| Live forecast on Page Metrics | ✅ **Done (2026-08-22)** | Removed from both Owner and Marketing Manager Page Metrics — it was on both, not just Owner's. See `docs/raven/Route_Inventory_and_Forecast_Removal.md`. |
| Wording grep + route inventory | ✅ **Done (2026-08-22)** | Grep run app-wide; found and fixed a second identical leak — see note below. Full inventory delivered. |
| Upload Data absent for Owner | ✅ **Done (2026-08-22)** | Owner + Manager both have full upload rights, coverage status table, re-upload guard. See §2A below. |
| §1.1 – §1.3 corrections | **Confirmed shipped** | Nothing further |
| §4 sidebar consolidation | ⏳ **3 of 4 done** | Upload added, Content Library removed, Method Evaluation moved. Rankings/Top Ads merge NOT done — needs your call, see §4A below. |
| FR-30 page growth wording | **Verified correct** | Nothing further |
| §5 Analysis screen layout | **Not started** | Queued after your call on the rankings merge |

**Bonus finding while doing the wording grep:** `/dashboard/owner/correlation` and `/dashboard/marketing/correlation` were also live, reachable routes rendering the cut `laggedCorrelation.ts` feature ("predict future messaging conversations" copy) — same shape of leak as the forecast section, just older and missed when `regression.ts`/`simulation.ts` got their `notFound()` gates. Fixed the same way. Full detail and the complete 33-route inventory in `docs/raven/Route_Inventory_and_Forecast_Removal.md`.

Good work on the memo. Correcting yourself on the server-side enforcement rather than leaving it ambiguous is exactly right, and finding the forecast section on a screen nobody was reviewing is the kind of catch that saves us at defence.

---

## 1. The live forecast — remove it, but not for the reason you cited

You're right that it's neither cut nor documented, just shipped. It goes. But one correction to the reasoning, and it matters because it changes what we'd say if a panelist asked.

### 1.1 The twelve-observation objection does NOT apply here

You suggested the team might un-cut it by arguing that daily data with weekly seasonality escapes the twelve-observations problem. That argument is correct, and it's why the original cut rationale doesn't transfer.

- The original cut (mvp.md line 224) was about **monthly** seasonality: 12 monthly observations, and a seasonal model needs at least 2 complete cycles.
- The Page Metrics section runs on **daily** data: 365 observations, which is **52 complete weekly cycles.** Far more than enough.

So if we were going to reject it on statistical grounds, that particular ground doesn't hold.

### 1.2 It fails for a stronger reason: there is no weekly seasonality in the data

I tested the actual page-level series before deciding. Median daily page views by weekday, across the full 365 days:

| Weekday | Median views |
|---|---|
| Monday | 58,994 |
| Tuesday | 56,738 |
| Wednesday | 62,786 |
| Thursday | 58,912 |
| Friday | 58,827 |
| Saturday | 59,980 |
| Sunday | 63,216 |

**Spread from highest to lowest: 1.11×. Kruskal-Wallis across the seven weekdays: H = 1.03, p = 0.98.**

There is no detectable day-of-week pattern in this data at all. A seasonal model fitted to a series with no seasonality is fitting noise and rendering it as structure.

That's a worse defence position than the original one. If a panelist asked us to show the weekly pattern the model captures, we'd have nothing to point at — and the chart would be presenting random variation as a projection.

### 1.3 Two further reasons it goes

**Chapter 1 is finalised and says we don't do this.** Scope and Delimitations now reads: *"The system reports and analyses recorded performance, and its findings are associations observed in non-experimental data rather than causal relationships."* The delimitation on forecasting was removed from Chapter 1 only because nothing in the Scope suggested we forecast — listing what we don't do invites the question of why not. If the app visibly forecasts, that reasoning collapses.

**No objective covers it.** Un-cutting it properly would need a new specific objective, a Chapter 3 statistical treatment subsection, and Chapter 4 results. That's real manuscript churn for a feature answering no question the owner asks — he authorises budget monthly, so next week's page views change nothing for him.

### 1.4 What to do

- [x] Remove the "Page Views — Next 7 Days" section from `app/dashboard/owner/page-metrics/page.tsx` *(and from `app/dashboard/marketing/page-metrics/page.tsx` — it was there too)*
- [x] Leave `lib/stats/forecast.ts` out of the build (file kept on disk, nothing imports it anymore; also removed the now-dead `MovingAverageForecastChart` component)
- [x] **Grep the entire app for banned wording in user-facing copy:** `forecast`, `projected`, `predicted`, `will generate`, `projection`, `simulation`, `ROI`, `return on investment`
- [x] Report back what the grep finds, even if it's nothing — see `docs/raven/Route_Inventory_and_Forecast_Removal.md`: found and fixed a second leak (`correlation` routes, `laggedCorrelation.ts`)

That last point matters. If forecasting shipped quietly onto one screen, something else may have too. Which brings me to:

### 1.5 Please send a full route inventory

Not just the three sidebars — **every route in the app**, including any not linked from a sidebar. One line each: route, what it renders, which role can reach it.

This slipped through because it was on a screen nobody was reviewing. I'd rather find anything else like it now than at the demo.

**✅ Delivered 2026-08-22** — full 33+ route inventory in `docs/raven/Route_Inventory_and_Forecast_Removal.md`, including one open question (not fixed, awaiting your call): `/ui`, a shadcn component showcase page, has no auth check at all. No business data exposed, but reachable by anyone with the URL.

---

## 2. Upload Data — build it, for both Owner and Marketing Manager

You confirmed no `/dashboard/owner/upload` route exists at all. That's a decision, and here it is.

### 2.1 Both roles get upload rights

**Reasoning:** the Owner and Sir Dan both have Ads Manager access and both have full access to the Facebook page. In practice, the Owner is the one who has actually pulled the exports for us so far. Routing all uploads through the Marketing Manager would mean the Owner sends him files so he can upload them into a system the Owner then reads — a pointless hop, and a single point of failure if either is unavailable.

Upload is also low-risk: it adds records rather than changing judgments, FR-04's upsert means re-uploading a period updates rather than duplicates, and FR-20's audit trail makes every upload attributable.

**Access:**

| Role | Upload Data |
|---|---|
| Owner | Full |
| Marketing Manager | Full |
| Marketing Team Member | Hidden |

### 2.2 The coordination problem, and why a notification is the wrong fix

With two people able to upload, neither knows what the other has already done. The obvious fix is a notification, but that's the wrong shape — notifications are for things needing attention, and this needs the opposite: information sitting there *before* anyone starts, so nobody begins an upload they didn't need to.

**Build a coverage status table at the top of the Upload screen instead:**

| Export type | Months loaded | Last upload |
|---|---|---|
| Advertising | Aug 2025 – Jul 2026 | Jul 2026, uploaded 3 Aug by Sir Dan |
| Organic posts | Aug 2025 – Jul 2026 | Jul 2026, uploaded 3 Aug by Sir Dan |
| Page-level | Aug 2025 – **Jun 2026** | Jun 2026, uploaded 2 Jul by Owner |

Two things this does. It answers "has this already been uploaded?" before the question is asked. And it makes **gaps** visible — in the example above, July page-level data is missing, and nobody would otherwise notice.

Everything it needs is already stored: FR-20's audit trail records user, timestamp, and affected records for every upload. No new persistence required.

### 2.3 Second guard: warn on re-upload of a held period

If an uploaded file covers a period already in the repository, warn **before** processing:

```
This period is already loaded.
  Advertising · July 2026
  Uploaded 3 August 2026 by Sir Dan
  Currently held: 24 advertisements, ₱62,140.55 total spend
  This file contains: 24 advertisements, ₱62,140.55 total spend

Continuing will replace the existing records. [Continue] [Cancel]
```

Showing old and new totals side by side lets the person see whether anything actually changes. For lifetime organic figures, which grow between exports, the totals *will* differ — that's expected and the warning makes it visible rather than silent.

### 2.4 Requirements change

FR-05 currently covers the ingestion summary shown **after** an upload. The coverage status is shown **before**, so the requirement needs extending. I'm updating Chapter 3's Table 3 to read:

> **FR-05 — Centralised repository and ingestion reporting.** The system shall store all ingested records in a single database, preserving the campaign, ad set, and advertisement hierarchy of the advertising records, shall display which periods are already held for each export type, and shall display following each upload the number of records read, stored, updated, rejected, and identified as duplicates.

Build to that wording.

### 2.5 Checklist

- [x] Create the Upload Data route, reachable from both the Owner and Marketing Manager sidebars
- [x] Coverage status table at the top of the screen, per export type: months held, last upload date, uploading user
- [x] Re-upload warning showing existing vs. incoming totals, requiring explicit confirmation
- [x] Hidden from Marketing Team Member — hidden, not disabled, and enforced server-side
- [x] Every upload writes to the audit trail

## 2A. Upload Data — implementation notes (2026-08-22)

**Access.** `actions/upload.ts`'s `uploadCSV` now checks `role ∈ {MARKETING_MANAGER, BUSINESS_OWNER}` instead of Manager-only. New route `app/dashboard/owner/upload/page.tsx` mirrors the Manager's. Team stays excluded — it was never in the nav's `TEAM_VISIBLE_HREFS` set to begin with, and the server action rejects it either way (defense in depth, not just a hidden nav item).

**Coverage status table.** `lib/upload/coverage.ts` (`getUploadCoverage`) derives three rows — Advertising, Organic posts, Page-level — from `min`/`max` on the existing hierarchy tables (`Ad.reporting_starts`, `FacebookPost.publish_time`, `PageMetricDaily.date`) plus the latest successful `UploadLog` entry per export family. No new persistence, exactly as you specified. Rendered by `components/upload/UploadCoverageStatus.tsx` at the top of both upload pages.

**Re-upload guard.** Implemented for **Advertising and Organic posts only** — the two types with a real reporting period. Before the upsert runs, `checkAdPeriodOverlap`/`checkPostPeriodOverlap` in `actions/upload.ts` compute the incoming file's date range and query existing records in that exact range. If any exist, the action returns a new `NEEDS_CONFIRMATION` result (nothing written) carrying existing vs. incoming counts (and total spend, for Advertising) instead of your mockup's literal side-by-side block — same information, table form. The UI (`UploadForm.tsx`) shows it inline per file with Continue/Cancel; Continue re-submits with a `confirmed` flag that skips the check.

**Scoped out, deliberately:** the four page-level daily CSVs (Page Metric, Follower History, Page Viewers, Demographics) do **not** get the guard. They're already continuously-safe daily upserts (the existing "records are matched by date" copy in the drop zone is accurate for them), and Demographics is a snapshot replace with no period concept. If you want the guard on those too, say so and I'll extend it — right now it only fires where "this period already has different numbers" is a meaningful question.

---

## 3. Confirmed — nothing further needed

Thanks for checking these directly rather than taking the earlier review at face value.

- **§1.3 Categorization Review** — server-side enforcement confirmed in `actions/categorize.ts`. The Owner cannot mutate `category_final` even with a crafted request. Correct implementation of FR-07.
- **§1.1 Category labels** — content categories only, no merchandise wording. Correct.
- **§1.2 Budget Reallocation** — retrospective caption present, ₱1,000 filter wired into `lib/stats/budget-reallocation.ts`. Correct.
- **§3.2 FR-30 page growth** — "follows per 100 page visits" verified everywhere, no "funnel" or "conversion rate" leakage. Correct.

---

## 4. Still outstanding: the four sidebar consolidations

None of §2.1–§2.3 from the sidebar review have landed. Restating them so they're in one place:

| # | Change | Why | Status |
|---|---|---|---|
| 1 | Merge `/ad-set-ranking` and `/campaign-rankings` into one screen with an **Ad Set / Campaign / Individual Ad** toggle | FR-15 is a single requirement covering all three levels. Two sidebar entries for one requirement is more navigation than the Owner needs. | ⚠️ **Not done — needs your call, see §4A** |
| 2 | Remove **Content Library** from the Owner sidebar (keep for Manager and Team) | The Owner doesn't audit content history. It's the Manager's screen. | ✅ Done |
| 3 | Move **Method Evaluation** under Reports or a secondary section | It's a research output (FR-08). The Owner will look at it once, if that. Keep it accessible — it's a graded objective and must be demonstrable — but it doesn't need a primary slot. | ✅ Done |
| 4 | Add **Upload Data** (§2 above) | FR-03/FR-05. | ✅ Done |

Net effect on the Owner sidebar so far: 13 items → 12 (Content Library removed, Method Evaluation moved to Reports, Upload added — Rankings and Top Ads are still two separate entries pending #1).

## 4A. Why #1 isn't done — a call needed from you

I opened both pages before merging them and they're not the same shape:

- **`/ad-set-ranking`** ("Rankings") is a simple two-tab table: ad sets or campaigns, each row showing spend / inquiries / CPI / ad count, with a low-confidence flag under 3 ads. This is exactly what your mockup describes.
- **`/campaign-rankings`** ("Top Ads") is a richer individual-ad screen: a date filter, then **six** top-10 panels — three "By Volume" (spend, messaging conversations, reach) and three "By Efficiency" (cost per messaging conversation, CTR, cost per click) — each with its own methodology note.

"Same table structure at every level" doesn't hold once "Individual Ad" is one of the levels — Top Ads isn't a ranked-groups table, it's six independent top-10 lists with different underlying metrics (some ads-only, like CTR and cost-per-click, which don't exist at the ad-set/campaign grouping level in the current code).

Merging them into one Ad Set / Campaign / Individual Ad toggle means picking one of:

- **(a)** Drop the volume panels (spend/reach) and CTR/cost-per-click for the Individual Ad view, showing only spend/inquiries/CPI/count to match the other two levels — loses real content that's on the screen today.
- **(b)** Build a bigger unified component where the Individual Ad level keeps its six panels and the other two levels keep their simpler table — which is really "one nav entry, two different screens under a toggle," not the single consistent table your memo describes.
- **(c)** Something else you had in mind that I'm not seeing.

I didn't want to guess and either quietly cut functionality or build something that doesn't match what you asked for. Let me know which way you want it and I'll build it.

No rush this week otherwise, but this should land before the demo. The panel already flagged the system as having many features without coherence, and the sidebar item count still isn't fully where your memo wants it.

---

## 5. One more thing on FR-10 and FR-11 display

Related to the Analysis screen, since you'll likely be in there anyway.

Your sidebar write-up justified Analysis as giving the Owner "the core statistical relationships behind marketing decisions." That's half right, and the layout should reflect the split:

**Above the fold — what the Owner can act on:**
- The two stable regression coefficients, in plain language (click-through rate is associated with lower cost per inquiry; CPM with higher)
- The residual diagnostic list (FR-12) — advertisements costing more per inquiry than their characteristics would suggest
- One line for the FR-10 correlation, with coefficient, n, and a plain-language reading

**Behind a "view model diagnostics" expander — what the panel needs to see:**
- Full coefficient table, both standard error types
- VIF, Breusch-Pagan, Jarque-Bera
- R², adjusted R², F-statistic
- Cross-validated error against the baseline

Both audiences are served. The Owner gets three things he can use. A panelist gets, in one click, everything showing the model was tested rather than asserted. A page that opens with a VIF table simply won't be read by the Owner, and that's a design failure rather than a content one.

---

## 6. Priority order

1. **Pull the forecast section** and run the wording grep — this is the defence risk
2. **Route inventory** — so we know if anything else slipped through
3. **Upload Data** with coverage status — this is a genuine functional gap
4. **Sidebar consolidations** — before the demo
5. **Analysis screen layout** — whenever you're next in that file
