# Coding the backlog: what we need exported, and what to do about the posts already categorised

**Date:** 4 September 2026
**Re:** the 519-post coding backlog
**Status:** one export needed, one question about import format, one repair, one standing request

---

## 0. Why the coding happens outside the system

Stating this once so the request makes sense, since it looks like we are ignoring a feature you built.

The categorisation module's job is to make categorisation possible for the client. Before it existed there was no category field at all, so performance could not be compared by content type. That deliverable stands on its own.

The study's job is different. Chapter 4 will report findings such as which content categories earn the highest engagement, and those findings need labels the classifier did not produce. Otherwise the sentence "Entertainment posts earn the highest engagement rate" really means "posts the language model called Entertainment earn the highest engagement rate," which is a claim about the classifier rather than about the client's content. We have measured that classifier at κ = 0.4645, moderate at best.

There is a second effect. A reviewer shown a suggestion agrees with it more often than they would have chosen it independently, so labels produced that way inherit the classifier's errors in a biased direction.

**The system built the scale. The study needs a reference weight the scale did not produce.**

### 0.1 One upside worth naming

The suggestions for all 519 already exist, generated before any human coding. If we code blind, we can then compare those suggestions against our labels across the whole set.

**That takes the FR-08 validation from 200 posts to 719**, which is the entire in-period corpus rather than a sample. Materially stronger than what we have now, and it costs nothing beyond work already planned.

---

## 1. ⚠ The export we need

A CSV, one row per post, containing **only** these columns:

```
post_id, caption
```

Nothing else. Specifically **not** the keyword suggestion, the LLM suggestion, the flag reasons, views, reach, engagement rate, post type, or publish date.

Any of those could influence a coding judgment, and the value of the exercise depends on the judgment being independent of what the system thinks.

**Population:** the in-period posts with no final category. Currently around 516, though see §2.

- [ ] **Please export it**, and tell us the exact row count so we know what we are coding
- [ ] Confirm the caption is the same text the classifier reads, being the longer of Title and Description
- [ ] Include posts with an empty caption rather than filtering them out. Those are legitimately "no category" decisions and we need to make them explicitly.

Two copies would be ideal, or one file we each duplicate. Janine and I code independently and reconcile afterwards, matching the procedure used for the 200-post reference sample.

---

## 2. ⚠ The three posts already categorised through the interface

The count moved from 519 to 518 to 516 across two screenshots taken minutes apart. The Owner account is view-only on Content, so this was the Marketing Manager account.

Those posts carry `MANUAL_SELECTION`, produced by one person seeing a suggestion before deciding, rather than the codebook procedure. If they stay, the corpus carries two label provenances from two different procedures and Chapter 3 has to describe both.

**The fix is to return them to the queue** so they enter the coding set with everything else.

- [ ] **Send the count by `category_final_source`** for in-period posts, so we know exactly how many are affected
- [ ] **Null `category_final` and `category_final_source`** on posts carrying `MANUAL_SELECTION` that were assigned after the legacy nulling, returning them to the queue
- [ ] Leave `category_keyword` and `category_llm` untouched, as with the 574
- [ ] Send a dry run first, as with the 574

If it turns out to be more than a handful, tell us the number before running anything and we will decide rather than assume.

### 2.1 And please ask whoever it is to stop

Still unanswered from the earlier memo.

- [ ] **Who is signed in as the Marketing Manager and working the queue?**
- [ ] Please ask them to hold until the coding is imported

Every post categorised between now and then is one more to reverse.

---

## 3. ⚠ Do not let the queue empty

Related, and it needs a decision now rather than after the import.

**We need 10 to 15 posts left uncategorised for the defence.** They are the demonstration. The panel watches the suggestions appear, the flags fire, the manager choose, and the assignment record. Without them, FR-07 cannot be shown working and there is only our word that it does.

- [ ] **Hold back 10 to 15 posts from the import**, chosen to cover all four flag conditions: a method disagreement, a post where a method returned no result, an entertainment suggestion, and a short caption

We will identify which ones once we have the export, or you can select them if that is easier. Either way they should not be imported with the rest.

---

## 4. What format do you want back?

You built `scripts/import-codebook-assignment.ts`, so you know what it expects. Confirming rather than guessing.

- [ ] **Is `post_id, category` the shape you want?**
- [ ] **What exact strings for the category values?** `PRODUCT_SHOWCASE`, `Product Showcase`, or something else, and what for the no-category case
- [ ] **Will it ignore extra columns?** We would like to keep a `reason` column on the no-category rows, recording why a post could not be categorised, and a `notes` column for anything the codebook did not cover. Both are for the manuscript rather than for the system, so they can be stripped before import if the script would choke.
- [ ] Anything else the script expects, such as a header row, an encoding, or a specific delimiter

---

## 5. After the import, one thing to check

Once our labels are in, please confirm:

- [ ] Every imported row carries `MANUAL_CODEBOOK_ASSIGNMENT`
- [ ] No `MANUAL_GROUND_TRUTH` row was touched, which the script already refuses but is worth confirming after the fact
- [ ] The queue still holds the posts held back per §3
- [ ] The resulting count by `category_final_source`

That last figure goes into Chapter 4 as the provenance breakdown, so we need it as a stated number rather than reconstructed later.

---

## 6. Priority

1. **§2.1**, ask whoever it is to stop. One message.
2. **§1**, the export. Blocks the coding, which is the long pole on our side.
3. **§4**, the import format. Answer alongside the export so we code into the right shape from the start.
4. **§2**, the repair. After the count comes back.
5. **§3**, the hold-back. Before the import, not after.
6. **§5**, after.

The coding is roughly two evenings for two people once the export lands, so §1 is what everything else waits on.
