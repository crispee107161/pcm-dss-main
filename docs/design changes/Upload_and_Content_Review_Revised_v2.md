# Upload Data and Content, revised

**Date:** 3 September 2026
**Re:** supersedes `Upload_and_Content_Review.md`. Work from this one.
**Why revised:** section 1 of that memo is already closed by the page-level scoping fix. Two new rules apply from the dashboard review.

---

## 0. ⚠ Two standing rules, applying to every screen from here on

These are not specific to this memo. They govern all interface copy across every account, and every review memo from this point will restate them.

### 0.1 No em dashes in sentences or captions

Use commas, full stops, or parentheses instead. This does not apply to the dash used as a null-value placeholder in table cells, which is a typographic convention rather than prose.

They currently appear throughout the system: in the Content subtitle, the upload drop-zone note, the queue row separators, every dashboard caption, and the chart subtitles. Please remove them in a single pass rather than screen by screen, and avoid introducing them in any new copy.

**Resolved 2026-09-04** (see `docs/raven/Em_Dash_Scope_and_Backfill_Answers.md`): scope confirmed to sentences/captions only; null-cell dashes and en-dash numeric ranges (e.g. "Aug 2025 – Jul 2026") are exempt, no code change needed.

- [x] Sweep all user-facing strings and replace

### 0.2 Plain language over statistical notation

Nothing an account holder reads should contain shorthand they have to decode. No `n=`, no `IQR`, no `Q1` or `Q3`, no `p` values or Greek letters on any screen the client uses.

"516 posts" rather than "n=516". "Half of the 44 advertisements cost between ₱19.07 and ₱37.63" rather than "IQR ₱19.07 to ₱37.63 (n=44)".

FR-18 requires a plain-language statement of what each analytical result indicates, and notation fails that requirement even when the number behind it is correct.

- [ ] Apply to every screen as it is reviewed

---

## 1. Closed since the previous memo

**Page-level study-period scoping.** `STUDY_PERIOD_PAGE_METRIC_WHERE` landed and is applied to the Follows chart, both Page Metrics screens, and the chat summary. `PageMetricDaily` had never been scoped anywhere, so FR-04a covered two of three datasets until today. Now three.

The Coverage Status table on this screen is what made it visible, by putting the three ranges side by side. Worth noting, since the same gap looked like a single chart rendering fault when seen from the dashboard.

No action. Recorded so it is not re-raised.

---

## 2. ⚠ Someone is categorising through the interface

Unchanged from the previous memo and still the most time-sensitive item here.

The Executive Dashboard showed **518**, the Content screen showed **516** minutes later, and the agreed figure after the legacy nulling was **519**. The Owner account is view-only on Content, so this is the Marketing Manager account.

**Why three posts matter.** The 519 are to be coded by the researchers against the client-validated codebook, by two coders working from caption text alone, and imported through `scripts/import-codebook-assignment.ts` stamping `MANUAL_CODEBOOK_ASSIGNMENT`.

A post categorised through the interface gets `MANUAL_SELECTION` instead, and was not coded against the codebook by two coders. The corpus then carries two label provenances from two different procedures, and Chapter 3 has to describe both.

Three posts is recoverable. Three hundred means redoing the work or rewriting the methodology.

- [ ] **Who is signed in as the Marketing Manager and working the queue?**
- [ ] **Please ask them to stop** until the coding session, or tell us if this is deliberate
- [ ] Send the current count by `category_final_source`, so we know how many carry `MANUAL_SELECTION` from this period

### 2.1 A smaller version of the same question

- [ ] Confirm the dashboard chip and the Content header derive from the same query rather than two definitions of "awaiting categorisation"

Probably two moments in time given the above, but worth ruling out.

---

## 3. FR-05 on Upload History

Recent Uploads on the dashboard now shows all five columns. **Upload History on this screen has not been confirmed.**

- [ ] Confirm Upload History carries Read, Added, Changed, Duplicate, and Rejected

Same caveat as the dashboard: rows uploaded before `records_read` existed will show zero against a non-zero Duplicate count, which reads as a contradiction. Backfill or leave the cell blank, as decided for the dashboard.

---

## 4. Copy fixes specific to these screens

### 4.1 The de-duplication note is imprecise

> "Records are matched by date, so re-uploading the same file is safe and never creates duplicates."

Matching is not by date. Organic posts match on Post ID, advertising on advertisement identifier and reporting period, and page-level on date. The reassurance is correct, the mechanism as stated is not, and someone reading it might reasonably ask what happens to two posts published on the same day.

- [ ] Reword, for example: "Records are matched by their platform identifier, so re-uploading the same file is safe and never creates duplicates."

### 4.2 Unflagged queue rows show a dash where the reason would be

Rows two and three display a single suggestion and a bare dash where flagged rows carry a review reason. That means both methods agreed and nothing triggered review, which is useful information rendered as no information.

- [ ] Replace with "Both methods agree" or similar

This also signals the post is eligible for batch confirmation, which the dash does not.

---

## 5. Confirmed working

Recording these so they are not re-raised.

The queue row displays **both** candidate chips, Product Showcase and Testimonial, under a two-category flag. The Content screen is correctly view-only for the Owner, with the subtitle saying so. Coverage Status names the Marketing Manager as a second uploader, which is the coordination information a second person needs before starting.

---

## 6. Priority

1. **§2**, who is working the queue. One message, and it protects the coding procedure.
2. **§0.1**, the em dash sweep. One pass across all screens rather than piecemeal.
3. **§3**, the Upload History columns.
4. **§4.1** and **§4.2**, both one-line changes.
5. **§0.2** applies as each screen is reviewed, so it lands progressively rather than in one pass.

§2 first. Everything else can wait a day, that cannot.
