# One question left on Upload Data

**Date:** 5 September 2026
**Re:** `Upload_Data_Second_Pass_Response_2026-09-05.md`
**Status:** three items closed, one question, then the tab is done

---

## 1. §2 answered the incident. One property is still open.

**What you established.** The 365 changed rows on `Viewers (1).csv` were an ingestion defect rather than a data change. The parser read the wrong column and stored zeros, a later fix corrected it, and the second upload legitimately reported every row as changed because every row genuinely was.

Reading it from the ingestion code and the git history rather than from the upload log alone is what makes that conclusion trustworthy, and finding that the same commit fixed a second wrong-column bug on Follows explains why that file behaved the same way.

The data is correct now and there is nothing to repair. Good.

### 1.1 The question that is still open

I asked whether **Viewers is a fixed daily count or something cumulative or recalculated**, because Table 5 in Chapter 3 describes all six page-level series as daily records covering the study period without gaps, which implies fixed values.

Your answer establishes that the same file re-imported twice produces no change. That proves the file is stable. It does not establish whether **a fresh export from Meta** for the same date range would return the same numbers.

**That is the version that matters for the manuscript.** Chapter 3 states that the client retains the original exports independently of the system, so the study's source data is recoverable without reference to our copy. If Meta revises viewer counts retroactively the way it accumulates post lifetime figures, a re-export would return different values and that claim needs qualifying.

- [ ] **Are the six daily page-level series fixed once the day has passed, or can Meta revise them retroactively?**

You may not know, and that is a legitimate answer. If nobody has compared a re-export against an original, Chapter 3 will say that the client's exports as provided are the record and that re-exports were not compared, which is honest and closes it.

What we cannot do is describe them as fixed daily records if that has not been established.

---

## 2. §3.1: confirm the conditional display

Your observation is a good one and it points at a better design than the one requested.

The out-of-period count would read zero on every advertising and organic upload, since the client's own exports carry nothing outside the window, and would only ever fire on page-level files. A permanent line reading "0 records fall outside the reporting range" on every upload is noise that teaches the user to stop reading the summary.

- [ ] **Confirm the count displays only when it is non-zero**

That way the message appears when it is telling the user something and stays silent otherwise, which is what makes it worth reading at all.

---

## 3. Three items closed

**Read populates on fresh uploads**, confirmed at code level rather than by waiting for one. Two of the three ingestion paths set it explicitly and the third derives it from the parsed row count.

**The drop-zone line is added** and reads as intended.

**§3.3 accepted**, with Coverage Status left showing what is loaded rather than what is analysed.

---

## 4. After this

Once §1.1 and §2 come back, Upload Data is closed for this pass.

We will return to it only if something upstream changes what it displays, or if the reproducibility question in §1.1 turns out to need a comparison rather than a statement.
