# FR-07 review row: compliance check, one defect, and revised requirement wording

**Date:** 24 August 2026
**Re:** the Needs Review row on the merged Content screen
**Status:** one defect to investigate today, three UI fixes, and a revised FR-07 for the manuscript

---

## 0. Compliance against FR-07 as currently written

The row is close. Most clauses pass.

| FR-07 clause | Status |
|---|---|
| Suggests one of product showcase, promotional offer, testimonial, entertainment | Met, all four render |
| Prioritises flagged posts for individual review | Partly, reasons are collapsed behind "+1 more" |
| Remainder confirmable in batches | Met |
| Manager can accept, change, or set the category of any post | Met |
| Can consult the original post where the caption is not sufficient | Met, the View post link |
| Can record a post as unassigned | Met, though see §3.3 |
| Retains the manual assignment as the final value | Met as far as the screen shows |

Two clauses in the **revised** wording (§4 below) are not met: displaying every candidate category, and generating suggestions once at ingestion with a recorded method version.

---

## 1. ⚠ A post with no caption is producing a suggestion, and I can now say how unusual that is

The second row on the screen shows "No title" and no caption text. It nonetheless displays **Testimonial** as a suggestion and reports that it **sits between two categories**.

I checked this against the raw organic exports. Across the full twelve months:

- **730 posts, 730 unique Post IDs**
- The caption field is **Title**, not Description. Description is null on **351 of 730** rows. Title is null on **5**.

So this row is one of five posts in the entire corpus with no caption text at all. And under FR-07, categorisation is performed *from the post's accompanying text*. A post with no text cannot produce a category suggestion from text, and it certainly cannot produce two suggestions that disagree.

Only two explanations, and they need different fixes:

**A. Something other than the caption is feeding the classifier on that row.** A fallback to Description, to the permalink, to the post type, or to a default. If a fallback exists and was never specified, it is operating on an unknown number of posts and Chapter 3's method description is wrong.

**B. A value is being carried over or defaulted.** The suggestion belongs to a different post, or the classifier returns a default label on empty input rather than abstaining.

Either way the flag is also wrong. This post should be caught by the caption-length condition or routed to unresolvable, not presented as a two-method disagreement.

**What I need:**

- [ ] Identify all posts where the Title field is null or empty. There should be 5.
- [ ] For each, report what the keyword method returned, what the LLM returned, what flag fired, and what text (if any) each method was given as input
- [ ] Confirm which field the classifier reads. If it is not Title, that needs changing, because Description is empty on nearly half the corpus.
- [ ] Confirm the keyword method returns `UNCLASSIFIED` rather than a category on empty input, and that the LLM path abstains rather than guessing

Five rows, so this is a ten-minute check. It is first on the list because if there is an unspecified fallback, it affects the method description in Chapter 3 and possibly the κ figures.

### 1.1 Related: the caption-length flag population

From the same reconciliation, the posts your length flag should be catching:

| Caption length | Count |
|---|---|
| Null or empty | 5 |
| Under 10 characters | 13 |
| Under 20 characters | 25 |

Whatever threshold is set, tell me the number so it goes in Chapter 3 as a stated parameter rather than an unstated one.

---

## 2. Both visible rows suggest Testimonial, and one of them plainly is not

The first row reads "Beat the heat with RX 9060XT 16GB NITRO+ Thanks Bossing" and is suggested as **Testimonial**. That is a graphics card post. The suggestion is almost certainly the phrase "Thanks Bossing" hitting a testimonial term in the lexicon.

Not a bug, and not something to fix by editing the lexicon. It is the κ = 0.139 failure mode appearing in the interface instead of in a confusion matrix, and the keyword method misclassifying testimonials and product showcases into each other is exactly what the confusion matrix already showed.

It is, however, an argument for §3.1 and §3.2 below. When the suggestion on screen is this unreliable, the manager needs to see the competing candidate and the reason for review, not a single confident-looking chip.

---

## 3. Three UI fixes

### 3.1 Show both candidates when the methods disagree

The row says the post sits between two categories and then displays one chip under "SUGGESTED FOR THIS POST." The second candidate is somewhere in "OTHER CATEGORIES," indistinguishable from the two that neither method proposed.

This is worse than showing no suggestion at all. A single chip under a "suggested" heading reads as a recommendation, so the manager is nudged toward whichever candidate happened to render, on a screen whose entire purpose is to make him adjudicate between two.

Both candidates under Suggested, unlabelled, consistent order, nothing pre-selected. This has been in three memos now and it is the last structural piece of the row design.

### 3.2 Render flag reasons inline

"+1 more" and "+2 more" hide the reasons behind a click. There are at most four possible reasons and each is a short phrase. Show them all.

