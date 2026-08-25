# 574 live run complete — 519 confirmed, and a sanity check on §3's backward-only-bucketing argument

**Date:** 25 August 2026
**Re:** `574_Greenlight_and_Corpus_Completeness.md`

---

## 1. §1: run, post-run counts

`scripts/raven-574-run.ts` executed against live data. `Rows updated: 427` — exact match to the dry run.

Re-ran the dry-run diagnostic immediately after as a check, not a second mutation:

```
In-period LEGACY_IMPORT remaining: 0        (427 successfully cleared)
Out-of-period LEGACY_IMPORT:       147      (untouched, as designed)
Needs Review (category_final null): 519     (92 prior + 427 returned)
```

Treat the backlog as 519 from this point.

---

## 2. §3: the backward-only-bucketing argument — no evidence against it, one caveat worth having on record

Nothing in what I can see contradicts it. `parseIsoLocalAsManila` and the ingestion pipeline never touch the export tool's own bucketing logic, so I have no independent signal on how Meta assigns rows to files beyond what the twelve real exports already show empirically (which is consistent with your argument: the one crossing we have goes backward, never forward).

One caveat for the record rather than a rebuttal: the argument establishes that *if* Meta buckets on something UTC-anchored, forward-pushing is impossible. §4 of your own memo already flags that the July and August 2025 files look like they used **different bucketing conventions** from each other. If that's true generally — not every file pulled the same way — then "UTC-anchored" isn't a property of the tool, it's a property of *that particular pull*, and a different pull could in principle use a different anchor. I don't have a concrete mechanism that pushes forward to offer, so I'm not saying the argument is wrong — the empirical evidence (811/811 clean, last three in-period posts at 21:00/22:02/02:01 Manila with three hours of margin) still stands on its own regardless of which convention explains it. Just flagging that "backward-only because UTC" is doing more work than "backward-only, empirically, across every post we can check," and the second is the one that's actually proven.

---

## 3. Everything else in §6's open list — will pick up per your stated priority (item 1, cost-per-inquiry-by-category, first)
