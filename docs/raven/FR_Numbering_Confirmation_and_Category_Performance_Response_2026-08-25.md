# FR numbering confirmed; Category Performance answered

**Date:** 25 August 2026
**Re:** `FR_Numbering_and_Remaining_Gaps.md` §1 and §4 — the two items you flagged as unblocking everything else.

---

## 1. The seven mappings, confirmed

Checked each against the live code (`AnalysisView.tsx`, `docs/mvp.md` §4.5/§4.5A, and the S5/S7 screen table in §3). All seven hold as you stated them:

| Manuscript | Code | Subject | Verified against |
|---|---|---|---|
| FR-08 | FR-15 | Categorisation method evaluation | `mvp.md` FR-15 name matches exactly; kappa + agreement, three stored columns |
| FR-09 | FR-19 | Promotion criterion analysis (code calls it "ranking comparison") | `AnalysisView.tsx` — Spearman(Views, engagement rate) + top-10%/20% overlap |
| FR-10 | FR-21 | Correlation with method selection | Shapiro-Wilk-gated Pearson/Spearman on ads engagement rate × CPI |
| FR-11 and FR-12 | FR-31 | Regression and residual diagnostic | `fr31-regression.ts` — OLS on ln(CPI), 1.5× residual flag |
| FR-15 | FR-25 and FR-26 | Efficiency ranking and quartile comparison | `budget-reallocation.ts` (quartiles) + `ad-set-ranking.ts` |
| FR-16 | FR-27 | Advertisement lifecycle | `ad-lifecycle.ts` — month-of-life cohort curves |
| FR-17 | FR-20 | Content comparison, category half | `category-distribution.ts` — median Views/engagement rate per category |

No corrections. The matrix is unblocked on this point.

### 1.1 Full `mvp.md` FR list, one line each

FR-01 through FR-24 are inherited verbatim from `docs/CHAPTER 1_Capstone.txt` (the manuscript source) — `mvp.md` does not renumber or rename them. FR-25 through FR-31 are `mvp.md`'s own additions, from handoff §16 and the FR-31 reinstatement.

| FR | Name |
|---|---|
| FR-01 | User authentication |
| FR-02 | Role-based access control |
| FR-03 | Account management |
| FR-04 | Export file upload |
| FR-05 | Export type detection |
| FR-06 | Encoding and format handling |
| FR-07 | Record validation |
| FR-08 | Data cleaning |
| FR-09 | Ingestion summary |
| FR-10 | Centralised repository |
| FR-11 | Derived measure computation |
| FR-12 | Automatic category suggestion |
| FR-13 | Manual category assignment |
| FR-14 | Bulk categorisation |
| FR-15 | Categorisation method evaluation |
| FR-16 | Performance dashboard |
| FR-17 | Aggregated reporting |
| FR-18 | Period comparison |
| FR-19 | Ranking comparison |
| FR-20 | Category distribution analysis |
| FR-21 | Correlation analysis |
| FR-22 | Result interpretation |
| FR-23 | Report export |
| FR-24 | Audit trail |
| FR-25 | Budget reallocation analysis |
| FR-26 | Ad set / campaign efficiency ranking |
| FR-27 | Ad lifecycle and frequency diagnostics |
| FR-28 | Video watch-through rate |
| FR-29 | Post type performance comparison |
| FR-30 | Follows per 100 page visits |
| FR-31 | Regression analysis |

That's 31 code-side requirements against the manuscript's 24 (FR-01–FR-20 in your numbering, FR-01–FR-24 in the handoff's). Requirements with no manuscript counterpart: **FR-25, FR-26, FR-27, FR-28, FR-29, FR-30, FR-31** — the handoff §16 additions plus the reinstated regression. `mvp.md` §4.8 already carries a defensibility note for FR-25–FR-30 (all descriptive/comparative, none causal or predictive), and FR-31's own note in §4.5A makes the same case for the regression. None of the seven look like sprawl to remove — each maps to a named, owner- or manager-facing screen already in the nav — but flagging that the defensibility framing exists in case Chapter 3 needs to cite it directly.

One more count worth naming: **Top Ads** (your §2.4) maps to nothing in either list — it's the one screen with real code and no FR number at all, manuscript or `mvp.md`. Your draft FR-15a in §2.4 is the fix; nothing to add here.

---

## 2. §4 answered: Category Performance is genuinely different, not a richer duplicate

Read both implementations (`category-distribution.ts` behind Analysis's FR-20 section, and `app/dashboard/owner/category-performance/page.tsx`). They diverge on three axes, not one:

| | Analysis → FR-20 section | Category Performance (owner-only) |
|---|---|---|
| Base metric | **Views** (median, Q1, Q3) | **Reach** (total) |
| Engagement figure | Median of per-post `organic_engagement_rate` | Sum-then-divide: Σ(reactions+comments+shares) ÷ Σreach — ALG-09 weighted, not a median |
| Uncategorised posts | Own row, shown alongside the four categories | Excluded from the table, surfaced only as a count in a separate warning banner |
| Statistical framing | Distribution (median + quartiles), so a sparse category like Entertainment doesn't misread as stable | Single weighted average per category, no spread shown |
| Volume figure | n per category only | Total reach per category (a spend/exposure-style volume figure Analysis doesn't show at all) |

This isn't Category Performance showing "the same thing with more detail" — it's a different question. FR-20 asks "how does the *spread* of views and engagement compare across categories, including the unlabelled bucket." Category Performance asks "which category is *most reach-efficient on engagement*, using the same sum-then-divide convention the rest of the app uses for engagement rate elsewhere (FR-29, S6)." A manager deciding what to greenlight next wants the second question; a panelist checking category balance wants the first.

**Recommendation, per your own §4 framing: they're genuinely different, so the access change stands as originally proposed** — add FR-20's Analysis section to Manager and Team nav (already covered by §2.1's role-gating work), and leave Category Performance as the separate Owner-only screen. No merge.

One gap this surfaces that §2.4's Top Ads situation already has a precedent for: **Category Performance itself maps to no FR number, manuscript or code.** It's the second unmapped screen alongside Top Ads. Worth deciding in the same pass — either write a requirement (something like an FR-17a organic-category efficiency ranking, sibling to FR-15a) or explicitly note in the matrix that it's a manager/owner tool without a numbered requirement behind it. Holding this open rather than deciding it myself, same as you asked for §4.

---

## 3. What this unblocks

Per your §7 order: items 1 and 2 are both closed above. §2.1 (gate the regression away from Marketing Team) is next — small, and it's a live access-control gap — followed by the full matrix now that numbering and the Category Performance question are both settled.
