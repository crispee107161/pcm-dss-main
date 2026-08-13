# PCM DSS — Developer Handoff

**Project:** A Web-Based Decision Support System for Facebook Content Performance and Advertising Efficiency at PC Merchandise
**Prepared for:** the group's developer
**Data covered:** 1 August 2025 to 31 July 2026 (12 months)
**Status:** all findings below verified against the actual client files

---

## 0. Read this first

Three things will cost you the most time if you learn them late:

1. **The three exports cannot be joined to each other by any post or ad identifier.** There is no key linking an organic post to the advertisement it became. Do not design a schema that assumes one.
2. **The three exports use different encodings and different file layouts.** A single `pd.read_csv(path)` will fail on one of the three families.
3. **Organic captions live in two different columns depending on post type, and 173 of them use stylised Unicode.** Reading the wrong column, or skipping normalisation, silently destroys the categorisation feature.

Everything else is detail. These three are structural.

---

## 1. The three data sources

### 1.1 Advertising export (PCM-ADS-*.csv)

| Property | Value |
|---|---|
| Files | 12 (one per month) |
| Encoding | UTF-8 with BOM (`utf-8-sig`) |
| Header | Row 1, no preamble |
| Columns | 93, identical across all 12 files |
| Rows | 746 total |
| Grain | **One row per advertisement per reporting month** |

**Key columns:** `Campaign name`, `Campaign ID`, `Ad set name`, `Ad set ID`, `Ad name`, `Ad ID`, `Page ID`, `Reporting starts`, `Reporting ends`, `Amount spent (PHP)`, `Result type`, `Results`, `Cost per result`, `Reach`, `Impressions`, `Post engagements`, `Views`, `Viewers`, `Link clicks`, `Delivery status`.

**Hierarchy:** 26 campaigns → 24 ad sets → 309 unique Ad IDs (297 unique ad names — 12 names are reused across different Ad IDs, so **always key on `Ad ID`, never on `Ad name`**).

**Grain confirmation:** `(Ad ID, Reporting starts)` is unique — max 1 row per pair. 211 of 309 ads appear in more than one month, so lifetime ad totals require summing across months.

**Empty columns (15 of 93 are 100% null):** `Result value type`, `Results ROAS`, `Bid`, `Messages delivered`, `Marketing messages CTR`, `Marketing messages read`, `Result value type.1`, `Results value`, `Cost per message delivered`, `20-second phone calls`, `60-second phone calls`, `Event responses`, `Cost per join group request`, `Returning messaging contacts`, `Results (initial)`. Ignore these — do not let the validator require them.

**Note:** There is no `Objective` column. Campaign objective must be inferred from `Result type`.

### 1.2 Organic post export (MMM-01-YYYY_*.csv)

| Property | Value |
|---|---|
| Files | 12 (one per month) |
| Encoding | UTF-8 with BOM (`utf-8-sig`) |
| Header | Row 1, no preamble |
| Columns | **32, 33, or 34 — varies by month** |
| Rows | 730 total, 730 unique `Post ID` |
| Grain | **One row per post, lifetime cumulative totals** |

**Column instability (this is why signature matching must be fuzzy):**

| Months | Cols | Difference |
|---|---|---|
| Aug, Sep, Oct, Dec 2025; Mar 2026 | 33 | baseline |
| Nov 2025; Jan, Apr, May, Jun, Jul 2026 | 32 | missing `Negative feedback from users: Hide all` |
| Feb 2026 | 34 | adds `Negative feedback from users: Hide` |

Only the negative-feedback columns vary. All measurement columns are stable.

**Key columns:** `Post ID`, `Page ID`, `Title`, `Description`, `Publish time`, `Permalink`, `Post type`, `Views`, `Reach`, `Reactions, Comments and Shares`, `Reactions`, `Comments`, `Shares`, `Total clicks`, `Duration (sec)`.

**Empty columns (100% null):** `Languages`, `Custom labels`, `Funded content status`, `Data comment`.

**Post type distribution:** Photos 331, Videos 328, Reels 70, Links 1.

**Important — lifetime figures drift.** These are cumulative totals as of the export date. Re-exporting the same month later yields different numbers (verified: a September re-export differed on every one of 81 posts). Use **only this one export set**, and record the export date. Never mix in files pulled on another date.

### 1.3 Page-level export (Views__1_.csv, Follows__1_.csv, etc.)

| Property | Value |
|---|---|
| Files | 9 |
| Encoding | **UTF-16** (not UTF-8) |
| Header | **Row 3** — see below |
| Grain | One row per day |
| Coverage | 2025-08-01 to 2026-07-31, 365 rows each, no gaps, no nulls |

**File layout — the first two lines are not data:**

```
sep=,
"Views"
"Date","Primary"
"2025-08-01T00:00:00","67753"
```

Line 1 is an Excel separator hint. Line 2 is the metric name. Line 3 is the actual header. Your reader must skip 2 lines for these files.

`Audience.csv`, `Gender.csv`, and `FollowerTopTerritories__1_.csv` are demographic breakdowns with a different shape — treat them as a separate ingest type or defer them; no FR currently depends on them.

---

## 2. The critical constraint: no join key

**There is no way to link an organic post to the advertisement it became.**

Verified exhaustively:
- Ad IDs are 18-digit Meta ad-object IDs (e.g. `120241997677220621`); Post IDs are 16-digit post IDs (e.g. `1362248909258331`). Different namespaces.
- Every one of the 93 ads columns was scanned against all 730 Post IDs: **zero matches**.
- Ad names are internal shorthand ("R5 5600G DISKLESS 16+1+1"). After Unicode normalisation, only 18 of 297 appear verbatim in any caption; fuzzy matching gives a median best score of 0.45 with nothing above 0.8. **Not usable.**

**Consequences for the build:**
- Do not create a foreign key between the posts table and the ads table.
- FR-21 (correlation) runs **entirely within the ads data** — ad engagement rate vs. ad cost per inquiry. It does not touch organic posts.
- FR-19 (ranking comparison) runs **entirely within the organic data**. It does not touch ads.
- The only cross-source link available is **by time period** (month), for FR-17 and FR-18.

---

## 3. Metric definitions — implement exactly these

Ambiguity here will produce numbers that disagree with Chapter 1 and Chapter 4. Use these formulas verbatim.

### 3.1 Organic engagement rate
```
organic_engagement_rate = "Reactions, Comments and Shares" / "Reach"
```
Available for all 730 posts. Median ≈ 0.0069.

