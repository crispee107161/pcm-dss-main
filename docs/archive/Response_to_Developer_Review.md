# Response to `MVP - review.md` — FR-27 resolved + data-source policy

**Date:** 12 August 2026
**Re:** your review of `PCM_DSS_Developer_Handoff - New.md`
**Status:** all four open points answered. One decision made (FR-27 → month-of-life). Action items at the end.

---

## 0. Short version

1. **You were right.** The FR-27 cohort figures weren't reproducible from `data/` — the source file isn't in the repo.
2. **The figures are real.** They come from the *daily 19-column* ads export, which the client sent **before** the 93-column re-export. I've re-run them; they reproduce exactly. A verification script is attached.
3. **We're changing FR-27 anyway.** Rather than make the client export two files a month forever, FR-27 moves to **month-of-life** using the monthly export only. I tested it — the finding survives.
4. **The system will only ever ingest ONE ads export type: the 93-column monthly one.** The daily set becomes a one-off archive for the Chapter 4 write-up.

Go ahead with every doc update you listed. For FR-27, it's option (a) *and* a spec change — see §3.

---

## 1. FR-27 — where the numbers came from

**Source:** `john-bernard-olermo-ads-<month>.csv` × 12 — the **19-column daily** export with a `Day` column.
**Not** `PCM-ADS-*.csv` (93-column monthly). Those 12 files are attached.

Your reasoning about why the monthly export can't produce week buckets is **exactly right** and worth keeping in the docs: `Reporting starts` values are ~30 days apart, so "weeks since first delivery" only ever lands near multiples of 4. Week-of-life genuinely requires day granularity.

**Re-run output (attached script `verify_fr27.py`, run from the folder holding the 12 daily files):**

```
total ads: 186
median max week of life: 9
ads surviving >= 11 weeks: 44

COHORT-RESTRICTED (44 ads surviving >= 11 weeks):
       spend  results    cpi
wk
0   26823.44   1833.0  14.63
1   25285.83   1731.0  14.61
2   24308.28   1597.0  15.22
3   27315.62   1895.0  14.41
4   25232.21   1753.0  14.39
5   24821.19   1734.0  14.31
6   28688.66   2281.0  12.58
7   27309.81   2129.0  12.83
8   27490.69   2205.0  12.47
9   26368.61   2174.0  12.13
10  27293.57   2178.0  12.53
11  26467.42   2106.0  12.57

short-lived (<4wk):  n=54  CPI=14.10
long-lived (>=11wk): n=44  CPI=13.38
```

Every figure in the handoff matches. The script `assert`s on the presence of a `Day` column so it fails loudly if pointed at the monthly export.

**One caveat you should know about, since it affects how we write this up:** the daily export has **no `Ad ID`** — only `Ad name`. So this analysis keys on name, and 12 ad names are shared across different Ad IDs. Not fatal for a lifecycle curve, but it's a real limitation and another reason not to build the production feature on this file.

**Fair correction in the other direction:** the handoff *did* name the source — FR-27's note says "week-of-life requires the *daily* ads export (the older 19-column files)." The problem was file distribution, not an undocumented claim. That's on us for not shipping the files with the doc.

---

## 2. Answering your question: do both exports need to feed the system?

**No. One export type only — the 93-column monthly `PCM-ADS-*.csv`.**

Here's the actual difference between them:

| | Daily (19-col) | Monthly (93-col) |
|---|---|---|
| `Day` column | ✅ **only unique field** | ❌ |
| `Ad ID` | ❌ (name only) | ✅ |
| `Campaign name` / `Campaign ID` | ❌ | ✅ |
| `Post engagements` | ❌ | ✅ |
| `Views`, `Viewers` | ❌ | ✅ |
| Everything else | subset | superset |

**The daily export contributes exactly one field: `Day`.** Everything else it has, the monthly export has — and better, with a real primary key.

Making the client export two files every month, forever, to power one feature is not a good trade. So:

- **System ingests:** monthly export only.
- **Daily export:** archived, used once, for the Chapter 4 write-up.

---

## 3. FR-27 revised spec — month-of-life

I tested whether the finding survives at monthly resolution. **It does.**

