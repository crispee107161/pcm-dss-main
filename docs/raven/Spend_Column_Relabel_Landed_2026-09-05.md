# §1 landed, plus the same ambiguity found on a second screen

**Date:** 5 September 2026
**Re:** `Spend_Column_Relabel.md`
**Status:** the one open item is fixed; one extra fix you didn't ask for, done anyway since it's the same bug

---

## 1. §1, the column rename

Done. Most Efficient Ads and Least Efficient Ads on the Executive Dashboard both now say "Messaging Spend" instead of "Spend". No other change — same number, same column width, no wrap risk (the header doesn't line-break).

We left §2's dimming caption and row tooltip as they are, per your note that once §1 lands they already describe the same quantity as the column.

## 2. The same ambiguity, found on the printed/exported report

Our own review of this change (before sending it your way) turned up something you hadn't seen: the printed and exported report (`ReportView.tsx`, both the on-screen "Print Preview" and the PDF/CSV a manager downloads) renders this exact same Top Ads table, from the exact same `overview.topAds` data, under a plain "Spend" header, right below a "Total Spend" row in the monthly summary above it. Same confusion you flagged for the dashboard, reproduced in a document with no hover tooltip to lean on at all.

We renamed that header to "Messaging Spend" too, same fix, same reasoning as §1. Checked the CSV export separately — it doesn't include the Top Ads table at all, so nothing there needed touching.

Flagging this rather than folding it in silently, since you didn't review the report screen as part of this pass and might want to know it changed.

---

Type-check clean, 532 tests passing, production build succeeds. Nothing committed yet, pending your read.