### 3.2 Advertising engagement rate
```
ad_engagement_rate = "Post engagements" / "Reach"
```
**Use the aggregate `Post engagements` column — do NOT sum reactions + comments + shares.** Meta suppresses low counts in the component columns: `Post engagements` is populated on 739/746 rows, but `Post reactions` only 670, `Post comments` only 360, `Post shares` only 388. Summing components would silently understate engagement on half the rows.

> Note for the document: organic and advertising engagement rates use different numerators because the two exports expose different fields. This is stated in Chapter 3.

### 3.3 Cost per inquiry
```
Filter: Result type == "Messaging conversations started"
cost_per_inquiry = SUM("Amount spent (PHP)") / SUM("Results")   -- grouped by Ad ID
```
- **Compute only for messaging-optimised ads.** Other result types present: `Reach`, `Post engagements`, `ThruPlay`. For those, `cost_per_inquiry` must be NULL, not zero, and must not display.
- 36 of 746 rows have a null `Result type` — exclude them from this metric.
- Aggregate across months **before** dividing. Do not average the monthly `Cost per result` values.

**Reference figures (must reproduce):**

| Filter | n ads | min | p25 | median | p75 | max |
|---|---|---|---|---|---|---|
| all messaging ads | 187 | 8.05 | 16.79 | 21.39 | 32.76 | 181.76 |
| spend ≥ ₱300 | 148 | 8.05 | 15.63 | 20.16 | 28.23 | 66.61 |
| spend ≥ ₱500 | 131 | 8.05 | 15.40 | 19.04 | 24.73 | 54.27 |
| spend ≥ ₱1000 | 108 | 8.05 | 15.34 | 18.09 | 22.44 | 54.27 |

Total spend must reconcile to **₱901,196.96**; messaging-only spend to **₱740,382.55**.

*The minimum-spend threshold is a research decision, not yours to pick — confirm with the team which figure Chapter 1 uses and make the system's default match it.*

---

## 4. Ingestion pipeline (FR-04 to FR-10)

### 4.1 Detection order
```
1. Read first 4 bytes → if BOM is FF FE or FE FF, decode as utf-16, else utf-8-sig
2. If line 1 == "sep=," → page-level family; header is line 3
3. Else read header row:
   - contains "Ad ID" and "Amount spent (PHP)"        → ADS
   - contains "Post ID" and "Reactions, Comments and Shares" → ORGANIC
   - otherwise                                         → reject
```

**Do not match on the full column tuple.** Organic files have three different signatures across 12 months. Match on a **required subset** and ignore extra or missing optional columns.

### 4.2 Required columns per type

| Type | Required |
|---|---|
| ADS | `Ad ID`, `Ad name`, `Ad set name`, `Campaign name`, `Reporting starts`, `Reporting ends`, `Amount spent (PHP)`, `Reach`, `Impressions`, `Result type`, `Results`, `Post engagements` |
| ORGANIC | `Post ID`, `Title`, `Description`, `Publish time`, `Post type`, `Permalink`, `Views`, `Reach`, `Reactions, Comments and Shares` |
| PAGE | `Date`, `Primary` |

Everything else is optional. **The validator must not fail a file for missing optional columns.**

### 4.3 Cleaning steps (order matters)
1. Strip BOM, decode per 4.1
2. Trim whitespace from headers (Meta occasionally pads them)
3. Parse numerics with thousands separators removed; blank → NULL, never 0
4. Parse `Publish time` and `Reporting starts` as datetimes
5. **NFKC-normalise all text fields** (see §5)
6. Deduplicate: ADS on `(Ad ID, Reporting starts)`; ORGANIC on `Post ID`; PAGE on `(metric, Date)`
7. Compute derived measures per §3

### 4.4 Idempotency
Re-uploading the same month must **update, not duplicate**. Key on the natural keys in step 6. The client will re-upload; assume it.

### 4.5 Ingestion summary (FR-09)
Return and display: rows read, rows stored, rows updated, rows rejected with reasons, duplicates skipped. This is how the team reconciles against source files — it is a graded requirement, not a nicety.

---

## 5. Text handling — the categorisation trap (FR-12)

**Two bugs will silently break the categorisation feature.**

### 5.1 The caption lives in one of two columns
- `Title` is populated on 725/730 rows
- `Description` on only 379/730

They are not interchangeable, and which holds the real caption varies by post type.

```python
caption = Title if len(Title) >= len(Description) else Description
```
Reading only one column loses text on roughly half the posts.

### 5.2 Stylised Unicode
**173 of 730 captions use mathematical-bold characters.** A post reading `𝐑𝐘𝐙𝐄𝐍 𝟓 𝟓𝟔𝟎𝟎𝐆` will **not** match the keyword `ryzen`.

```python
import unicodedata
caption = unicodedata.normalize('NFKC', caption)
```

Run NFKC **before** any keyword rule, any LLM call, and any storage. Store both the raw and the normalised caption.

Also present: emoji throughout, URLs in 221 captions, mixed English/Tagalog in most.

### 5.3 Expect the keyword method to score modestly
A rough keyword probe over all 730 captions left **139 posts matching no category** and **175 matching more than one**. That is ~43% ambiguous. This is expected and is exactly why FR-15 compares two methods — do not "fix" it by over-tuning the keyword rules until they beat the LLM. The comparison must be honest.

### 5.4 FR-15 storage requirement
Store **three separate fields** per post, permanently:
- `category_keyword` — the rule-based suggestion
- `category_llm` — the LLM suggestion
- `category_final` — the marketing manager's assignment

FR-15 reports percentage agreement and Cohen's kappa of each method against `category_final`. **If the comparison is implemented as a throwaway script, FR-15 is not satisfied.** These must be columns in the database.

---

## 6. Analysis features (FR-19 to FR-22)

These run **inside the system**, recomputing on whatever data is in the repository. They are not one-off study scripts.

### 6.1 FR-19 — ranking comparison (organic only)
Rank all posts by `Views`, rank by `organic_engagement_rate`, then report:
- Spearman rank correlation between the two rankings
- Overlap: of the top *k*% by views, how many are also top *k*% by engagement rate (support k = 10 and 20)

**Handle the null:** 1 post has no `Views` value (729/730). Exclude it explicitly; do not let it sort to an end position.

**Known caveat for the document:** `Views` means different things for photos vs. videos vs. reels. The comparison is still valid because the client applies views uniformly across all post types — that uniformity is part of what is being questioned. One sentence in Chapter 3 covers it.

### 6.2 FR-20 — category distribution
Distribution of `Views` and `organic_engagement_rate` across the four categories. **Display the n for each category.** If a category has very few posts (entertainment may be sparse), the UI must show that rather than presenting a comparison as if it were solid.