```
187 messaging ads. Max month-of-life distribution:
  0 months: 48 ads    1 month: 25 ads
  2 months: 64 ads    3 months: 50 ads

COHORT >= 2 months (n=114 ads):
  month 0: ₱15.53 → month 1: ₱15.29 → month 2: ₱13.58 → month 3: ₱13.03

COHORT >= 3 months (n=50 ads):
  month 0: ₱14.66 → month 1: ₱14.49 → month 2: ₱12.71 → month 3: ₱13.03

single-month ads (n=48):     CPI ₱14.66
ads running >= 4 months (n=50): CPI ₱13.58
```

Same direction, same magnitude, coarser resolution — and it needs **no extra file from the client**.

### FR-27 (revised) — Ad lifecycle and frequency diagnostics

**Primary user:** Owner
**Answers:** "Am I retiring ads too early? Am I over-showing them?"
**Source:** monthly export only.

**Method**
```
month_of_life(ad, row) = (row.Reporting_starts.month) − (min Reporting_starts.month for that Ad ID)
cohort  = ads whose max month_of_life >= N          (N configurable, default 2)
curve   = for each month index: SUM(spend) / SUM(results)   ← sum-then-divide, per ALG-09
```

**Build the cohort-restricted curve, not the raw one.** The raw curve mixes ads killed early with ads that ran long, so "CPI improves with age" could just be bad ads leaving the denominator. The cohort restriction is what makes the finding defensible.

**Display requirements**
- Cohort size (n ads) shown prominently
- Configurable minimum-survival threshold, default 2 months
- Side-by-side: single-month ads (₱14.66) vs. ads running ≥4 months (₱13.58)
- Frequency diagnostic alongside: `Frequency = Impressions / Reach`, ρ = −0.241 vs CPI (p<0.001, n=482), median frequency 1.55, p90 2.14, max 3.22

**Interpretation to surface:** no ad fatigue is detectable at this account's frequency levels. Retiring ads early is more likely costing inquiries than saving them.

**Chapter 3 note (documentation side, not yours):** the finer weekly curve was computed once from an archived daily export and is reported as supporting detail; the system computes month-of-life.

---

## 4. Your recommended doc updates — all approved

Go ahead with everything in your "Recommended next step", with one change:

| Your item | Verdict |
|---|---|
| Replace FR-25 unfiltered table with filtered (≥₱1,000, n=108); keep unfiltered as reconciliation footnote | ✅ do it |
| Add FR-25 minimum-spend-filter requirement + "configurable, default from Chapter 1" | ✅ do it |
| Rename FR-30 → "follows per 100 page visits"; drop funnel/conversion language | ✅ do it |
| FR-27: (a) locate/re-verify, or (b) adopt caveat with figures marked unverified | ✅ **(a) — source located, figures verified — AND replace with the month-of-life spec in §3 above** |
| Fold in FR-26/FR-29 confounding caveats | ✅ do it |
| Add a §21-style defensibility pass + language table to `mvp.md` | ✅ do it |

**Additional:** add a line to `data_catalog.md` recording that **two ads exports exist**, that the **monthly 93-column one is the sole system input**, and that the daily 19-column set is an archive used once for Chapter 4 — never blended with the monthly data in any single metric.

---

## 5. On your framing point

> "Framing this as 'just a minimum change' undersells it."

Agreed, and noted. Three of six FRs got methodological corrections, not a wording pass. Future revisions will say what actually changed.

Your verification table — checking each numeric claim against the raw files rather than taking them on trust — is the right instinct and caught a genuine distribution failure. Keep doing that.

---

## 6. Action items

**Us (sending with this doc):**
- [x] 12 daily ads CSVs (`john-bernard-olermo-ads-*.csv`) — for archive/verification only
- [x] `verify_fr27.py`
- [ ] Confirm the FR-25 minimum-spend threshold once Chapter 1 fixes it (currently ₱1,000 provisional)

**You:**
- [ ] Apply the six doc updates in §4
- [ ] Replace FR-27 with the month-of-life spec in §3
- [ ] Record the two-export policy in `data_catalog.md`
- [ ] Keep the daily files in the repo as `archive/` — **not** wired into the ingestion pipeline
- [ ] Confirm: does the current ingestion reject a 19-column ads file? It should, since only the 93-column export is a valid system input. If ALG-01's `REQUIRED_ADS` subset currently matches both, tighten it to require `Ad ID` and `Campaign name`.

**Open (team, not blocking you):**
- Manual labelling of 150–200 posts for FR-15 — hasn't started; gates Objective 2.2
- "Views vs Viewers" clarification with the client
- FR-25 threshold decision
