# Backlog coding complete: 507 labels ready for import

**Date:** 4 September 2026
**Re:** `Backlog_Coding_Export_Request.md`
**Attached:** `backlog_final_labels.csv`
**Status:** ready to import, plus one request that materially strengthens FR-08

---

## 1. What is attached

`backlog_final_labels.csv`, 507 rows, three columns: `post_id`, `category`, `note`.

Checked before sending:

| Check | Result |
|---|---|
| Rows | 507 |
| Unique post identifiers | 507, no duplicates |
| Identifiers match your export | Exactly, set for set |
| Unlabelled rows | 0 |
| Invalid label values | 0 |
| Identifiers mangled by Excel | 0 |

**Import with source `MANUAL_CODEBOOK_ASSIGNMENT`**, not `MANUAL_GROUND_TRUTH`. That distinction is what keeps the two coded sets separable in Chapter 4's provenance breakdown.

The `note` column carries two kinds of entry: the rule applied when resolving a disagreement, on the 67 posts where the coders initially differed, and the reason a post could not be categorised, on the 18 marked `unclear`. Ignore the column entirely if the parser prefers, per your confirmation that unknown columns are safe.

### 1.1 The label distribution

| Category | Count |
|---|---|
| product_showcase | 239 |
| testimonial | 156 |
| entertainment | 65 |
| promotional_offer | 29 |
| unclear | 18 |

The 18 `unclear` posts are genuine no-category decisions rather than skipped rows, and each carries a reason:

| Reason | Count |
|---|---|
| store announcement | 6 |
| placeholder title | 4 |
| bare emoji | 3 |
| empty caption | 3 |
| text ambiguous | 2 |

They should populate the No Category tab, which has been empty across the whole corpus until now. The four placeholder-title posts all have a caption reading exactly "PC Merchandise's Video", which is worth knowing if any of them looks odd on screen.

---

## 2. How these were produced

Same procedure as the 200-post reference sample, which matters because the two sets combine.

Both coders labelled all 507 independently, from normalised caption text only, without seeing any suggestion the system produced, without opening the posts, and without discussing any of them. Agreement was computed before either coder spoke. Disagreements were then resolved together against the codebook's tie-break rules.

**Inter-coder agreement, second session:**

| | Backlog, 507 posts | Reference sample, 200 posts |
|---|---|---|
| Percentage agreement | 86.79% | 78.5% |
| Cohen's kappa | **0.7966** | 0.6505 |
| Disagreements | 67 | 43 |

Same two coders, same codebook, six weeks apart. We will report both figures separately rather than merging them, and describe the improvement as a practice effect rather than presenting the sessions as interchangeable.

---

## 3. ⚠ The request: expand FR-08's validation from 200 posts to 707

This is the item worth reading.

FR-08 currently evaluates both categorisation methods against the 200-post reference sample. The 507 new labels were produced by **the same two coders, using the same codebook, from the same caption-only input, blind to every suggestion**, which is methodologically the same procedure.

The suggestions for all 507 already existed before any of this coding began, so there is no contamination in either direction.

**That means both methods can now be scored against 707 posts rather than 200.**

Not a sample. Effectively the whole in-period corpus, less the 12 held back for the demonstration.

- [ ] **Can FR-08 evaluate against `MANUAL_GROUND_TRUTH` and `MANUAL_CODEBOOK_ASSIGNMENT` combined?**

If that is a straightforward change, please make it and send the recomputed figures for both methods: n, percentage agreement, Cohen's kappa, the confusion matrix, and per-category recall.

**Keep the 200-only figures too.** Chapter 4 will report both: the pre-specified reference sample, and the full corpus. The first is the figure we committed to before seeing any result, the second is stronger. Reporting only the second would look like we changed the target after seeing the outcome, which is exactly what this project has spent two weeks avoiding.

If it is a larger change than it sounds, tell me and we will report the 200 alone.

---

## 4. What to check after the import

- [ ] All 507 carry `MANUAL_CODEBOOK_ASSIGNMENT`
- [ ] No `MANUAL_GROUND_TRUTH` row was touched
- [ ] The 12 held-back posts are still uncategorised and still in the queue
- [ ] The resulting count by `category_final_source` across the in-period corpus

That last figure goes into Chapter 4 as the provenance breakdown, so we need it stated rather than reconstructed later.

---

## 5. What changes on screen once this lands

Flagging so neither of us is surprised, and so the screens get re-checked rather than assumed.

**Performance by Content Category** on the dashboard currently runs on 14, 5, and 2 posts. **Distribution by Category** on Analysis shows an Unclassified row of 516, the largest row in a table about categories. **Category Performance** runs on the same thin base.

All three become genuinely different charts, not the same charts with better numbers.

**The No Category tab gains 18 posts**, having been empty across the entire corpus.

We will re-walk the analytics screens after the import rather than treating the earlier reviews as final for anything category-related. Screenshots for the appendix come after that.

---

## 6. Two things from the reconciliation, no action for you

**A codebook gap surfaced.** Six of the 67 disagreements were store announcements: maintenance closures, a website launch, a verification badge notice, a New Year closure. The codebook did not address them and both coders reached for different categories. Resolved as `unclear`, and the codebook is now at version 1.2 recording that rule along with an explicit note that raffles and prize draws count as promotional offers. Neither change was applied retrospectively to the 200-post sample.

**One label had a leading space** in the reconciliation file, cleaned before generating the attached file. Mentioning it only so that if the import rejects anything, you know it was checked.

---

## 7. Priority

1. **The import**, whenever convenient
2. **§3**, whether FR-08 can score against both sources combined. The one item here with real consequences for Chapter 4.
3. **§4**, the post-import checks

Nothing here is urgent in the way the queue provenance was. The coding is done and the file is stable.