### 6.3 FR-21 — correlation with method selection
```
Population: ads where Result type == "Messaging conversations started"
            AND cost_per_inquiry is computable  → n = 187
X = ad_engagement_rate
Y = cost_per_inquiry
```

**Implementation order is a graded requirement:**
1. Test normality of both variables (Shapiro-Wilk)
2. **The test outcome selects the method** — Pearson if assumptions hold, Spearman if not
3. Compute and display **only the selected coefficient**
4. Log the assumption-test result and the method chosen, so FR-22 can display it

Do **not** compute both and show the more favourable one. That is a defect a panelist can find by reading the code.

For reference, in the current data cost per inquiry has a skew of ≈3.9, so Spearman will be selected — but the system must *decide* that, not assume it.

### 6.4 FR-22 — interpretation
Every analytical result must display **coefficient + n + significance together**, with the plain-language sentence keyed to the **magnitude**, not the p-value.

With 730 posts a correlation of 0.08 reaches p < 0.05 while explaining under 1% of variance. If the UI prints "significant" alone, the marketing manager will over-read it. Suggested thresholds for the wording: |ρ| < 0.2 "negligible", 0.2–0.4 "weak", 0.4–0.6 "moderate", > 0.6 "strong".

---

## 7. Roles and access (FR-01 to FR-03)

**Three system roles.**

| Role | Who | Notes |
|---|---|---|
| Owner | business owner | makes advertising and budget decisions; full access |
| Marketing manager | Sir Dan | heads the marketing team; **owns final category assignment (FR-13)** |
| Marketing team member | creatives | produce content; report to the marketing manager |

**The admin manager is not a system user.** They handle Facebook messages and sit outside the marketing team. The system ingests CSV exports rather than live messages, so it offers them no task. Any figures they need reach them through reports exported by the other three roles (FR-23). Do not build a fourth role.

FR-02 must therefore be implemented with **three** roles, not four. Update the FR table accordingly when this document is transcribed into Chapter 3.

FR-13 (final category assignment) is restricted to the marketing manager. FR-03 (account management) is restricted to the owner.

---

## 8. Audit trail (FR-24)

Log user, timestamp, and affected records for every upload and every manual category assignment.

This is not boilerplate. Chapter 1 documents that the business currently keeps no written record of attribution or decisions — the audit trail is the system's direct answer to that condition, and it will be pointed to at defence.

---

## 9. Quick checklist

- [ ] Three roles only — owner, marketing manager, marketing team member
- [ ] Encoding detection handles UTF-16 (page-level) and UTF-8-BOM (ads, organic)
- [ ] Page-level reader skips 2 preamble lines
- [ ] Organic type detection uses a required-column **subset**, not the full tuple
- [ ] Ads keyed on `Ad ID`, never `Ad name`
- [ ] Ads grain is (Ad ID, month) — sum across months before dividing
- [ ] Caption = longer of `Title` / `Description`
- [ ] NFKC normalisation before any text processing
- [ ] `ad_engagement_rate` uses `Post engagements`, not summed components
- [ ] `cost_per_inquiry` NULL (not 0) for non-messaging ads
- [ ] Three category columns stored permanently (keyword / llm / final)
- [ ] Normality test selects the correlation method; only the selected one displays
- [ ] Every analytical output shows coefficient + n + significance
- [ ] Re-upload updates rather than duplicates
- [ ] Totals reconcile: ₱901,196.96 all ads / ₱740,382.55 messaging

---

## 10. Open items for the team (not the developer)

1. **Minimum-spend threshold** for the cost-per-inquiry population — Chapter 1 must state it and the system default must match.
2. **Views vs. Viewers** — the owner said "by viewers" first and "views" second. The organic export has `Views` but no `Viewers` column. Worth one message to confirm which he actually watches.
3. **Manual labelling sample** for FR-15 — labelling all 730 posts before defence is unrealistic. Plan for a random sample of 150–200 and state the sample size in Chapter 3.

---

# PART 2 — ALGORITHMS AND UI SPECIFICATION

---

## 11. Algorithms

Nine algorithms carry real logic. Everything else is CRUD. Each one below gives input, method, output, and the edge case that will bite you.

### ALG-01 — Export type detection (FR-05)

**Type:** rule-based signature matching against a required-column subset.

```
detect(file):
    raw ← first 4 bytes
    encoding ← "utf-16" if raw[0:2] in (FFFE, FEFF) else "utf-8-sig"
    text ← decode(file, encoding)

    if text.line[0].strip() == "sep=,":
        header ← text.line[2];  skiprows ← 2;  return (PAGE, header, skiprows)

    header ← text.line[0];  cols ← parse_csv_header(header)

    if REQUIRED_ADS     ⊆ cols:  return (ADS,     header, 0)
    if REQUIRED_ORGANIC ⊆ cols:  return (ORGANIC, header, 0)
    return REJECT
```

**Edge case:** subset containment (`⊆`), never tuple equality. Organic files have 32, 33, or 34 columns across the 12 months. Equality matching rejects 7 of 12 valid files.

---

### ALG-02 — Deduplication and upsert (FR-08, FR-04)

**Type:** natural-key upsert.

| Type | Natural key |
|---|---|
| ADS | `(Ad ID, Reporting starts)` |
| ORGANIC | `Post ID` |
| PAGE | `(metric_name, Date)` |

```
for row in incoming:
    key ← natural_key(row, type)
    if exists(key):  UPDATE (increment updated_count)
    else:            INSERT (increment inserted_count)
```

**Edge case:** organic rows are lifetime cumulative and grow between exports. On UPDATE, **overwrite** the measure values — do not add. Adding would double-count. For ADS the pair is already unique (verified: max 1 row per pair), so an UPDATE there means a genuine re-upload of the same month.

---

### ALG-03 — Text normalisation (FR-08, precondition for ALG-04/05)

**Type:** Unicode NFKC compatibility normalisation.

```
caption_raw ← Title if len(Title) ≥ len(Description) else Description
caption     ← NFKC(caption_raw)
caption     ← strip_urls(caption)        # 221 captions contain URLs
caption     ← collapse_whitespace(caption)
store both caption_raw and caption
```

`unicodedata.normalize('NFKC', s)` in Python. NFKC maps 𝐑𝐘𝐙𝐄𝐍 → RYZEN. **Without this step, 173 of 730 captions are invisible to keyword rules.**

**Edge case:** NFKC does **not** strip emoji. That is fine — leave them; they may be signal for the entertainment category.

---

