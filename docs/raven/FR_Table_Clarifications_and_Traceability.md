# Traceability matrix and open clarifications: everything needed to close the FR table

**Date:** 24 August 2026
**Re:** replaces `Traceability_Matrix_Request.md`. Work from this one.
**Why:** the three sidebar screenshots changed several of my assumptions. This version reflects what is actually built.
**Goal:** close the functional requirements table this week.

---

## 0. Where we are

We have been iterating on the FR table for three days and the remaining gaps are all questions only you can answer. This memo collects every one of them in a single place so we can settle the table in one exchange rather than five.

Three things I need back:

1. **The traceability matrix** in the format in §5
2. **Answers to the six clarifications** in §2
3. **The parameter values** in §6

Once those land, the FR table is finished and I can write the Chapter 3 sections that depend on it.

---

## 1. What the sidebars show

For reference, so we are working from the same picture. Compiled from screenshots of all three accounts.

| Screen | Owner | Marketing Manager | Marketing Team |
|---|---|---|---|
| Dashboard | Yes | Yes | Yes |
| Content | Yes | Yes | Yes |
| Upload Data | Yes | Yes | No |
| Keyword Lexicon | ? | Yes | No |
| Analysis | Yes | Yes | Yes |
| Method Evaluation | No | Yes | No |
| Budget Reallocation | Yes | No | No |
| Rankings | Yes | No | No |
| Top Ads | Yes | Yes | No |
| Trend Analysis | Yes | Yes | No |
| Page Metrics | Yes | Yes | No |
| Category Performance | **Yes** | **No** | **No** |
| Post Type Performance | Yes | Yes | Yes |
| Generate Report | Yes | Yes | Yes |
| Audit Log | Yes | Yes | No |

Correct anything I have misread. The Owner rows for Upload Data, Keyword Lexicon, Generate Report, and Audit Log are inferred rather than seen, since I only have the Analytics section of that sidebar.

---

## 2. Six clarifications

### 2.1 ⚠ Category Performance is on the wrong account

This is the most important item in this memo.

Category Performance appears **only on the owner's sidebar.** The marketing manager cannot open it. Neither can the marketing team.

That contradicts the study. Chapter 1's fifth condition is that outcome information never returns to the team producing the content, and the Significance section states plainly that classification will let the team see how product showcase, promotional offer, testimonial, and entertainment perform relative to one another. That paragraph is describing this screen, and it names the marketing manager and content team as the beneficiaries.

The categorisation module is the single largest piece of work in the system. 730 posts labelled, a codebook, an inter-coder reliability study, two methods compared. The entire point is that performance can be compared by category, and right now the payoff screen is invisible to the people the requirement was written for.

There is no confidentiality argument here. Aggregate content performance is not sensitive, and withholding it from content producers is the exact condition the system was built to fix.

- [ ] **Category Performance added to the marketing manager sidebar**
- [ ] **Category Performance added to the marketing team sidebar**
- [ ] Owner keeps it

### 2.2 FR-09 has no screen on any account

FR-09 is the promotion criterion analysis: rank posts by view count and by engagement rate, report the rank correlation, report the overlap between the top-ranked sets, report the distribution across categories.

This is **objective 4**, and it has the strongest result in the study behind it. From the raw data: Spearman rho = -0.327 at p = 1.1e-19 on n = 729, top-decile overlap of 5 posts out of 73 (6.8 per cent), and views correlating with reach at rho = 0.954. The measure the business uses to select content for promotion ranks posts in roughly the opposite direction from engagement.

Nothing on any of the three sidebars is named for this.

- [ ] Which screen implements FR-09?
- [ ] If it is a section inside Analysis, it needs surfacing as its own entry. A finding this central should not be buried on a generically named screen, and the panel will ask to see objective 4 demonstrated.

### 2.3 What does Budget Reallocation do, and which requirement authorises it?

It appears in no functional requirement I have. The name suggests it recommends moving spend between advertisements or campaigns.

If it does make recommendations, that is a substantive analytical output with no requirement behind it, and a panelist asking "where in your requirements is this?" would have no answer. Two ways out and either is fine:

- Write a requirement for it, in which case I need to know exactly what it computes and on what basis
- Remove it

If it is actually a presentation of FR-15's quartile comparison under a different name, say so and it maps cleanly.

- [ ] What it computes, what inputs, what it outputs
- [ ] Whether it recommends actions or only reports figures

### 2.4 Do Rankings and Top Ads overlap?

Both are owner-visible, both sound like FR-15, which requires ranking advertisements, ad sets, and campaigns by cost per inquiry and grouping advertisements into quartiles.

- [ ] What each does, and whether one is redundant
- [ ] If they are genuinely different, which requirement covers each

### 2.5 What is on Analysis, and why does every role see it?

Analysis appears on all three sidebars, including the marketing team's.

If it contains the regression (FR-11), the correlation analysis (FR-10), and the residual diagnostic (FR-12), the marketing team should not have access. Neither the requirements nor Chapter 1 give them a reason to see advertising efficiency modelling.

If it shows something different depending on role, then it is three screens with one name, and each needs its own row in the matrix.

- [ ] What Analysis contains
- [ ] Whether its contents vary by role, and how

### 2.6 Is Content view-only for the marketing team?

Propose and `category_pending` were removed, so the team should have no write path to `category_final` on any tab.

- [ ] Confirm this is enforced server-side, not only by hiding the Change action

---

## 3. Correction to the previous memo

