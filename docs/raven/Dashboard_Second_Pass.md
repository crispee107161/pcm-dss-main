# Executive Dashboard, second pass after the import

**Date:** 5 September 2026
**Re:** Owner account, Executive Dashboard
**Status:** figures verified, one tooltip that must change, five smaller items

---

## 0. ⚠ Standing rules

### 0.1 No em dashes in sentences or captions

Table cell placeholders are outside this rule.

### 0.2 Plain language over statistical notation

### 0.3 Never reference the study or the research in interface copy

The client has a system, not a research project. **See §2, where this is currently broken.**

---

## 1. Everything reconciles

Verified against the client's raw exports and against our own coding sheet.

| Displayed | Check |
|---|---|
| Total ad spend ₱901,197 | ₱901,196.96 |
| Inquiries generated 50,489 | 50,489 |
| Median cost per inquiry ₱21.50 | 21.50 |
| Quartiles ₱16.91 and ₱34.14, 187 advertisements | Identical |
| Distribution ₱8 to ₱182, median ₱22 | 8.05 to 181.76 |
| Posts published 731, 719 categorised, 12 pending | Correct |
| Category counts 349, 42, 212, 88 | Reconcile once the three re-coded posts are accounted for |

**The category finding also holds on an independent check.** Computed on our 507 coded posts alone, without touching the system, Entertainment sits at 0.82 per cent median engagement against Product Showcase at 0.71 and Testimonial at 0.51. Same ordering the screen reports across all 719.

That chart was running on 14, 5 and 2 posts a week ago. It is now a real finding.

---

## 2. ⚠ The zero-conversation tooltip has two problems

Hovering the chip currently shows:

> "Expected for ads run for reach or video views rather than messaging, not necessarily an error (FR-06). LOOKING COMSHOP PACKAGE G MID G: ₱15,805, PC SET APRIL 2026: ₱12,292, PC SET MARCH 2026: ₱8,527, COMPSHOP MARCH 2026: ₱7,924, COMPSHOP APRIL 2026: ₱6,257"

### 2.1 It cites a requirement identifier

"(FR-06)" in text the business owner reads. Same defect as the Analysis methodology block, and it breaks §0.3.

- [ ] **Remove the identifier**

### 2.2 The five names are not advertisements

LOOKING COMSHOP PACKAGE G MID G, PC SET APRIL 2026, PC SET MARCH 2026, COMPSHOP MARCH 2026 and COMPSHOP APRIL 2026 read as campaign or ad set names rather than advertisement names.

The chip says "5 ads". So either the chip is counting the wrong thing or the tooltip is listing the wrong entities, and ₱50,805 of spend is attributed to five things whose type is unclear.

- [ ] **Which are they?** Advertisements, ad sets, or campaigns?
- [ ] Correct whichever of the two is wrong

### 2.3 Suggested wording once §2.2 is settled

> Five advertisements spent ₱50,805 without recording any messaging conversations. This is expected when an advertisement is run for reach or video views rather than for messages.

Then the list of names and amounts beneath, unchanged. The figures are useful, it is the framing that needs work.

---

## 3. ⚠ "All time" shows no resolved dates

Every other option in the period selector displays its resolved range. "All time" does not.

That is backwards from what it should be. "Last complete month" is self-explanatory even without dates. **"All time" is the one option a reader cannot resolve for themselves**, and this data ends in July 2026 rather than today, so a reader assuming otherwise misreads every figure above.

- [ ] **Show the resolved range under "All time"**, the same treatment the other options get

Two of the KPI cards currently just say "All time" with nothing beneath, which is where the gap is most visible.

We understood this was agreed when the Top Ads screen got it, so flagging in case that fix did not carry across to the dashboard's own selector.

---

## 4. The Median Cost / Inquiry card

### 4.1 It says the same thing twice

> "Half of the 187 advertisements cost between ₱16.91 and ₱34.14. No minimum spend filter."
> "Half of ads this period cost less than this per inquiry, half cost more."

The second sentence adds nothing the first has not said.

- [ ] **Drop the second sentence**

### 4.2 It does not apply the result-type filter

The ₱21.50 counts an advertisement's non-messaging months in the numerator. With the filter applied it is ₱21.39.

Trivial at the median, though as established on Top Ads, individual advertisements differ by up to 99 per cent.

- [ ] **Apply the filter here**, matching `data_catalog.md` §4.3 and `ad-set-ranking.ts`

**The more important version of that question is still open** from `Top_Ads_Accepted_and_Filter_Question.md` §2.1: whether FR-11's regression and FR-12's residual diagnostic apply it. Six affected advertisements sit inside the n = 108 population, and if they do not filter, every coefficient in Chapter 4 shifts. That is a code read rather than a change and it remains the highest-value unanswered question on either list.

---

## 5. The compare trend axis has irregular gridlines

60, 75, 90, 120. The first two gaps are 15, the last is 30.

- [ ] **Regular intervals**

Everything else about that panel is now right, and see §6.

---

## 6. What landed well

**The compare trend caption is the best plain-language finding in the system.**

> "Total Spend and Messaging Conversations indexed to May 2026 = 100%. Spend has stayed level while conversations have fallen about 23%, so each conversation is costing more than it did in May 2026. Reach is excluded from this comparison because it grew about 169% over the same period, which would compress the other two lines."

It states the mechanism, then the finding, then explains an omission before anyone can wonder about it. That is the pattern every other caption should follow, and it is worth pointing at when the remaining plain-language work is scoped.

**The category chart no longer shows Unclear as a category.** Four bars, four real categories, 28 unclear posts excluded rather than presented as comparable.

**Sub-₱1,000 rows are dimmed with a stated reason.** "Their cost per inquiry rests on very few conversations and moves sharply with one more or one fewer" is precise and plain at the same time.

**Read shows a dash rather than a false zero** on the pre-column upload rows.

**Both efficiency tables now say "All time"** rather than a single month, which makes them comparable with the KPI cards above.

---

## 7. Priority

1. **§2**, the tooltip. The identifier must go, and the entity question needs an answer.
2. **§3**, resolved dates under "All time".
3. **§4.1**, drop the duplicate sentence.
4. **§4.2**, the filter here, and the still-open question about the regression.
5. **§5**, the gridlines.

Nothing here is large. §2.2 is a question rather than work.
