# Upload Data, second pass

**Date:** 5 September 2026
**Re:** Owner account, Upload Data
**Status:** one anomaly to explain, one addition, one confirmation

---

## 0. ⚠ Standing rules

### 0.1 No em dashes in sentences or captions

Table cell placeholders are outside this rule.

### 0.2 Plain language over statistical notation

### 0.3 Never reference the study or the research in interface copy

---

## 1. Two things from the first pass are fixed

**The de-duplication note now reads accurately.** "Records are matched on the identifier each file type carries" replaces the old claim that matching was by date, which was wrong for two of the three file types.

**Upload History carries all five FR-05 figures.** Read, Added, Changed, Duplicate, Rejected.

---

## 2. ⚠ One row contradicts every other row

`Viewers (1).csv`, uploaded 23 August at 03:54 PM, shows **0 Added, 365 Changed, 0 Duplicate**.

Every other page metric row across both upload batches shows **0 Added, 0 Changed, 365 Duplicate**.

Changed means the stored values differed from the incoming ones. So on that upload, all 365 daily viewer records were different from what was already held.

**The sequence is what makes it odd.** The 03:54 batch was a re-upload of files already ingested. Viewers reported every row changed. The 08:37 batch re-uploaded the same file again and reported every row unchanged. So the values shifted once and then settled.

That is not what a fixed historical export should do.

- [ ] **What changed on those 365 rows?**
- [ ] **Is Viewers a fixed daily count, or is it cumulative or recalculated by the platform?**

The second question is the one that matters for the manuscript. Chapter 3's data requirements describe the six page-level series as daily records covering the study period without gaps, which implies fixed values. If Viewers behaves differently from the other five, that description needs qualifying, and it would also bear on the guidance we give the client about re-exporting.

If it turns out to be a one-off from an earlier ingestion change rather than a property of the data, that closes it and nothing in the manuscript moves.

---

## 3. Tell the user when an upload contains out-of-period records

Raven raised whether the owner needs to know about the study period boundary at all, and the answer turns on what he would otherwise do.

**If he uploads a January 2025 export, the row count rises and none of his figures move.** The sensible conclusion from that is that the upload failed. He would re-upload it, or report the system as broken.

So this is upload guidance rather than an explanation of a discrepancy, and it should behave like guidance.

### 3.1 At upload time, in the result summary

- [ ] **When an upload contains records outside the reporting range, say how many were excluded**

For example: "412 records stored. 47 fall before August 2025 and are not included in the figures."

FR-04a already requires the system to report the number of out-of-period records on ingestion, so this may exist in the upload result already and simply not be surfaced. Worth confirming.

### 3.2 A short line by the drop zone

- [ ] **Add beneath the existing upload guidance:**

> Only records from August 2025 onward are included in the figures. Earlier records are kept but not counted.

Two sentences, stated as dates he can check against his own file rather than as a concept, and placed where someone is about to upload rather than under a status table.

### 3.3 What not to do

**Do not add an explanatory caption under Coverage Status.** That table shows sixteen months of organic and page-level data against twelve of advertising, and it is tempting to explain the difference there.

But the owner is not comparing those numbers. He is uploading files and expecting them to count. Framing it as reconciling a discrepancy invites him to think about something he has no reason to think about, and it edges toward describing the research rather than the system.

Leave Coverage Status showing what is actually loaded. It is accurate as it stands.

---

## 4. The Read column has no working example on this screen

Every Read cell currently shows a dash, including rows from the 23 August re-upload, because `records_read` was added after those uploads ran.

That is the correct fallback and we asked for it. But it means nothing on this screen demonstrates the column working.

- [ ] **Confirm a fresh upload populates Read with a real figure**

If it does, this resolves on its own the next time anything is uploaded and needs no change. Worth confirming rather than assuming, since the column is one of the five FR-05 requires and it is currently unevidenced on the screen that owns it.

---

## 5. Correct as built, recorded so it is not re-raised

**Coverage Status showing Advertising at twelve months and the other two at sixteen** is accurate. The client only ever provided twelve months of advertising exports. That asymmetry being visible is how the page-level scoping gap was found in the first place, and the table should keep showing what is loaded rather than what is analysed.

**The Marketing Manager coordination note** at the top of Coverage Status is the right information in the right place for a second uploader.

---

## 6. Priority

1. **§2**, the Viewers anomaly. It is the only item that could affect a manuscript statement.
2. **§3.1**, out-of-period feedback in the upload result.
3. **§3.2**, the line by the drop zone.
4. **§4**, the Read confirmation.

Only §3 is new work, and it is small if FR-04a's count is already computed at ingestion.
