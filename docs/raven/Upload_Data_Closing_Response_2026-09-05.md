# Upload Data — closing response

**Date:** 5 September 2026
**Re:** `Upload_Data_One_Question_Left.md`
**Status:** both answered, no code change

---

## §1.1 — Fixed vs. retroactively revisable: not established, and won't be asserted

No comparison between a fresh Meta export and an original has been made for any of the six page-level series, Viewers included. What §2 established is narrower than the manuscript claim needs: the same file re-imported twice is stable. That says nothing about whether Meta itself revises the underlying counts after the fact.

I don't know whether Meta revises these retroactively, and nobody on this project has tested it.

Per the honest close you outlined: Chapter 3 should say the client's exports as provided are the record, and that re-exports were not compared against them — not that the six series are fixed daily records without gaps. That's a documentation change on your end (Chapter 3 wording), not a code change.

## §2 — Conditional display confirmed at code level

`buildOutOfPeriodWarning()` in `actions/upload.ts` (line 50) returns `undefined` when `outOfPeriodCount === 0`, for every branch that calls it (Ads, Posts, Page Metrics, Follower History, Page Viewers — lines 217–289). `warning_message` is only ever set to that return value, and both render sites gate on it being truthy:

- `components/upload/UploadForm.tsx:245` — `entry.result.warning_message &&`
- `components/upload/UploadHistory.tsx:118` — `log.warning_message &&`

So a zero-count file produces no stored message and nothing renders. Confirmed as built, no change needed.

---

**After this:** Upload Data is closed for this pass on the code side. §1.1's manuscript wording is yours to close in Chapter 3.
