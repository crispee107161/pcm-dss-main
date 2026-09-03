# Executive Dashboard: all findings closed, plus account display names

**Date:** 3 September 2026
**Re:** `Executive_Dashboard_Review.md`, `Account_Display_Names.md`
**Status:** every item in both memos addressed (A1–A3, B1–B7, C1–C2, D1–D2). `tsc --noEmit` clean, 410/410 tests (5 new), production build clean. Two schema migrations applied directly to the live DB — both additive/nullable, nothing lost. One follow-up code review before commit caught two real bugs in my own fixes; both fixed, details at the end.

---

## A. Breaks a requirement

### A1 — CPI labelling, done exactly as specified

Both checkboxes: the Median Cost/Inquiry card's subtitle now appends "— no minimum spend filter", and the CPI-distribution caption states the figure is computed per advertisement per month with no minimum expenditure filter, unlike the study-wide analysis. Two string changes, as you estimated.

### A2 — out-of-period axis: real bug, wider than the one chart

You were right that this could be a filter gap affecting more than one chart. `PageMetricDaily` had never been scoped to the study period anywhere in the codebase — FR-04a's implementation only ever covered `FacebookPost` and `Ad`. Fixed:

- New `STUDY_PERIOD_PAGE_METRIC_WHERE` / `withStudyPeriodPageMetric()` in `lib/data/study-period.ts`, mirroring the existing post/ad constants and combiners.
- Applied to the Follows-per-100-Visits query (the chart you flagged), both Page Metrics screens (owner and marketing — same gap, same fix), and the AI chat's dataset summary.
- Left `lib/upload/coverage.ts` deliberately unfiltered, same reasoning as its existing "actual full data range, gaps included" upload-coverage widget — now says so in a comment instead of leaving it implicit.

The chart's caption changed from "Full uploaded history" to "Full study period (Aug 2025 – Jul 2026)", since that's now true. That range string is derived from the same `STUDY_PERIOD_START`/`END` constants, not a second hardcoded literal, so a `STUDY_PERIOD_START`/`END` env override for staging can't leave the caption lying.

### A3 — Recent Uploads: all 5 FR-05 figures, and Read is a real column now

Added Read and Rejected columns (Duplicate was already there as "Unchanged", renamed). First pass derived Read as `inserted + updated + unchanged + rejected` — code review caught that this was a reconstruction of a number already computed at upload time (`actions/upload.ts` computes `records_read` per file type) and just never persisted, so it would silently desync the moment a parser reshapes rows. Added `UploadLog.records_read` (migration, additive, `@default(0)`) and now write the real number instead of deriving it.

One note for Chapter 3: "duplicates" maps to `records_unchanged` (row present and identical on re-upload), not in-file duplicate-key detection. Defensible reading of the requirement, but worth a sentence if a panelist asks.

---

## B. Would look bad in the demonstration

### B1 — arrows fixed for the reported symptom; lag itself unverified in a browser

The custom-range panel was popping open because a stepped range rarely matches a named preset, and the panel's visibility was keyed off exactly that ("does the active range match a preset?"). Added a flag so stepping only ever shifts the window and never reveals the panel — the duplicate control is gone regardless of what caused the lag.

I can't run a browser in this environment, so whether `arrowStepped` also explains the reported lag/freeze (vs. that being a separate issue) is unconfirmed. Worth a manual pass — repeated fast clicks — before this goes in front of a panel, since it was #3 on your list specifically because it's a demo risk.

### B2 — resolved dates now shown at the point of choice

The period selector shows the resolved range under the label, e.g. "Last complete month — Jun 1 – Jun 30, 2026", not just on the KPI cards below it.

### B3 — "Export" → "Reports"

Single-line change, as you sized it.

### B4 — Least Efficient Ads subtitle no longer contradicts the table

Replaced "spend without a matching result" with "these advertisements cost the most per conversation started", your suggested wording.

### B5 — no more curves through 3 points

`ReachTrendChart` (Ad Reach) and both lines in `PostReachViewsTrendChart` (Organic Reach & Views) switched from smoothed interpolation to straight segments with visible markers, matching the Spend/Conversations bar panels beside them.

