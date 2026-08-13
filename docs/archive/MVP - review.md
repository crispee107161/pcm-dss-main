# Review: `PCM_DSS_Developer_Handoff - New.md`

**Date:** 2026-08-12
**Subject:** `docs/PCM_DSS_Developer_Handoff - New.md`, checked against `docs/PCM_DSS_Developer_Handoff (1).md` (the prior authoritative version) and against the raw files in `data/`.

---

## Context

The new file is identical to `PCM_DSS_Developer_Handoff (1).md` through §20, then adds one new section — **§21 "Defensibility summary for FR-25 to FR-30"** — plus inline corrections inserted directly into §16's FR-25, FR-27, and FR-30 write-ups. Framing this as "just a minimum change" undersells it: three of the six new features (FR-25, FR-27, FR-30) got real methodological corrections, not just a wording pass.

## Verification performed (read-only, against `data/`)

| Claim | Result |
|---|---|
| FR-25 unfiltered quartile size skew (Q1 n=47 med spend ₱5,587/449 inquiries … Q4 med ₱333/8 inquiries) | ✅ exact |
| FR-25 filtered quartiles (spend≥₱1,000, n=108): Q1 27/₱375,809.90/31,875/₱11.79 … Q4 27/₱59,745.30/1,988/₱30.05 | ✅ exact |
| FR-25 counterfactual: Q4 at Q1 rate → ≈5,067 inquiries (+3,079) | ✅ exact (5,067, +3,079) |
| FR-28 sanity checks: n=397, median watch-through 0.10, 1 post >100%, median duration 61s, max 192s, none <5s | ✅ exact (min is 6s, consistent with "none under 5s") |
| FR-28 correlation: ρ=0.363, p<0.001, n=397 | ✅ exact (p=8.9e-14) |
| FR-27 frequency-vs-CPI: ρ=−0.241, p<0.001, n=482, median frequency 1.55 | ✅ exact (unchanged from the prior doc, re-confirmed) |
| **FR-27 cohort-restricted week-of-life curve (44 ads surviving ≥11 weeks, CPI ₱14.63→₱12.57)** | **⚠️ Could not reproduce.** This requires day-level `Day`/`Reporting starts` granularity. The file the document itself says this needs — "the *daily* ads export (the older 19-column files)" — **is not present in the current `data/` folder.** `data/` currently contains `Ads/`, `Demographics/`, `FB_OrganicPosts_Data/`, `FB_PageLevel_Data/`, `New_FB_Ads_Data/`, `Organic Posts/`, `Page-Level Metrics/` — no `FB_Ads_Data/`. Attempting the same cohort logic on the monthly export (the only ads data available) cannot produce week-level buckets at all — monthly `Reporting starts` values are ~30 days apart, so "weeks since first delivery" only ever lands near multiples of 4, never on the 3/5/6/9/11 buckets the table shows. The figures in the document are therefore either computed from a file no longer in the repo, or from a source not identified in the document — **this is a genuine, unverifiable gap**, not a nitpick, since FR-27 is the one place in §21 that claims a bias was checked and found *not* to invalidate the feature. |
| FR-30 wording correction ("follows per 100 page visits", not "funnel"/"conversion rate") | Not a numeric claim — reasoning is sound on its face: visits and follows are two independently-collected daily series with no per-user link, so calling the ratio a funnel or conversion rate implies an attribution the data can't support. Confirmed structurally against `data_catalog.md` §3, which already documents these as separate daily series with no per-user join. |

## Verdict

The new file **does make sense as an upgrade** on the two axes that are checkable, and raises one honest gap.

**1. FR-25's correction is real and important.** The unfiltered quartile split was contaminated by regression to the mean — Q4 wasn't "bad ads," it was "low-volume ads," with the worst quartile's median spend at ₱333 against Q1's ₱5,587. The minimum-spend filter (≥₱1,000, n=108) produces a *larger and more defensible* counterfactual (+3,079 vs. the original +2,103), and every figure reproduces exactly. This is a correct and valuable catch — the original FR-25 as documented in `mvp.md`/`data_catalog.md` should be updated to the filtered version.

**2. FR-30's wording fix is correct and cheap.** "Follows per 100 page visits" is the honest description; "funnel" and "conversion rate" both imply a per-user link between visiting and following that the data doesn't have. Worth adopting regardless of anything else.

**3. FR-27's survivorship-bias framing is the right instinct, but the specific numbers in the cohort table are not reproducible from what's currently in `data/`.** The daily export the analysis depends on isn't in the repository right now. Two possibilities: either that folder existed at some point and was since removed/renamed, or the number was computed elsewhere and pasted in without the source file being carried along. Either way, before this table goes into `mvp.md`/`data_catalog.md` as a verified figure, the daily source needs to be located (or re-exported from Meta) and the cohort curve re-run against it — right now it's an unverified claim sitting next to five verified ones, which is a meaningfully different confidence level than the rest of the document implies.

**4. §21 as a whole is good practice** — a self-audit section that flags which of the six new FRs are descriptive-safe versus at risk of reading as predictive, plus a concrete "don't write / write instead" table. That's exactly the kind of thing a panelist will probe, and having it pre-answered is a real strength of this version over the prior one.

## Recommended next step (not yet executed — awaiting direction)

If these corrections are folded into the working docs, the following would need updating in `docs/mvp.md` and `docs/data_catalog.md`:

- Replace the unfiltered FR-25 quartile table with the filtered (spend≥₱1,000) version, keep the unfiltered one only as a reconciliation footnote.
- Add the FR-25 minimum-spend-filter requirement and the "configurable threshold, default from Chapter 1" note to the FR-25 write-up.
- Rename FR-30 from "page growth funnel" to "follows per 100 page visits" throughout, and drop "funnel"/"conversion" language.
- For FR-27, either (a) locate/re-export the daily ads file and re-verify the cohort table before adopting it, or (b) adopt the survivorship-bias *caveat* now (defensible on reasoning alone) while marking the specific cohort figures as unverified pending the source file.
- Fold in the FR-26/FR-29 confounding caveats (period/targeting differences; algorithmic distribution differences) as one-line additions to those two write-ups.
- Add a short "defensibility" pass to `mvp.md`'s FR-25–FR-30 section modeled on this document's §21, including the language table (don't write / write instead).

This is a documentation-only follow-up (no code) and is distinct from this review — it hasn't been done yet, pending confirmation.