In `Unassigned_Labels_and_Coding_Procedure.md` §2.3, I removed "no caption text" from the reason-capture options for the no-category tab. **Put it back.**

That change assumed reviewers would open the original post before marking something uncategorisable. We have since confirmed the 200-post ground-truth sample was coded **from captions only**, with the original posts never opened, so the remaining backlog will be coded the same way for procedural consistency. Under caption-only coding, absent caption text is valid grounds.

Everything else in that memo stands, including the tab rename to "No category".

This also answers the question in §3 of that memo, so no lookup needed there.

---

## 4. Roles: a starting position

Give me what is actually built. This is an anchor for discussion, not a decision.

| Requirement | Owner | Marketing Manager | Marketing Team |
|---|---|---|---|
| FR-08 method evaluation | No | Yes | No |
| FR-09 promotion criterion | Yes | Yes | No |
| FR-10 correlation | Yes | No | No |
| FR-11 regression | Yes | No | No |
| FR-12 residual diagnostic | Yes | No | No |
| FR-13 dashboard | Yes | Yes | Limited |
| FR-15 efficiency ranking | Yes | No | No |
| FR-17 content comparison | Yes | **Yes** | **Yes** |

The reasoning: FR-08 informs how far the manager should trust a suggestion before batch confirming, which is her decision alone. FR-09 concerns the promotion rule, which she applies and the owner authorises. FR-10 through FR-12 and FR-15 concern advertising efficiency, and Chapter 1 records that advertising decisions are made by the owner. FR-17 is content performance, which is exactly what condition five says never reaches the content team.

Push back where the build has a reason for something different. The split you have already built is largely sensible and I am not proposing to overturn it.

---

## 5. The matrix

Two tables, both directions. The reverse direction matters as much as the forward one, so please do not skip it.

**Forward, one row per requirement:**

```markdown
| FR | Screen | Route | Roles | Implemented | Notes |
|----|--------|-------|-------|-------------|-------|
| FR-08 | Method Evaluation | /dashboard/... | Manager | Yes | |
| FR-09 | ? | | | Partial | which clauses are missing |
```

Implemented is Yes, Partial, or No. **Partial is the useful answer** and I would rather have it than an optimistic Yes. Split across rows if a requirement spans two screens.

**Reverse, one row per screen:**

```markdown
| Screen | Route | Roles | Implements | Notes |
|--------|-------|-------|------------|-------|
| Budget Reallocation | | Owner | FR-?? or NONE | |
```

Every sidebar entry on every account, including Dashboard, Generate Report, and Audit Log. A screen mapping to NONE is either a missing requirement or a screen to remove, and either answer is fine as long as we know which. The panel has already flagged feature sprawl once.

**Priority if you cannot do all of it at once:** FR-08 to FR-12 first, then FR-13 to FR-17, then the rest.

---

## 6. Parameter values

These are decisions embedded in the code that must appear in Chapter 3 as stated values.

**Shared across FR-10, FR-11, FR-12**
- [ ] The minimum expenditure threshold. I believe PHP 1,000, giving n = 108. **Confirm it is one shared constant and not three separate literals**, because if they have drifted the three analyses are running on different populations.

**FR-09**
- [ ] Which overlap cuts are computed
- [ ] Whether the views-versus-reach correlation is computed at all

**FR-10**
- [ ] Which normality test
- [ ] The exact rule selecting Pearson over Spearman, and whether it is fixed in code or decided at runtime
- [ ] Which population: all ads, messaging-objective ads, or those above threshold

**FR-11**
- [ ] **The full list of predictor variables.** Single most important item in this section. A regression whose independent variables are described only as "advertisement characteristics" is not reproducible, and it is the first thing a statistically literate panelist will ask.
- [ ] Which heteroscedasticity test
- [ ] Which residual normality test
- [ ] The cross-validation baseline model and number of folds

**FR-12**
- [ ] The standardised residual cutoff, as a number
- [ ] Whether it flags in both directions or only upward. The revised requirement needs both, since advertisements performing better than predicted are what the business should learn from.

**FR-07**
- [ ] The caption-length threshold. For reference the corpus has 5 null captions, 13 under 10 characters, 25 under 20.

---

## 7. One thing you will hit while mapping

Page-level views and summed post views are on different time bases and must not appear side by side. Post views are lifetime cumulative attributed to the publish month, page views are daily and non-cumulative. February 2026 shows post views of 5.87 million against page views of 2.93 million, which is impossible unless the bases differ.

If any screen currently places them together, flag it in the Notes column.

---

## 8. Still open from earlier memos

Not part of the matrix, but unanswered and blocking:

- [ ] **Origin of the 574 LEGACY_IMPORT rows.** Which migration or code path wrote them, and whether the value written was a method suggestion. Highest priority item outstanding.
- [ ] **Why All shows 716 rather than 530.** Only 14 posts are being excluded, not the 200-post benchmark.
- [ ] **Keyword re-run on the 50-term seed lexicon.** Full output, scored against `category_ground_truth`.
- [ ] **The five null-caption posts.** What each method returned and what input each received.
- [ ] **Model selection.** Was `gpt-oss-20b` the only model tried?
- [ ] **The 14 August prompt commit diff.**
- [ ] **Lexicon read-only**, plus committed snapshots for the appendix.

---

## 9. If you send one thing today

**§2.1 and §2.2.** Category Performance access, and where FR-09 lives.

The first is a contradiction between the system and a condition in Chapter 1. The second is objective 4, which is the finding with the best evidence in the whole study and currently has no screen to demonstrate it on.