### ALG-04 — Rule-based keyword categorisation (FR-12, method A)

**Type:** weighted keyword scoring with deterministic tie-break.

```
CATEGORY_LEXICON = {
  product_showcase:  [pricelist, package, build, setup, specs, ryzen, intel, rtx, gtx, ...],
  promotional_offer: [promo, sale, discount, off, limited, deal, installment, libre, ...],
  testimonial:       [salamat, thank you, client, delivered, transaction, feedback, tiwala, ...],
  entertainment:     [hahaha, relate, funny, challenge, tag a, comment down, guess, ...]
}

score(caption, category) = Σ over terms t ∈ lexicon[category] of
                             weight(t) × count(t in caption)

assign = argmax_category score(...)
if max score == 0            → UNCLASSIFIED (do not force a guess)
if tie between categories    → apply priority order, log the tie
```

**Edge case:** on the current data ~19% of posts match no lexicon and ~24% match more than one. **This is expected — do not tune the lexicon until it beats the LLM.** FR-15 requires an honest comparison; over-fitting the rules invalidates it. Return `UNCLASSIFIED` rather than a forced guess so the ambiguity is visible in the kappa.

Match on the NFKC-normalised caption, case-insensitive, on word boundaries.

---

### ALG-05 — LLM-assisted categorisation (FR-12, method B)

**Type:** single-label classification via prompted LLM with structured output.

```
for batch of 10–20 posts:
    prompt ← system: "You classify Facebook posts for a Philippine computer
                      hardware retailer into exactly one of four categories.
                      Captions mix English and Filipino.
                      Definitions: <the four client definitions>
                      Return ONLY a JSON array, no prose, no markdown fences:
                      [{\"post_id\": \"...\", \"category\": \"...\", \"confidence\": 0.0-1.0}]"
             user:   <post_id, post_type, normalised caption> × batch
    response ← call_llm(prompt, temperature = 0)
    parsed   ← parse_json(strip_code_fences(response))
    validate: category ∈ the four labels; post_id ∈ batch
    on failure → retry once → then mark UNCLASSIFIED and log
```

**Requirements:**
- `temperature = 0` — the run must be reproducible for FR-15.
- Store the raw response for every batch; a panelist may ask how the labels were produced.
- Persist `model_name` and `run_date` alongside the results.
- Never let an LLM failure block ingestion; categorisation is asynchronous to upload.

**Edge case:** the model will occasionally return prose around the JSON. Strip fences and locate the first `[`…`]` block before parsing. Do not assume clean JSON.

---

### ALG-06 — Categorisation agreement (FR-15)

**Type:** Cohen's kappa + percentage agreement, per method against the manual label.

```
sample ← posts where category_final IS NOT NULL          # the manually labelled set
for method in (keyword, llm):
    pairs ← [(category_final[p], category_method[p]) for p in sample]
    percent_agreement ← count(a == b) / n
    kappa ← (p_observed − p_expected) / (1 − p_expected)
      where p_expected = Σ_c ( freq_final(c)/n × freq_method(c)/n )
adopt ← method with higher kappa
```

Use `sklearn.metrics.cohen_kappa_score` rather than hand-rolling it.

**Edge cases:**
- `UNCLASSIFIED` is a fifth label in the agreement matrix — do not silently drop those rows, or the keyword method scores artificially well by abstaining.
- Report **n** with every kappa. On a 150-post sample, kappa is noisy.
- If a category has zero instances in the sample, kappa can behave oddly. Display the confusion matrix alongside so the cause is visible.

---

### ALG-07 — Ranking comparison and top-k overlap (FR-19)

**Type:** Spearman rank correlation + overlap coefficient.

```
posts ← organic posts where Views IS NOT NULL      # 729 of 730
rank_v ← rank(posts by Views, descending, ties = average)
rank_e ← rank(posts by organic_engagement_rate, descending, ties = average)
ρ, p   ← spearmanr(Views, organic_engagement_rate)

for k in (10, 20):
    top_v ← top ⌈n × k/100⌉ posts by Views
    top_e ← top ⌈n × k/100⌉ posts by engagement rate
    overlap[k] ← |top_v ∩ top_e| / |top_v|
```

**Edge cases:**
- Exclude the 1 post with null `Views` explicitly. A null sorted as 0 or as +∞ corrupts both the correlation and the overlap.
- Use average ranking for ties — `Views` has repeated values in the low range.
- Views has a skew of ≈12; never use Pearson here.

---

### ALG-08 — Assumption test and correlation method selection (FR-21)

**Type:** conditional branch on a normality test. **The order is a graded requirement.**

```
X ← ad_engagement_rate      # Post engagements / Reach
Y ← cost_per_inquiry        # messaging-optimised ads only, n = 187

W_x, p_x ← shapiro_wilk(X)
W_y, p_y ← shapiro_wilk(Y)

if p_x > 0.05 AND p_y > 0.05:
    method ← "Pearson";   coef, p ← pearsonr(X, Y)
else:
    method ← "Spearman";  coef, p ← spearmanr(X, Y)

persist: method, W_x, p_x, W_y, p_y, coef, p, n
display: ONLY the selected coefficient
```

**Do not compute both and show the more favourable one.** That is checkable by reading the code, and it will be read.

**Edge cases:**
- Shapiro-Wilk is unreliable above n ≈ 5000. At n = 187 it is fine.
- Exclude ads with null or zero `Results` — cost per inquiry is undefined, not infinite.
- On the current data Y has skew ≈ 3.9, so Spearman will be selected. **The system must decide this at runtime, not have it hard-coded.**

---

### ALG-09 — Aggregation (FR-11, FR-17)

**Type:** sum-then-divide. This is the single most common source of wrong numbers.

```
-- CORRECT
cost_per_inquiry(group) = SUM(Amount spent) / SUM(Results)

-- WRONG
cost_per_inquiry(group) = AVG(Cost per result)
```

Averaging per-row `Cost per result` weights a ₱50 ad equally with a ₱50,000 ad. Because 211 of 309 ads span multiple months, this error appears at **every** aggregation level: ad, ad set, campaign, category, month.

Same rule for engagement rate: `SUM(engagements) / SUM(reach)`, never the mean of per-row rates.

**Edge case:** when `SUM(Results) = 0`, return NULL and render as "—", never 0 or ∞.

---

## 12. Dashboard specification (FR-16, FR-18)

One screen, period selector at top (default: last complete month; presets for 3 / 6 / 12 months and custom range). Everything below respects that selector.

### 12.1 KPI cards — top row

