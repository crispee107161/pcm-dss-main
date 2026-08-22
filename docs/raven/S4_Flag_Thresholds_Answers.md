# S4 flag thresholds and button wording — answers

**Date:** 22 August 2026
**Re:** your two questions on the S4 implementation
**Summary:** both thresholds change. Button wording — your reasoning is correct, but rename anyway for a different reason.

Thanks for flagging that no prior number existed rather than just shipping placeholders quietly. Both of these will end up in Chapter 4, so they needed a basis.

---

## 1. Caption length — use **8 words**, not 10

### Why 10 is too loose

I ran the distribution across all 730 posts in the study period:

| Threshold | Posts flagged | Share |
|---|---|---|
| < 5 words | 47 | 6.4% |
| < 8 words | 65 | 8.9% |
| **< 10 words** | **112** | **15.3%** |
| < 12 words | 143 | 19.6% |
| < 15 words | 256 | 35.1% |

At 10 words, the band between 8 and 12 gets pulled in, and those captions are perfectly classifiable:

```
Legit builds come with proof, not promises. Choose PC Merchandise.
Ryzen 5 5600G (6pcs) Comshop Package #pcmerchandise #pcmbuild
Ryzen 7 5700X WITH RX6600 GAMING BUILD #PCMERCHANDISE #PCMBUILD
Scalable. Reliable. Profitable. Ryzen 5 8 PCs negosyo build—message us for info.
```

None of those needs a human. Flagging them adds review load without adding accuracy — and with 530 posts still to review, review load is the scarce resource.

### Why 8 works

- Flags **65 posts (8.9%)** — a manageable share
- Still catches **all 18 placeholder captions** ("PC Merchandise's Video"), which sit at exactly 3 words
- Corresponds to **approximately the 10th percentile** of caption length across the corpus (p10 = 8 words)

That last point is the defensible basis. It isn't a round number someone picked — it's "the shortest tenth of captions," which is a stated rule with a reason behind it.

### Implementation

```
FLAG_SHORT_CAPTION_WORDS = 8      // named constant
condition: word_count(normalised_caption) < 8
```

Count words on the **NFKC-normalised, whitespace-collapsed** caption — the same string fed to the classifiers — not the raw field.

### Chapter 3 wording (so you know what we're committing to)

> Posts were flagged for individual review where the normalised caption contained fewer than eight words, corresponding to approximately the tenth percentile of caption length across the 730 posts in the study period.

---

## 2. Entertainment rarity — drop the dynamic rule, **always flag entertainment**

Your implementation (under 10% of confirmed posts, suppressed below 20 confirmations) is careful engineering, and the suppression guard in particular shows you thought about the cold-start problem. But it's the wrong mechanism here, for three reasons.

**It's mildly circular.** The confirmed set is the output of the very review process the flag is meant to guide. The flag would be computed from decisions the flag influenced.

**It's order-dependent.** Early in the queue, whether entertainment reads as "rare" depends on which posts happened to get confirmed first. Two people working the queue in different orders would see different flags.

**It's unstable, which breaks the manuscript.** The same post could be flagged today and not tomorrow. Chapter 4 reports a breakdown of how many posts were flagged for each reason, and that number has to reproduce. A threshold that moves as the queue fills makes it irreproducible.

### What to do instead

```
condition: category_keyword == 'entertainment' OR category_llm == 'entertainment'
```

No threshold, no computation, no suppression guard. Always flag.

### The justification isn't statistical rarity — it's stronger than that

Two documented reasons, both of which go in Chapter 3:

**1. The category is defined partly by visual features.** The marketing manager's own definition (confirmed in writing, 12 August): *memes and funny skits, often with the store signage or the store itself visible.* Captions frequently don't convey that. A human needs to look.

**2. The FR-08 evaluation shows the LLM over-assigns it.** From the n=200 ground-truth run: the LLM predicted entertainment **38 times** when only **12** posts actually are entertainment. Recall 91.7%, precision ≈29%. All 10 posts humans labelled `unclear` were called entertainment by the LLM — a captionless post gives it nothing, and entertainment is the plausible-sounding fallback.

That's a measured precision problem in our own results. Every entertainment suggestion warrants a human look, and we can point to the confusion matrix to say why.

### Chapter 3 wording

> Posts for which entertainment was suggested were flagged for individual review, since that category is defined by the client partly through visual features not conveyed in caption text, and the evaluation of the automated methods indicated a tendency to over-assign it.

---

## 3. Button wording — your reasoning is right, rename anyway

You're correct that the §1 rationale doesn't cover these. That rationale was about not asking the Manager to referee between two labelled suggestions on a post he's judging. A button he chooses to click is a control, not attribution shown under a suggestion. The checklist item read too literally against your case. Good catch.

**But rename them for a different reason:** the words "keyword" and "LLM" on a working screen invite a question we don't need — *why is the Marketing Manager choosing a method?* He isn't. Both run, both get stored, and FR-08 evaluates them. He's just triggering the pass.

Suggested:

| Now | Change to |
|---|---|
| Auto-Categorize (keyword baseline) | **Generate suggestions** |
| Classify with AI (LLM) | **Generate AI suggestions** |

Same operation, no method vocabulary, no implied choice.

**This is a preference, not a correction.** If you'd rather keep yours, say so and we'll leave it — your reasoning holds and I'm not going to argue it. Just flagging why I'd lean the other way.

---

## 4. One thing to confirm

With a fixed 8-word threshold and an always-flag rule for entertainment, the flag conditions are now fully deterministic and the Chapter 4 breakdown will reproduce on a re-run.

Please confirm you're storing **the condition that fired**, not a computed value:

```
✓ flag_reasons: ['METHODS_DISAGREE', 'SHORT_CAPTION']
✗ flag_reasons: ['RARE_CATEGORY (8.2% of confirmed)']
```

If any stored flag carries a computed rarity percentage, it'll change on recomputation and the breakdown won't match what we publish.

---

## 5. Checklist

- [ ] `FLAG_SHORT_CAPTION_WORDS = 8` as a named constant, counted on the normalised caption
- [ ] Entertainment flag: unconditional on either method suggesting it — remove the 10% threshold and the 20-post suppression guard
- [ ] Rename the two trigger buttons (optional — your call, see §3)
- [ ] Confirm flag reasons stored as condition identifiers, not computed values
- [ ] Re-run the flag pass over the 530 and tell me the resulting counts per reason — I need that number for Chapter 4 and it's a good sanity check that the new thresholds land where we expect (~65 short-caption flags across the full 730)

---

Nice work on the rest of the spec. The per-post flag storage and the manuscript breakdown script are the two bits I would've had to chase you for later, so thanks for building them in the first pass.