Also confirm all four FR-07 conditions are implemented and that each has its own wording. Both visible rows show the disagreement string as the headline, which could mean the other conditions are firing but rendering with a generic message.

### 3.3 Separate Unassigned from the four categories

Unassigned currently sits in the same chip row as Product Showcase, Promotional Offer, and Entertainment. That presents "I cannot determine this" as a fifth content type rather than an escape hatch.

Two facts together suggest this is having an effect. The Unassigned bucket is empty across all 730 posts, and at least 5 posts have no caption text from which any category could be determined. Reviewers are not reaching for the option, and the visual grouping is part of why.

Put it on its own line, below the categories, with a short label such as "Cannot be determined from this post."

This matters beyond UX. Chapter 1's Limitations section states that a post remains unassigned where its content cannot be determined. If the corpus finishes with zero unassigned posts, that stated procedure and the actual results contradict each other, and the captionless post is the counterexample a panelist will find.

### 3.4 Small ones

- **"No titleView post"** still has no space between the two strings
- **"Search by title"** is probably correct given that Title is the caption field, but relabel it "Search captions" so it is unambiguous what is being searched

---

## 4. Revised FR-07 for the manuscript

The version currently in Chapter 3 says the system prioritises posts "whose category could not be determined with confidence." That has to change. It is not testable, there is no confidence score anywhere in the pipeline, and a panelist asking "how confident" has no answer available. Neither method produces a confidence value: keyword matching either hits a term or it does not, and the LLM at temperature 0 returns a label.

Proposed replacement:

> **FR-07 Content categorisation and review.** The system shall generate, once for each organic post at the time of ingestion, a suggested content category from the post's caption text, assigning one of product showcase, promotional offer, testimonial, and entertainment, and shall record each suggestion together with an identifier of the method version that produced it. The system shall prioritise for individual review those posts on which the categorisation methods disagree, on which a method returned no result, for which entertainment was suggested, or whose caption falls below a defined length, displaying the reason for review and every candidate category, and shall allow the remainder to be confirmed in batches. The system shall allow the marketing manager to accept, change, or set the category of any post, to consult the original post where the caption is not sufficient, and to record a post as unassigned where its content cannot be determined, retaining the manual assignment as the final value and recording the user, timestamp, and means of assignment for every category set.

Four things changed and why:

**"Once at the time of ingestion, with a recorded method version."** As written, nothing in FR-07 stops suggestions being regenerated on demand against a lexicon or prompt that has since moved. That is the gap the Generate buttons walked through, and after the 43 undated keyword additions it needs closing in the requirement rather than only in the code.

**Four named flag conditions replacing "with confidence."** Each is checkable. The entertainment condition needs its justification stated in the surrounding Chapter 3 text rather than left bare: the client defines entertainment partly through visual features, so caption text is the weakest evidence for that category specifically. That reasoning is already in Limitations.

**"From the post's caption text."** The export has both Title and Description and they behave very differently. Naming the field in the requirement prevents the build classifying on one while the reviewer reads another.

**"Displaying every candidate category"** and **"recording the means of assignment."** The first makes §3.1 a requirement rather than a preference. The second lets Chapter 4 separate individually reviewed labels from batch-confirmed ones, which matters because batch confirm rests on agreement with a method scoring κ = 0.139.

---

## 5. One requirement that does not exist yet

The read-only keyword lexicon has no requirement anywhere. It is now a system behaviour, it will be described in Chapter 3, and it needs a line of its own rather than being buried inside FR-07 or FR-08. Something like:

> **FR-07a Keyword lexicon integrity.** The system shall present the keyword lexicon for inspection and shall not permit its modification through any user interface.

Inspectability is the main argument for keeping a rule-based baseline at all, so the view-only display is worth preserving. Being able to open the term list at the defence is an asset.

---

## 6. Checklist

**Investigate first**

- [ ] The 5 null-caption posts: what each method returned, what flag fired, what input each method received
- [ ] Confirm the classifier reads Title, not Description
- [ ] Confirm both methods abstain rather than guess on empty input
- [ ] Report the caption-length threshold in use

**Row fixes**

- [ ] Both candidates under Suggested when methods disagree, nothing pre-selected
- [ ] All flag reasons inline, no "+N more"
- [ ] All four FR-07 conditions implemented with distinct wording
- [ ] Unassigned separated from the four categories, relabelled
- [ ] "No title" and "View post" spacing
- [ ] Search box relabelled

**Requirements**

- [ ] Suggestions generated once at ingestion, method version recorded
- [ ] Means of assignment recorded on every write
- [ ] FR-07a added for lexicon read-only

---

## 7. If you only do one thing

**§1.** The five null-caption posts. Everything else on this list is a fix I can describe accurately in the manuscript whether or not it has shipped. An unspecified fallback in the classification pipeline is the one thing that would make the method description wrong.