| # | Card | Shows | Source |
|---|---|---|---|
| 1 | Total advertising spend | ₱ for the period, with % change vs. previous period of equal length | ADS |
| 2 | Inquiries generated | count of `Results` for messaging ads, with % change | ADS |
| 3 | Median cost per inquiry | ₱, with change vs. previous period, and IQR shown as a subtitle | ADS |
| 4 | Median organic engagement rate | %, with change vs. previous period | ORGANIC |
| 5 | Posts published | count, split by categorised / uncategorised | ORGANIC |

**Card 3 must show the median, not the mean.** The distribution is right-skewed (max ≈ 8× the median); a mean misrepresents typical performance. Show the IQR beneath it.

**Change indicators** must include the direction's meaning: for cost per inquiry, **down is good** — colour it accordingly, or the owner will read a red down-arrow as bad news.

### 12.2 Charts — middle section

| # | Chart | Type | Shows |
|---|---|---|---|
| 6 | Spend vs. inquiries by month | dual-axis bar + line | 12 months; directly answers Condition 4 (budget decided from memory) |
| 7 | Cost per inquiry distribution | histogram or box plot | the spread across ads; the point of Condition 2 |
| 8 | Performance by content category | grouped bar | median CPI and median engagement rate per category, **with n labelled on each bar** |
| 9 | Page reach / views trend | line | daily page-level series for the period |

Chart 8 is the payoff of the whole categorisation feature. If a category has few posts, the n label is what stops it being over-read.

### 12.3 Tables — bottom section

| # | Table | Columns | Notes |
|---|---|---|---|
| 10 | Top 10 most efficient ads | ad name, category, spend, inquiries, CPI | sorted ascending by CPI |
| 11 | Bottom 10 least efficient ads | same | sorted descending; **this is where budget is being lost** |
| 12 | Recent uploads | file, type, rows stored/rejected, user, timestamp | last 5; from the audit trail |

### 12.4 Alerts strip

Show only when true:
- "X posts are uncategorised" → links to the Categorisation Review screen
- "No data uploaded for <month>" → gap in coverage
- "X ads have spend but no recorded results" → data quality flag

**Do not put analysis results (FR-19 to FR-22) on the dashboard.** They belong on the Analysis screen. The dashboard answers "how are we doing"; Analysis answers "is our method sound". Mixing them buries both.

---

## 13. Sidebar navigation and role access

### 13.1 Screens

| # | Screen | Purpose | FRs |
|---|---|---|---|
| S1 | Dashboard | period overview per §12 | FR-16, FR-18 |
| S2 | Upload Data | file upload, type detection, ingestion summary | FR-04 to FR-09 |
| S3 | Content Library | all organic posts; caption, type, date, views, engagement rate, category | FR-10, FR-13 |
| S4 | Categorisation Review | queue of uncategorised/low-confidence posts; accept or override suggestions in bulk | FR-12, FR-13, FR-14 |
| S5 | Advertising Performance | ads by campaign / ad set / ad; spend, results, CPI | FR-11, FR-17 |
| S6 | Content Performance | organic posts by category and month; engagement rate | FR-11, FR-17 |
| S7 | Analysis | FR-19 ranking comparison, FR-20 category distribution, FR-21 correlation, each with FR-22 interpretation | FR-19 to FR-22 |
| S8 | Method Evaluation | keyword vs. LLM agreement, kappa, confusion matrix | FR-15 |
| S9 | Reports | build and export PDF / CSV | FR-23 |
| S10 | User Management | create, edit, deactivate accounts; reset credentials | FR-03 |
| S11 | Audit Log | all uploads and category assignments | FR-24 |

### 13.2 Access matrix

| Screen | Owner | Marketing Manager | Marketing Team |
|---|---|---|---|
| S1 Dashboard | Full | Full | View |
| S2 Upload Data | Full | Full | — |
| S3 Content Library | View | Full | View |
| S4 Categorisation Review | View | **Full (only role that can finalise)** | Suggest only |
| S5 Advertising Performance | Full | View | — |
| S6 Content Performance | View | Full | View |
| S7 Analysis | Full | Full | View |
| S8 Method Evaluation | View | Full | — |
| S9 Reports | Full | Full | View |
| S10 User Management | **Full (only role)** | — | — |
| S11 Audit Log | Full | View | — |

**Legend:** Full = view + act; View = read-only; — = hidden from the sidebar entirely, not merely disabled.

### 13.3 Rules

1. **Hide, don't disable.** A role that cannot use a screen should not see it in the sidebar. Greyed-out items invite "why can't I click this" during the TAM evaluation and depress the ease-of-use scores.
2. **S4 finalisation is exclusive to the Marketing Manager.** FR-13 states the final category assignment is retained by the marketing manager. Marketing team members may propose a change; it stays pending until the manager accepts it.
3. **S10 is exclusive to the Owner.** FR-03.
4. **Route-level enforcement, not just UI.** Hiding a sidebar link is not access control. Check the role server-side on every request.
5. **Landing screen after login:** Owner → S1; Marketing Manager → S4 if the uncategorised queue is non-empty, else S1; everyone else → S1.

### 13.4 Note for the team on TAM

Three roles means the TAM respondent pool is the owner, the marketing manager, and the marketing team members — likely a small number of people. Confirm how many marketing team members exist before the evaluation is planned, and if the total is under roughly five, state the respondent count explicitly in Chapter 3 rather than reporting means as though drawn from a larger sample. A small n honestly reported is defensible; a mean of three responses presented without its n is not.

The ISO/IEC 25010 evaluation is separate and is normally administered to IT professionals in addition to the intended users, so that pool does not have the same constraint.

---

## 14. Build order

1. Auth + roles (S10, FR-01 to FR-03) — everything else needs a user context
2. Ingestion (S2, ALG-01 to ALG-03) — nothing works without data in the repository
3. Repository + derived measures (ALG-09, FR-10, FR-11) — **verify totals reconcile to ₱901,196.96 before continuing**
4. Content Library + manual categorisation (S3, S4 manual path, FR-13)
5. Dashboard (S1, §12)
6. Performance screens (S5, S6, FR-17)
7. Categorisation algorithms (ALG-04, ALG-05, FR-12, FR-14)
8. Method evaluation (S8, ALG-06, FR-15)
9. Analysis screen (S7, ALG-07, ALG-08, FR-19 to FR-22)
10. Reports + audit log (S9, S11, FR-23, FR-24)

Steps 1 to 6 make a working system. Steps 7 to 9 are what make it a decision support system rather than a dashboard — do not let them slip to the last week, because they are the objectives the panel will ask about.

---

