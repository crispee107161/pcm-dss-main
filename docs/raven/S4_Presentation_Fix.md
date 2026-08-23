# S4 Categorisation Review — presentation fix

**Date:** 22 August 2026
**Scope:** display only. No change to flag logic, thresholds, storage, or scoring.
**Cause:** my spec, not your implementation.

---

## 0. This one's on me

I gave you four flag messages written as standalone sentences and you implemented them exactly as specified. Stacked four-deep on every row, they read as a wall of near-identical warnings, and the screen is harder to use than no flags at all.

Looking at the screenshot: five rows, and four of them show the same four warnings in the same order. The eye can't tell the rows apart, which defeats the entire point of triage — the queue is supposed to tell the Manager *which* posts need attention and *why they differ*.

Everything below is a presentation change. **Keep storing the flag reasons exactly as you do now** — Chapter 4 needs the per-reason breakdown.

---

## 1. What's wrong

**1. Repetition without differentiation.** DISAGREEMENT + UNCLASSIFIED + ENTERTAINMENT_SUGGESTED + SHORT_CAPTION fire together on most captionless video posts. Four rows showing the identical four-line block conveys nothing beyond "these are all uncertain."

**2. Two of the reasons are the same fact.** "The automated methods produced different results" and "the post's category could not be determined automatically" are, from the Manager's side, both saying *the system isn't sure.* Showing both is noise.

**3. Equal visual weight for unequal signals.** A warning triangle on "this caption is very short" gives it the same urgency as a genuine boundary case between testimonial and showcase. They are not equally interesting.

**4. The reasons describe internals, not actions.** "The automated methods produced different results" tells him what happened inside the system. What he needs is why the row is in front of him and what to do about it.

---

## 2. The fix: one ranked line, rest on demand

### 2.1 Show one primary reason

Rank the fired conditions and display **only the highest-ranked one**, with a count of the others:

```
⚠ Automated methods disagreed        +3 more
```

Hovering, or clicking "+3 more", reveals the full list. Most rows will never need expanding.

### 2.2 Ranking order

Most informative first:

| Rank | Condition | Why this order |
|---|---|---|
| 1 | `DISAGREEMENT` | Two independent methods diverging is the strongest signal of a genuine boundary case |
| 2 | `ENTERTAINMENT_SUGGESTED` | Rare category, known over-assignment, client-defined partly by visuals |
| 3 | `UNCLASSIFIED` | One method abstained — informative, but weaker than active disagreement |
| 4 | `SHORT_CAPTION` | Mechanical property of the text, least diagnostic |

### 2.3 Better still — rewrite the messages as instructions

The current strings describe system internals. Rewrite them to tell the Manager what the situation is *for him*:

| Condition | Now | Change to |
|---|---|---|
| `DISAGREEMENT` | "the automated methods produced different results for this post" | **"Needs your judgment — this post sits between two categories"** |
| `ENTERTAINMENT_SUGGESTED` | "entertainment was suggested for this post" | **"Check this one — entertainment is often over-suggested"** |
| `UNCLASSIFIED` | "the post's category could not be determined automatically" | **"Needs your judgment — the system couldn't determine a category"** |
| `SHORT_CAPTION` | "this caption is very short" | **"Open the post — the caption is too short to classify from text"** |

That last one is the most useful change on this page. For a caption reading "PC Merchandise's Video," the only real action is opening the post — so the row should say that, right next to the "View post" link that's already there.

### 2.4 Drop the warning triangle

Every row in this queue is flagged by definition, so a warning icon on every row carries no information. Use plain text, or a single small neutral marker. Reserve any emphasis for rank-1 disagreement rows if you want visual differentiation.

---

## 3. Two other things visible in the screenshot

### 3.1 The suggestion column still leaks method attribution

Rows show two chips: a category (e.g. `Entertainment`) plus `Unclassified`. `Unclassified` is unmistakably the keyword method's output, so the display is still telling the Manager which method said what — the exact thing the last spec was meant to remove.

**Fix:** when one method abstains, show only the method that produced a category, as an unlabelled option. The abstention is already communicated by the flag line. Don't render `Unclassified` as if it were a candidate category — it isn't one, and it can't be selected.

### 3.2 Confirm the Manager's view is actually actionable

The screenshot shows *"Queue of posts awaiting a final category (view only)"* with a **View only** button in the Action column. For the Owner that's correct per FR-07.

Please confirm the **Marketing Manager's** version of this screen shows selectable category options and a working assign action. If the Manager also sees "view only," nobody can finalise a category and the 530-post review can't start.

---

## 4. Row layout — suggested

```
┌────────────────────────────────────────────────────────────────────┐
│ PC Merchandise's Video                          [Videos]           │
│ View post ↗                                                        │
│                                                                    │
│ Suggested:  ( ) Entertainment   ( ) Product showcase               │
│             ( ) Promotional offer  ( ) Testimonial  ( ) Unassigned │
│                                                                    │
│ Open the post — the caption is too short to classify from text     │
│ +3 more                                                  [ Save ]  │
└────────────────────────────────────────────────────────────────────┘
```

One reason line. Options unlabelled, nothing pre-selected. "View post" adjacent to the reason that tells him to use it.

---

## 5. Do NOT change

- [ ] Flag **logic** — the four conditions and their thresholds (8 words, unconditional entertainment) stay exactly as implemented
- [ ] Flag **storage** — keep storing every condition that fired, per post, as identifiers. Chapter 4 reports the breakdown by reason and it must reproduce
- [ ] The 200 ground-truth posts stay locked, no permalink on that view
- [ ] `source` stamping on every write
- [ ] Batch confirm for unflagged posts

**This is presentation only.** The underlying data model doesn't move.

---

## 6. Checklist

- [ ] Display one ranked primary reason per row, with "+N more" for the rest
- [ ] Ranking: disagreement → entertainment → unclassified → short caption
- [ ] Rewrite the four messages as instructions to the Manager (§2.3)
- [ ] Remove the warning triangle from every row
- [ ] Stop rendering `Unclassified` as a suggestion chip — show only real category candidates
- [ ] Confirm the Marketing Manager's view is actionable, not view-only
- [ ] Verify flag storage unchanged — reasons still stored individually per post

---

## 7. Sanity check when you're done

Open the queue and look at five consecutive captionless video posts. If they still look identical to each other, the change hasn't worked — those rows should now all read *"Open the post — the caption is too short to classify from text,"* which is at least an instruction rather than a diagnosis.

Also: **141 posts in queue** out of 530 is a reasonable triage rate. That's roughly what we estimated, so the thresholds are landing about right.
