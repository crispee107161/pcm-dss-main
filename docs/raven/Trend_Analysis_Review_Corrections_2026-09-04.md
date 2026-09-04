# Trend Analysis review: corrections and status

**Date:** 4 September 2026
**Re:** Owner account, Trend Analysis — reply to `Trend_Analysis_Review.md`
**Status:** §1 and §2's em-dash follow-up now coded and pushed (`92efdbe`). §2 and §3 were already fixed before this memo, on the same day as the original review. §4 is not a bug — it needs a product decision, not a code fix. `Trend_Analysis_Review.md` is unchanged; read this alongside it.

---

## 1. §1 — the false banner: real bug, wrong diagnosis, now hardened further

The core finding was right: the banner, the charts, the rough-guide comparison, and the period list all shared one broken source, and fixing it fixed all four without touching them individually. That instinct (§1.1) and the "arbitrary subset points elsewhere" read (§1.2) were both correct.

What it actually was, though, wasn't any of the three things §1.2 asked us to check. There was no query, no second table, no `distinct`, `take`, `limit`, or dropped join. It was a hardcoded three-element literal array in `TrendAnalysisView.tsx`:

```ts
const TARGET_PERIODS = [
  { label: 'Sep 2025', year: 2025, month: 9 },
  { label: 'Dec 2025', year: 2025, month: 12 },
  { label: 'Jan 2026', year: 2026, month: 1 },
]
```

Fixed 2026-09-04 (`dc837d9`) by deriving the period list from actual ad and post dates instead. Since then we found and closed one gap in that fix: it only read `Ad.reporting_starts`, so an ad row spanning a month boundary could still make a real month look absent. `reporting_ends` is now included too (`92efdbe`), and the em dash in the banner sentence itself (which §0.1 exists to catch) is gone in the same commit.

§1.3 held with no changes needed — the rough guide now compares Jun 2026 → Jul 2026 automatically.

**For next time:** if this class of bug resurfaces, check for a hardcoded literal before assuming a query problem. The checklist in §1.2 would have sent an engineer into the data layer for something that was three lines in the view component.

---

## 2. §2 — the toggle: fixed, but as an outline, not a fill

Confirmed present at the time of the review (`ChartViewToggle`'s neutral skin gave the active segment a white/`--secondary` pill on a light-gray track with no stronger text weight — genuinely hard to read as "pressed," especially in dark mode).

Fixed 2026-09-04 (`37d0f26`), but the fix took a different shape than requested. Instead of "a filled background and stronger text," the active segment now gets a `--primary`-colored border and text on a bordered track — an outline rather than a fill. It solves the same-weight problem, but if a filled/pressed look specifically matters, this isn't that yet. Also worth knowing: in dark mode, the tinted border is close to the only cue distinguishing the two states (the fill contrast is thin by design, per the code comment explaining the choice).

Confirmed it also covers the Executive Dashboard, as guessed — same component, `DashboardOverview.tsx`.

---

## 3. §3 — the 0–140 axis: fixed the same day, before the review's own timestamp

Fixed 2026-09-03 (`35ed4dc`) — the same date as the memo, so the screen was almost certainly captured from a build just ahead of that commit. The axis domain is now computed from the actual data range (floor/ceil to the nearest 10, padded by 10 on each side) instead of a fixed 0–140.

One correction to the memo text: §3 holds up the Organic Post Engagement panel as not having this problem and "worth using as the reference." Both panels render the same chart component with the same axis config — there was never a second implementation to copy from. The only difference was that panel's data happening to span a wider range. Worth knowing so nobody goes looking for a different axis implementation to port over.

Smaller thing: the gridline list quoted in §3 ("0, 35, 70 and 140") isn't actually evenly spaced and skips 105 — looks like a transcription slip reading the screenshot. A 0–140 domain with 5 ticks lands on 0/35/70/105/140, which is regular. The real defect was the 0-anchored domain, not irregular intervals, and that's what got fixed.

Not addressed by the fix: tick placement is still Recharts' default `tickCount`, so it isn't guaranteed regular for an arbitrary data range, only for the ranges checked so far. Flagging in case it matters later, not asking for a change now.

---

## 4. §4 — the ROUGH GUIDE label: not downstream of §1

This is the one place the memo's own hypothesis doesn't hold up. §4 asks whether the label exists because of period-selection unreliability, and guesses it "should disappear when that is fixed." It won't, because it was never wired to the period list at all.

`InsightHeader`'s confidence badge has three tiers — Reliable / Rough guide / Weak signal — and `lib/insights/trend-insight.ts` types this card's confidence as `'medium' | 'low'` only. There's no code path where it can render "Reliable," regardless of how complete the underlying data is. At the time of the review, the Dec 2025 → Jan 2026 comparison was already consecutive months, which is the best rating this card's logic can currently produce.

So: the finding's accuracy was never in question, and the caveat genuinely is unearned for a complete, consecutive-month comparison — but removing it means widening `Confidence` to include `'high'` and deciding what should gate that tier. That's a product call, not something §1 delivers as a side effect. Nothing coded here yet, pending that decision.

---

## 5. One more thing not in the original memo

The dashboard's own three-month window (`lib/data/dashboard.ts`, via `distinctMonths(..., 3)`) is an intentional design limit on the Executive Dashboard, not the same class of bug as §1. Flagging only so it isn't "fixed" to show twelve months by analogy to this screen — that would be a scope change, not a bug fix.

---

## 6. Net effect

`Trend_Analysis_Review.md` is untouched — this memo carries the corrections and status instead. §1 and its follow-up gap are coded and pushed (`92efdbe`, on top of `dc837d9`). §2 and §3 needed no further action beyond what already shipped on 2026-09-03/09-04. §4 is open and waiting on a decision about `trend-insight.ts`'s confidence tiers.