# PART 3 — SCOPE DECISIONS AND ADDITIONAL FEATURES

*Added after a full re-analysis of the client files on 12 August 2026. Read §15 before touching the analytics layer — it removes work.*

---

## 15. What we are dropping, and why

Three planned analytics features are **cut**. None of them appears in the current Objectives of the Study, so nothing has to be defended, retracted, or written up as a limitation. If code for them already exists, leave it out of the build rather than reworking it.

### 15.1 What-if / Monte Carlo simulation — DROP

**Reason.** A simulation is only as good as the model it samples from. Ours would rest on a regression explaining roughly 40–47% of variance in a small, observational sample of 187 ads. Feeding that into a Monte Carlo produces confident-looking projections built on a weak relationship — which is precisely the "many features, little depth" criticism the panel already made.

There is also a logical problem. The advertising data is observational, not experimental. The coefficients describe *associations among ads that ran*, not *what would happen if a setting were changed*. A "what if we raise CTR by 10%" slider implies a causal lever the data cannot support, and a panelist who asks "how do you know changing X causes Y?" has no good answer.

### 15.2 Holt-Winters / seasonal forecasting — DROP

**Reason.** Seasonal decomposition needs at least **two complete seasonal cycles**. At monthly granularity we have **12 observations** — exactly one cycle. Holt-Winters cannot be fitted, and any panelist who has taken a forecasting subject will ask how many periods the model trained on.

Daily forecasting *is* technically possible (365 days of ad and page-level data), but the client authorises budget **monthly**. A forecast of tomorrow's spend answers no question he actually asks.

What replaces it: **FR-18 month-over-month comparison**, which is descriptive, needs no model assumptions, and answers the real problem (Condition 4 — budget decided from memory rather than record).

### 15.3 Multiple linear regression — DROP (with a note)

**Reason.** This one is genuinely feasible — I tested it. Regressing log(cost per inquiry) on ad characteristics gives **R² = 0.465, n = 187**, with CTR, frequency, reach and spend all significant. It is a real model.

It is cut anyway because:
- It is not in the objectives, so it is unclaimed scope.
- Reach and spend are almost perfectly collinear (**VIF ≈ 500**) — bigger budgets buy more reach. A defensible model needs a documented variable-selection step, and even a reduced specification still carries VIF of 12–19, above the usual threshold of 10.
- FR-21 (correlation with method selection) already answers the same underlying question with far less methodological exposure.

**Note for the team, not the developer:** if an adviser later asks for a predictive component, regression is the one to bring back — not simulation or forecasting. The finding is real; it just needs a VIF screening step written into Chapter 3 first.

### 15.4 Summary

| Feature | Status | One-line reason |
|---|---|---|
| What-if / Monte Carlo | **Cut** | weak underlying model + observational data can't support causal sliders |
| Holt-Winters forecasting | **Cut** | 12 monthly observations; seasonal fit needs 24+ |
| Multiple linear regression | **Cut (viable, unclaimed)** | works (R²=0.465) but severe collinearity; FR-21 covers the question |
| Lagged correlation, Fisher z | **Cut** | no organic↔ads join key; nothing to lag |
| Campaign health score | **Cut** | composite weights would be arbitrary; FR-25/26 give the same answer from raw figures |

**Net effect on the schedule: this removes work.** The six features in §16 are cheaper than the three above and produce results the client can act on.

---

## 16. Additional features to build (FR-25 to FR-30)

Every figure below was computed from the actual client files. They are here because they are (a) derivable from data in hand, (b) actionable by a named user, and (c) currently absent from FR-01 to FR-24.

---

### FR-25 — Budget reallocation analysis — **build this first**

**Primary user:** Owner
**Answers:** "Where is my money being wasted?"

This is the feature that addresses the panel's comment that the system delivers no profitable insight.

**Method.** Rank messaging-optimised ads by cost per inquiry, split into quartiles, and compare.

> **⚠ CORRECTION (12 Aug, after a regression-to-the-mean check) — apply a minimum-spend filter.**
> Quartiles are defined by the outcome itself, so the worst quartile mixes genuinely poor ads with ads that were simply *unlucky on small volume*. The size distribution shows this plainly:
>
> | Quartile | n | Median spend | Median inquiries |
> |---|---|---|---|
> | Q1 | 47 | ₱5,587 | 449 |
> | Q2 | 47 | ₱2,244 | 112 |
> | Q3 | 46 | ₱1,139 | 39 |
> | Q4 | 47 | **₱333** | **8** |
>
> An ad with 8 inquiries has an extremely noisy CPI. **Build the filtered version.**

**Filtered output — use these figures (ads with spend ≥ ₱1,000, n = 108):**

| Quartile | Ads | Spend | Inquiries | CPI |
|---|---|---|---|---|
| Q1 (best) | 27 | ₱375,809.90 | 31,875 | ₱11.79 |
| Q2 | 27 | ₱170,739.45 | 10,360 | ₱16.48 |
| Q3 | 27 | ₱104,309.29 | 5,116 | ₱20.39 |
| Q4 (worst) | 27 | ₱59,745.30 | 1,988 | ₱30.05 |

**Headline:** Q4 spent ₱59,745 for 1,988 inquiries. At Q1's rate of ₱11.79, the same money would have produced **≈5,067 inquiries — about 3,079 more, for zero additional spend.**

*(Unfiltered, the figure is ≈2,100 extra inquiries. The filtered version is both larger and more defensible, because each ad has enough volume for its rate to mean something.)*

The spend threshold must be **configurable** and must default to whatever value Chapter 1 states. Display the threshold and the resulting n on screen.

**Reference — unfiltered quartiles (n = 187), for reconciliation only, not for display:**

| Quartile | Ads | Spend | Inquiries | CPI | % of total spend |
|---|---|---|---|---|---|
| Q1 (best) | 47 | ₱482,306.70 | 38,633 | ₱12.50 | 65.1% |
| Q2 | 47 | ₱142,089.70 | 7,662 | ₱18.50 | 19.2% |
| Q3 | 46 | ₱77,459.10 | 3,211 | ₱24.10 | 10.5% |
| Q4 (worst) | 47 | ₱38,527.00 | 983 | ₱39.20 | 5.2% |

**Screen requirements:**
- The quartile table above, for the selected period
- The counterfactual figure, stated prominently
- A slider: "reallocate X% of the worst quartile's spend at the best quartile's rate" → recomputes the inquiry gain
- The list of Q4 ads by name, so the owner can see exactly which ones

**Mandatory wording on the screen:**
> "Retrospective comparison of recorded results. Past efficiency does not guarantee the same rate at higher spend."

