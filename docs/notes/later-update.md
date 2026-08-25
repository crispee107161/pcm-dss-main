Owner Dashboard Redesign — Post-Ship Fixes, Round 3

Context

Round 2 shipped (sparkline resampling, h-fit stretch fix, a _count-based reliability gate
on delta badges) and was re-tested live. The sparklines and empty-space fixes are confirmed
good. The delta badges are not fixed: "Last 12 months" still shows 6763.0%/4957.9%/304.8%
etc., while "Last 6 months" shows sane values (15.0%, 13.6%, 78.7%...). This round replaces
round 2's guard with the actually-correct one.

Why round 2's fix didn't work

Round 2 gated on lastWindowAgg._count._all >= 3 — "does the prior window contain at least 3
ad rows." That's the wrong question. The "Last 12 months" prior window (Aug 2024–Aug 2025) can
easily contain 3+ rows just from the last few days before the real data begins, and those rows
still sum to a near-zero total against a full year of current-window spend — same nonsense
ratio, just with _count._all >= 3 so the gate let it through. Row count was never the
problem; window coverage was.

The tell is in the two screenshots themselves: "Last 6 months" (vs prior 182 days, ending Feb 10) is sane, "Last 12 months" (vs prior 366 days, ending Aug 10) is not. That means the
actual ad data starts somewhere between Aug 2025 and Feb 2026 — recent enough that the 6-month
lookback's prior window (Aug 2025–Feb 2026) is fully inside real data, but the 12-month
lookback's prior window (Aug 2024–Aug 2025) mostly predates it.

PreToolUse:Bash hook error
Failed with non-blocking status code: /usr/bin/bash: line 1: rtk: command not found
PreToolUse:Bash hook error
Failed with non-blocking status code: /usr/bin/bash: line 1: rtk: command not found

Dev server restarted cleanly on http://localhost:3000 (Ready in 486ms) with no port conflict this time. Give it a hard refresh and re-test.

✻ Cooked for 51s · 1 shell still running

❯ [Image #10] whats with the absurd numbers on the last 12 months date selection? is it still bugged?
  [Image #11] Last 6 months selected, here it looks normal compared to last 12 months, what seems to be the problem
[Image #10]
[Image #11]

● Updated plan
/plan to preview

Now let me rewrite the full plan with round 3's diagnosis and fix:

● Updated plan
/plan to preview

● User approved Claude's plan
Plan saved to: C:\Users\Administrator\.claude\plans\https-claude-ai-code-artifact-cd92e46a-4-crystalline-origami.md · /plan to edit
Owner Dashboard Redesign — Post-Ship Fixes, Round 3

Context

Round 2 shipped (sparkline resampling, h-fit stretch fix, a _count-based reliability gate
on delta badges) and was re-tested live. The sparklines and empty-space fixes are confirmed
good. The delta badges are not fixed: "Last 12 months" still shows 6763.0%/4957.9%/304.
etc., while "Last 6 months" shows sane values (15.0%, 13.6%, 78.7%...). This round replaces
round 2's guard with the actually-correct one.

Why round 2's fix didn't work

Round 2 gated on lastWindowAgg._count._all >= 3 — "does the prior window contain at least 3
ad rows." That's the wrong question. The "Last 12 months" prior window (Aug 2024–Aug 20
easily contain 3+ rows just from the last few days before the real data begins, and those rows
still sum to a near-zero total against a full year of current-window spend — same nonsense
ratio, just with _count._all >= 3 so the gate let it through. Row count was never the
problem; window coverage was.

The tell is in the two screenshots themselves: "Last 6 months" (vs prior 182 days, endimonths" (vs prior 366 days, ending Aug 10) is not. That means the
actual ad data starts somewhere between Aug 2025 and Feb 2026 — recent enough that the 6-month
lookback's prior window (Aug 2025–Feb 2026) is fully inside real data, but the 12-month
lookback's prior window (Aug 2024–Aug 2025) mostly predates it.

The correct fix: coverage, not count

A window-over-window delta is only meaningful when the entire prior window falls within
the range the uploaded data actually covers — not merely "the prior window contains a few
rows." Fix in app/dashboard/owner/page.tsx:

1. Get the earliest ad date for free — adHistory is already fetched in full and ordered by
reporting_starts: 'desc', so adHistory.at(-1)!.reporting_starts is the earliest ad date
with zero extra queries.
2. Add one new lightweight query, prisma.pageMetricDaily.findFirst({ orderBy: { date: 'asc' } }),
for the earliest page-metric date (page metrics and ads are different tables with
potentially different coverage).
3. Replace the _count-based priorAdRowsReliable / gate on pageMetricPriorAgg._count._all
with a coverage check: reliable only when earliestDate <= priorWindow.gte — i.e. the prior
window's start is on or after the day data collection began. Remove the now-unused
_count: { _all: true } additions and MIN_ROWS_FOR_WINDOW_DELTA constant from round 2 —
this replaces that mechanism rather than adding to it.
4. Everything downstream (spendDelta/inquiriesDelta/cpiDelta, and the
deltaReliable prop already threaded into PagePerformancePanel in round 2) keeps working
unchanged — only the boolean feeding them changes how it's computed.

This also makes the default (no filter) 7-day view slightly more correct as a side effect: it
was previously assumed there'd always be enough history before "two weeks ago," which is true
today but will now be verified rather than assumed.

Verification

- npx tsc --noEmit and npm test clean
- Re-check live: "Last 12 months" should now either suppress the four KPI/Page-Performance
delta badges entirely, or — if the actual earliest-date math allows it — show a sane
percentage; either way, no more 6763%/4957%/300%-range figures. "Last 6 months" (and other
presets that already looked correct) should be unaffected.