### B6 — low-confidence bars dimmed, empty categories no longer vanish

`Performance by Content Category` now always renders every assignable category (the underlying query previously filtered out `n=0`, which is why Promotional Offer was disappearing). Bars with `n < 3` — same threshold `PostTypePerformanceTable`/ad-set-ranking already use — render at reduced opacity with a "low confidence" tooltip; a zero-post category shows a bar-less tick labelled "no posts" instead of just vanishing.

### B7 — replaced by your `Account_Display_Names.md`, implemented as specified, with one addition and one correction

- `User.name` added (nullable, migration applied), full name stored, first token shown in the greeting (new `greetingName()` in `lib/greeting.ts`) — exactly your §3 design.
- Threaded through the audit log (name over email, email underneath) and User Management (Name column + optional field on creation), per your §5.
- Your table was missing `owner2@pcmerchandise.com` — the second `BUSINESS_OWNER` seat added for the FR-06 last-active-owner lockout guard, seeded after your memo. It now carries "John Bernard Olermo 2." Whether that's the name that ships depends on whether owner2 is a permanent second seat or a lockout-guard test fixture — that's still open on my end, not yet a settled answer.
- One bug from your own §4 table: `team@` was given the name "Marketing Team," and greeting-truncation-to-first-token turns that into "Good afternoon, Marketing" — addressed to nobody. Changed the stored value to "Team" alone, so the greeting reads "Good afternoon, Team" and the audit log still shows "Team — team@pcmerchandise.com," unambiguous either way.
- Not built: self-service name editing, or an admin path to edit an existing user's name after creation. Both were open questions in your §2, not requirements — happy to build either if you want them.

---

## C. Would be better

### C1 — not restructured

Left the always-current charts where they are rather than grouping them under a divider. The reordering would cross a documented layout constraint (the comment in `DashboardOverview.tsx` explaining why the ad-efficiency and content-category charts specifically must never sit adjacent), and you'd marked this "low priority, if there is time." Flagging rather than silently skipping.

### C2 — first bullet was already done; second bullet fixed

The uncategorised-posts chip already links to `categorizeHref`, which defaults to the Needs Review filter — no change needed there. The spend-without-messaging chip now adds "— may be expected for reach/video ads" and an expanded tooltip citing FR-06, so it reads as a data-health note rather than an error.

---

## D. Two questions

### D1 — no action, as you concluded

Agreed with your own answer: the out-of-period records stay. A2 above was the actual bug (a chart rendering unfiltered data), not the data existing.

### D2 — both answered

- **Does the system send email?** No. Grepped the codebase for any mail-sending path (SMTP, a provider SDK, a `sendEmail` call) — nothing exists. Password reset is the admin-issued-temporary-password flow (SR-A8), not an email flow. Worth stating in Chapter 3 as the design decision it is: no external service in the authentication path, no account-recovery path leaves the system.
- **Are the account addresses deliverable, or usernames in email format?** Usernames in email format — confirmed directly with the client-facing side of this project, not inferred from the code. Nothing is ever actually delivered to `marketing@`/`team@`/`owner@pcmerchandise.com`.

---

## Caught in code review before this landed

Ran a full review pass before committing. Two real bugs in my own first-pass fixes, both fixed before push:

1. **`DateRangeFilter`'s new resolved-date display would crash on a malformed `?from=`.** `from`/`to` reach the component straight from `searchParams` with no validation; an `Invalid Date` fed to `Intl.DateTimeFormat.format()` throws `RangeError` during render, blanking the dashboard. Now gated behind the file's existing `ISO_DAY` regex.
2. **The `User.name` seed wasn't idempotent.** It only set `name` when creating a brand-new row, so re-running seed against an already-seeded DB — this shared dev/prod one included — would never populate the field. In practice this was moot (I'd backfilled the four live rows directly and verified them), but the code itself had no path to fix a name later or handle a fresh clone correctly. `seed.ts` now updates `name` on the existing-row branch too.

Both migrations (`User.name`, `UploadLog.records_read`) are additive nullable/defaulted columns — no backfill required, no table rewrite, safe on the shared Neon instance.