Without that caption this becomes a prediction, and it is not one. Do not label it "forecast", "projection", or "simulation" anywhere in the UI.

---

### FR-26 — Ad set and campaign efficiency ranking

**Primary user:** Owner
**Answers:** "Which of my campaigns actually work?"

**Method.** Group messaging ads by `Ad set name` and by `Campaign name`; report spend, inquiries, CPI, and ad count. Sort by CPI ascending. Same for campaigns.

Verified sample (best and worst ad sets):

| Ad set | Spend | Inquiries | Ads | CPI |
|---|---|---|---|---|
| REELS AND VIDEO | ₱9,388.50 | 816 | 12 | ₱11.50 |
| BERMONTHS REELS AND VIDEO | ₱75,590.40 | 6,312 | 13 | ₱12.00 |
| ALL REELS SHOP | ₱164,738.40 | 12,824 | 30 | ₱12.80 |
| … | | | | |
| 2026 MAY TO JULY ADSET PC | ₱7,917.80 | 352 | 2 | ₱22.50 |
| PC SET AND COMSHOP 25 26 | ₱29,553.10 | 1,154 | 3 | ₱25.60 |

A **2.2× spread** between best and worst. The owner named these ad sets himself, so the comparison is immediately legible to him — no interpretation layer needed.

**Screen requirements:** sortable table, both levels (ad set / campaign), with n ads shown. Flag ad sets with fewer than 3 ads as low-confidence.

**Defensibility caveat:** ad sets ran in different periods with different targeting, so this compares *what happened*, not a controlled test. "BERMONTHS REELS AND VIDEO" performing well may reflect the season as much as the content. State this on screen.

---

### FR-27 — Ad lifecycle and frequency diagnostics

**Primary user:** Owner
**Answers:** "Am I retiring ads too early? Am I over-showing them?"

**Method.** For each ad, compute weeks (or months) since first delivery; aggregate CPI by week-of-life. Separately, compute `Frequency = Impressions / Reach` and correlate against CPI.

> **⚠ CORRECTION (12 Aug, after a survivorship check) — build the cohort-restricted curve, not the raw one.**
> The raw curve mixes ads killed early with ads that ran long, so "CPI improves with age" could simply be bad ads disappearing from the denominator. Only **44 of 186** ads survive to week 11.
>
> **I tested it.** Restricting to the 44 ads that actually survived ≥11 weeks and tracing *their own* curve:
>
> | Week of life | CPI (cohort of 44) |
> |---|---|
> | 0 | ₱14.63 |
> | 3 | ₱14.41 |
> | 5 | ₱14.31 |
> | 6 | ₱12.58 |
> | 9 | ₱12.13 |
> | 11 | ₱12.57 |
>
> **The same ads improve over their own lifetime, so the finding is real — not an artefact.** But the honest gap is smaller than the raw curve implies: short-lived ads (<4 weeks, n=54) averaged ₱14.10 vs. long-lived ads (≥11 weeks, n=44) at ₱13.38.

**Build:** the cohort-restricted curve, with the cohort size displayed and a selectable minimum-survival threshold. Show the short-lived vs. long-lived comparison alongside it.

**Frequency finding (unaffected by the above):** Frequency correlates *negatively* with CPI (Spearman ρ = −0.241, p < 0.001, n = 482), and frequency is low overall (median 1.55, p90 2.14, max 3.22).

**Raw curve — for reference only, do not display as the headline:**

| Week of ad life | Spend | Inquiries | Ads live | CPI |
|---|---|---|---|---|
| 0 | ₱99,443 | 6,646 | 186 | ₱14.96 |
| 3 | ₱59,239 | 3,919 | 112 | ₱15.12 |
| 6 | ₱53,759 | 4,127 | 101 | ₱13.03 |
| 9 | ₱48,415 | 3,716 | 89 | ₱13.03 |
| 11 | ₱26,467 | 2,106 | 40 | ₱12.57 |

**Interpretation for the UI:** no ad fatigue is detectable at this account's frequency levels. Retiring ads early is more likely costing inquiries than saving them.

**Note:** week-of-life requires the *daily* ads export (the older 19-column files). The new 93-column monthly export supports month-of-life only. Either is acceptable — use whichever set is loaded, and label the granularity on screen.

---

### FR-28 — Video watch-through rate

**Primary user:** Marketing team member
**Answers:** "Are people actually watching what I make?"

**Method.**
```
watch_through_rate = "Average Seconds viewed" / "Duration (sec)"
```
Computable for **397 of 730 posts** (videos and reels). Median ≈ 0.10.

**Why this matters more than it looks:** watch-through correlates with engagement rate at **Spearman ρ = 0.363 (p < 0.001, n = 397)** — substantially stronger than views does. It is a *better* content-quality signal than the measure the client currently uses.

This strengthens Objective 4.1: instead of only criticising view count, the system offers a better alternative from the same export.

**Sanity checks passed:** of 397 posts, only **1** exceeds 100% watch-through (a replay/loop), durations are sensible (median 61s, max 192s, none under 5s), so there are no divide-by-tiny artefacts.

**Screen requirements:** watch-through per video post, median by content category and by post type, and a scatter of watch-through vs. engagement rate. Guard the division: exclude `Duration (sec)` ≤ 0, and **cap the displayed value at 100%**, footnoting that a higher raw value indicates replays.

---

### FR-29 — Post type performance comparison

**Primary user:** Marketing team member
**Answers:** "Should I make a reel or a photo?"

Verified output (n = 730):

| Post type | n | Median reach | Median engagement rate | Median views |
|---|---|---|---|---|
| Photos | 331 | 1,301 | 0.0059 | 2,368 |
| Videos | 328 | 1,884 | 0.0070 | 2,276 |
| Reels | 70 | 1,086 | 0.0108 | 1,372 |
| Links | 1 | 430 | 0.0116 | 769 |

**The trade-off is real:** reels achieve nearly **2× the engagement rate of photos** (0.0108 vs 0.0059) but the **lowest median reach**. Videos get the widest reach. That is an actionable choice, not a ranking.

**Screen requirements:** the table above with **n shown per row** (reels are only 70 posts — the UI must not present that as equally solid). Exclude or footnote the single Links post.

**Defensibility caveat to surface in the UI:** Meta distributes reels differently from photos, so this comparison reflects both content quality *and* algorithmic distribution. Present it as a trade-off, never as a ranking of "which content is better".

---

### FR-30 — Page growth funnel

**Primary users:** Owner, Marketing manager
**Answers:** "Is the page itself growing, not just the ads?"

