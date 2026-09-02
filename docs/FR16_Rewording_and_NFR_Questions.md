# FR-16 rewording, loose ends, and six questions for the non-functional table

**Date:** 2 September 2026
**Re:** `Cut_Pages_Deleted_and_Lifecycle_Cohort_Answered_2026-09-02.md`, plus the start of Table 4
**Status:** requirements table closed, one clause rewritten, six new questions

---

## 0. The cohort answer is better than the requirement described

`buildCurve()` excluding an advertisement from the **whole** curve rather than only from the later points is the correct construction, and it is the part I most wanted to be true. An advertisement dying at month one contributes to no point on the two-month cohort, including month zero. That means every point on a curve is computed from the same advertisements, which is what makes a decline in cost per inquiry a real change rather than a change in who is being measured.

The figures I computed from the raw exports, showing cost per inquiry falling from 22.57 to 16.94 across months one to four, describe the pooled version and therefore do not describe what the system reports. Chapter 4 will present the cohort curves as the finding and the pooled figures as the contrast, which turns the survivorship problem into a documented control rather than a caveat.

The threshold provenance is clean too. One commit, 21 August, never modified, imported rather than duplicated, and predating the regression results being examined. Chapter 3 will state that the threshold was fixed before results were examined.

---

## 1. FR-16 is being rewritten, because two cohorts is better than the requirement claims

The current wording says "advertisements meeting **a** minimum survival threshold," singular. The system computes and displays **two** cohorts, at two and three periods.

That is better than one, since showing both is itself the survivorship control, and the requirement should say so:

> **FR-16 Advertisement lifecycle reporting.** The system shall report cost per inquiry by period of advertisement life for two cohorts, comprising advertisements surviving at least two reporting periods and advertisements surviving at least three, computing every point on a cohort's curve from that cohort's fixed membership, and shall report the correlation between frequency and cost per inquiry, stating the unit of observation on which that correlation is computed.

The clause about fixed membership is deliberate. It states the survivorship control at requirement level rather than leaving it as an implementation detail a panelist has to take on trust.

- [ ] **Confirm this describes what `buildCurve()` does**, particularly "every point on a cohort's curve from that cohort's fixed membership"

Definition of Terms gains a matching entry naming both thresholds and the fixed-membership property. The single-month versus long-run comparison stays as a secondary figure and is not named in the requirement, per your note that it is not the cohort mechanism.

---

## 2. Loose items, none of them requirement-affecting

Rounding these up so they do not quietly disappear. All small, none blocking.

- [ ] **The always-visible caption** restored under Generate, replacing the hover tooltip
- [ ] **The two combined-Generate decoupling fixes:** keyword leg running during the LLM cooldown, and both legs attempted independently rather than aborting on the first failure
- [ ] **The three exercise runs** of the combined action: clean, during a cooldown, and with the LLM deliberately broken
- [ ] **`PROGRESS.md` corrections**, including the 730 and 916 row, the FR-07 split, and the two reason-capture rows closing as not building

A one-line status on each is enough.

---

## 3. Six questions for the non-functional requirements table

I am drafting Table 4 now, organised under the eight ISO/IEC 25010 characteristics, since objective 6.1 commits us to evaluating against those by name.

Each requirement needs a criterion that can be verified rather than asserted. Six of them rest on values or facts I do not have.

### 3.1 ⚠ Have the statistical procedures been validated against a reference implementation?

This is the one that matters and I would like it answered even if the others wait.

Spearman, Pearson, ordinary least squares, Shapiro-Wilk, Breusch-Pagan, and Jarque-Bera all appear to be implemented in TypeScript rather than called from an established statistics library.

- [ ] **Have their outputs been checked against scipy or R on the same data?**

If yes, tell me what was compared and I will cite it. If not, this is a real risk to Chapter 4 rather than a documentation gap. A subtle error in a hand-written Jarque-Bera or in the HC3 standard error computation would not announce itself. It would sit underneath a published finding and produce a plausible number that is quietly wrong, and the first person to check would be a panelist with a statistics background.

It is a short script: export the n = 108 regression inputs and the n = 729 ranking data to CSV, run the same six procedures in scipy, and compare to whatever tolerance is sensible. Half a day at most, and it converts a claim into evidence.

The proposed requirement reads:

> Statistical procedures shall produce results equivalent to an established reference implementation, verified for the Spearman and Pearson correlations, the ordinary least squares regression, and the normality, heteroscedasticity, and residual diagnostics.

I would rather not write that clause without evidence behind it.

### 3.2 Measured render and ingestion times

My draft says analytical screens render within three seconds and a monthly export ingests within thirty. Both are estimates.

- [ ] **Rough measured figures** for the heaviest analytical screen and for a single monthly ingest, on the full study-period dataset

Any reasonable measurement will do. I would rather state a number you have seen than one I invented.

### 3.3 Does the database tier auto-suspend?

If Neon's tier suspends after inactivity, the first request following a quiet period may take several seconds while the connection wakes.

- [ ] **Does it, and if so what is the cold-start delay?**

Two consequences. The render-time requirement needs to say whether it applies to a warm system. And practically, someone should hit the site a few minutes before the defence rather than opening it cold in front of the panel.

### 3.4 Password hashing

- [ ] **Which algorithm and library?**

The requirement states that credentials are stored only in hashed form and are not recoverable from the database. Naming the algorithm makes it verifiable.

### 3.5 Which browsers have actually been opened?

My draft claims current versions of Chrome, Edge, Firefox, and Safari, on desktop and mobile.

- [ ] **Which of those has the system genuinely been run in?**

If the honest answer is Chrome only, then either the requirement narrows to what has been tested, or someone opens the others before we claim them. Safari on iOS is the one worth checking, since it is the most likely to differ and the most likely to be in someone's hand during a demonstration.

### 3.6 What does the test suite cover?

You noted earlier that Server Actions are outside its scope.

- [ ] **Confirm the boundary:** computational logic in `lib/` covered, Server Actions and UI components not

My draft says "the system's computational logic shall be covered by an automated test suite," which is deliberately narrower than the whole system and matches what I understand to be true. I want to state the boundary accurately rather than overclaim.

---

## 4. Priority

1. **§3.1**, the statistical validation. The only item here that could affect a Chapter 4 result rather than a manuscript sentence.
2. **§1**, the FR-16 confirmation. One read.
3. **§3.2 to §3.6**, the remaining parameter values.
4. **§2**, the loose items.

Nothing on this list is large, and §3.1 is the only one I would call urgent.