**Method.** Uses the page-level daily series (currently feeding only one chart).

Verified: **389,577 visits, 11,386 new follows — 2.92 follows per 100 page visits** over 12 months. Monthly follows range 652 → 1,641.

> **⚠ WORDING CORRECTION.** Do **not** call this a conversion rate or a funnel. Visits and follows are two independent daily series — a user can follow without visiting the page, and vice versa. Label it **"follows per 100 page visits"** and describe it as a ratio of two series. Calling it a funnel invites an attribution question the data cannot answer.

**Screen requirements:** visits, follows, follow rate, and interactions as a monthly series with period-over-period change. Put it on the Dashboard (§12.2, chart 9 area) rather than on its own screen.

---

## 17. Checked and rejected — do not build these

Recording these so nobody re-investigates them later.

| Idea | Why not |
|---|---|
| **Best day of week to post** | Engagement rate is flat across all 7 days (0.0066–0.0072). There is no signal. *(Worth one line in Chapter 4 — it tells the client to stop optimising this.)* |
| **Best hour to post** | 367 of 730 posts publish between 00:00–06:00 — almost certainly scheduling, not audience behaviour. Any pattern shown would be an artefact we can't defend. |
| **Meta Quality / Engagement rate ranking** | Blank on 697 of 746 rows (Meta only populates above an impression threshold). Unusable. |
| **Negative feedback (hides) analysis** | 10 non-zero rows in total across 12 months. |
| **Content category → ad efficiency** | Requires the organic↔ads join key, which does not exist (§2). Permanently blocked. |
| **ROAS / revenue metrics** | No purchase or revenue data exists. Messenger inquiries are the terminal recorded event. |
| **Organic vs. boosted split on posts** | Not available as a Meta export option; confirmed with the client. |

---

## 18. Revised build order

Replaces §14.

1. Auth + roles (3 roles) — FR-01 to FR-03
2. Ingestion — FR-04 to FR-09, ALG-01 to ALG-03
3. Repository + derived measures — FR-10, FR-11, ALG-09 → **verify ₱901,196.96 total / ₱740,382.55 messaging before continuing**
4. Content Library + manual categorisation — FR-13
5. Dashboard — §12, plus **FR-30**
6. **FR-25 budget reallocation** ← highest client value; do not defer
7. **FR-26 ad set / campaign ranking**
8. Performance screens — FR-17, plus **FR-29**
9. Categorisation algorithms — FR-12, FR-14, ALG-04, ALG-05
10. Method evaluation — FR-15, ALG-06
11. Analysis screen — FR-19 to FR-22, ALG-07, ALG-08, plus **FR-28**
12. **FR-27 lifecycle diagnostics**
13. Reports + audit log — FR-23, FR-24

Steps 6 and 7 moved up deliberately. They are the two features that answer "where is the money going" in a form the owner can act on immediately, and they are cheap — both are group-by aggregations over data already in the repository.

---

## 19. Where the new features live in the UI

| Feature | Screen | Role visibility |
|---|---|---|
| FR-25 Budget reallocation | **S5 Advertising Performance** (new tab) | Owner: Full · Manager: View · Team: hidden |
| FR-26 Ad set / campaign ranking | S5 Advertising Performance | Owner: Full · Manager: View · Team: hidden |
| FR-27 Lifecycle diagnostics | S7 Analysis | Owner: Full · Manager: Full · Team: View |
| FR-28 Watch-through rate | S6 Content Performance | Owner: View · Manager: Full · Team: **View — this is their screen** |
| FR-29 Post type comparison | S6 Content Performance | Owner: View · Manager: Full · Team: View |
| FR-30 Page funnel | S1 Dashboard | Owner: Full · Manager: Full · Team: View |

FR-28 and FR-29 substantially thicken the marketing team member's role, which was previously view-only with little to look at. Both give creatives something specific to change in the next post.

---

## 20. Updated open items for the team

1. **Minimum-spend threshold** for the CPI population — Chapter 1 must state it; system default must match.
2. **Views vs. Viewers** — owner said "by viewers" first, "views" second. Organic export has `Views`, no `Viewers`. One message to confirm.
3. **Manual labelling sample** for FR-15 — plan for 150–200 posts, state the n in Chapter 3.
4. **FR-02 says four roles** in the current requirements table — change to **three** when transcribing into Chapter 3.
5. **FR-25 to FR-30 are not yet in the Objectives.** They are system features supporting Objective 3 (reporting) and Objective 4 (examining current practice). Either fold them under those objectives, or flag to the adviser that the FR list is broader than the objectives — which is normal, but should be a decision, not an accident.

---

## 21. Defensibility summary for FR-25 to FR-30

All six were re-tested on 12 August. **All six are computable from data in hand.** Defensibility varies, and two required specification changes (already applied above).

| FR | Computable | Defensible as originally written | Change applied |
|---|---|---|---|
| FR-25 Budget reallocation | Yes | **No** — regression to the mean | Minimum-spend filter (≥₱1,000, n=108); mandatory retrospective caption |
| FR-26 Ad set ranking | Yes | Yes | Added confounding caveat (period/targeting differ) |
| FR-27 Lifecycle | Yes | **No** — survivorship bias | Cohort-restricted curve (44 ads surviving ≥11wk); finding **held** under the test |
| FR-28 Watch-through | Yes | Yes | Cap display at 100%; 1 replay outlier noted |
| FR-29 Post type | Yes | Yes | Added algorithmic-distribution caveat |
| FR-30 Page funnel | Yes | **Wording only** | Renamed "follows per 100 page visits"; not a funnel |

### The general rule

Every one of these is **descriptive or comparative**, which is defensible almost by construction — they report what the client's own recorded data shows.

They become indefensible the moment the UI implies **causation** or **prediction**. FR-25 sits closest to that line, which is why both the spend filter and the retrospective caption are mandatory rather than optional.

If anyone asks whether these belong in a capstone: they compute recorded outcomes from client data and present them for the decision-maker's judgment. That is exactly what the study's own framing (Gorry & Scott Morton, 1971) says a decision support system does — supply the analysis, leave the choice with the decision-maker.

### Language to avoid in every one of these screens

| Don't write | Write instead |
|---|---|
| "will generate", "predicted", "forecast" | "would have generated, based on recorded results" |
| "simulation", "projection" | "retrospective comparison" |
| "X causes lower CPI" | "X is associated with lower CPI" |
| "best content type" | "highest engagement rate / widest reach" (state the trade-off) |
| "conversion rate" (FR-30) | "follows per 100 page visits" |
