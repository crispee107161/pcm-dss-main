# Categorisation workflow — consolidate to one screen, remove Propose

**Date:** 22 August 2026
**Affects:** S3 Content Library, S4 Categorisation Review, `category_pending`, Team role access
**Reason:** two screens write to the same field, only one of them has any guidance, and a third role can write to a fourth field for a workflow nobody asked for.

---

## 0. ⚠ Before anything else — someone is working the queue right now

The queue was **141** this morning and is **130** in the latest screenshot. Someone is categorising posts as we speak.

**Please ask them to stop until two things are confirmed:**

1. **Is the keyword lexicon still editable, and has it changed since the ground truth was imported?** (unanswered from my memo of 22 Aug, §1)
2. **Is `ground_truth_categories.csv` actually imported and persisted?** Your inventory §7 says `groundTruth.n === 0`; the screenshots show n=200. Both can't be true.

Every post categorised before those are settled has uncertain provenance. If the labels were produced against a lexicon that has since moved, or the ground truth isn't the one we coded, the Chapter 4 category analysis rests on something we can't describe accurately.

Eleven posts is nothing to redo. Two hundred would be.

---

## 1. What's wrong with the current review screen

Looking at the Categorization Review screenshot, four things compound into "something's off."

### 1.1 "Override" is the label on the normal path

The row shows: one suggestion chip (`Testimonial`), a dropdown reading `— None —`, and a button reading **Override & finalize**.

So the only visible action is *overriding* — even though nothing has been selected and the manager may well agree with the suggestion. The chip is a badge, not a control. To **agree**, he has to locate that same category in the dropdown and then press a button telling him he's overriding.

**Agreeing and disagreeing are the same gesture, and the gesture is named after disagreement.** That's the single biggest source of friction on this screen.

### 1.2 "SUGGESTED / PENDING" means the UI can't tell them apart

That header covers three different things:

- a keyword-method suggestion
- an LLM suggestion
- a Team member's proposal (`category_pending`)

Accepting a colleague's judgment is not the same act as accepting an algorithm's guess. The manager can't see which he's looking at.

### 1.3 The flag says "two categories" but only one is shown

*"Needs your judgment — this post sits between two categories"* sits above **one** chip.

If the methods disagree there are two candidates, and the earlier spec was to show both as unlabelled options with neither pre-selected. Right now the second is invisible, so the flag describes a conflict the screen doesn't display.

### 1.4 Two doors into the same room, one with no guidance

Content Library gives **every** post a category dropdown and a Save button, writing to the same `category_final` via the same `updatePostCategory` action.

A manager could categorise all 730 posts there and never see a flag, a suggestion, or a review reason. Two screens, same write, different button labels, one with triage and one without.

**Underneath all of it:** there are now five category fields — `category_keyword`, `category_llm`, `category_pending`, `category_final`, `category_ground_truth` — and the UI surfaces them inconsistently. That's why it feels like a lot is happening.

---

## 2. Remove Propose and `category_pending`

### 2.1 Where it came from

Propose implements the phrase "Team = Suggest only" from the access matrix. **It doesn't trace to anything the client described.** No condition in Chapter 1 identifies a two-stage approval workflow, and nobody at PC Merchandise asked for one.

### 2.2 Why it should go

**It adds a fifth field and a state machine** — propose → accept → reject — for a workflow nobody requested.

**It creates an indefinite state.** A post can sit proposed-but-unfinalised forever. That's a queue state we'd have to explain in Chapter 3 and account for in Chapter 4's provenance counts.

**It doesn't match the Team's actual role.** In Chapter 1, the marketing team produces content. Condition five is that outcome information never reaches them — so their justified access is to *see how their content performed*, not to label it. Post Type Performance and Content Performance are their screens. Categorisation isn't.

**A team proposal isn't obviously better input than an algorithmic suggestion.** The manager is the domain authority here — he's the one who defined the categories and gave us the delivered-orders rule. A colleague's proposal is just another opinion he has to adjudicate, and it arrives with less signal than a flagged disagreement between two methods.

**And it can't be justified in Chapter 3.** "The access matrix said Suggest only" is circular — the access matrix is ours.

### 2.3 What to do

- [ ] Remove `TeamProposeCell` and the propose action
- [ ] Drop `category_pending` from the schema (or leave the column unused and unreferenced if a migration is more trouble than it's worth — but nothing should read or write it)
- [ ] Set Marketing Team to **view-only** on the categorisation screen, or remove their access entirely
- [ ] Confirm no `defaultSelection` logic still reads `category_pending`

**The counter-case, for the record:** if the team were large and the manager overloaded, distributing a first pass would be a real efficiency. But the team is small and the queue is 130 posts — one evening for one person. The complexity isn't buying anything.

---

## 3. Merge Content Library and Categorisation Review into one screen

**Direct answer to the question you raised: no, two tabs are not necessary. Merging them is the better design, and it fixes §1.4 outright.**

### 3.1 The problem with two screens

They are the same corpus and the same write. The only difference is a `WHERE category_final IS NULL` filter and the presence of triage UI. That's a **filter and a column set**, not two screens.

The real cost of keeping them separate: **two write paths to `category_final`, one of which bypasses the entire triage design.** For the study, that means labels with different provenance depending on which door the manager walked through — and we'd have no way to tell them apart afterwards.

### 3.2 The design: one screen, filtered

**Sidebar entry: "Content"** (single entry, replacing both)

**Default filter on load: "Needs review"** — this *is* the queue. Same posts, same order, same flags.

**Filter options:**

| Filter | Shows | Columns shown |
|---|---|---|
| **Needs review** *(default)* | `category_final IS NULL` | suggestions, review reasons, batch confirm |
| All posts | everything | assigned category, editable |
| Categorised | `category_final IS NOT NULL` | assigned category, editable, who set it and when |
| Unassigned | `review_status = 'unresolvable'` | assigned category, editable |

**Behaviour by filter:**
- On **Needs review**, the row renders suggestions, the review-reason line, and the accept/choose controls. Batch confirm operates on the filtered selection.
- On the other filters, the row shows the assigned category in a dropdown — same as Content Library does now — plus provenance (`source`, user, timestamp).

### 3.3 Why this is better than two screens

- **One place where categories are set.** One mental model, one write path, one thing to audit.
- **The queue is a view of the corpus, not a separate corpus.** Which is what it actually is.
- **No dead screen after the backlog clears.** Once the 130 are done, the default filter simply returns empty and the manager switches to All. With two screens, Categorisation Review becomes a permanently empty page.
- **Provenance stays consistent** — every write goes through the same path and stamps `source` the same way.
- **Fewer sidebar entries**, which matters given the panel's note about feature sprawl.

### 3.4 Routes — what happens to the existing four

| Current route | Becomes |
|---|---|
| `/dashboard/marketing/categorize` | **Keep as the canonical route**, or rename to `/dashboard/marketing/content` — your call on which URL survives |
| `/dashboard/marketing/content` | Redirect to the canonical route with `?filter=all` |
| `/dashboard/owner/categorize` | Keep, view-only, default filter `needs-review` |
| `/dashboard/owner/content` | **Delete** — already unlinked and orphaned (your inventory §6) |

Filter state in the query string (`?filter=needs-review`) rather than component state, so the Manager can bookmark the queue and so a link from elsewhere in the app can deep-link to a specific view. The Upload screen's "X posts need categorising" message, if you add one, should link to `?filter=needs-review`.

### 3.5 Component consolidation

`CategorizeClient` and `ContentLibraryClient` become one component taking:

```
role         — owner | marketing_manager | marketing_team
filter       — needs-review | all | categorised | unassigned
canEdit      — derived from role
```

Column set switches on `filter`:

| Filter | Suggestions | Review reasons | Batch confirm | Category control | Provenance |
|---|---|---|---|---|---|
| needs-review | shown | shown | shown | radio options | — |
| all | — | — | — | dropdown | shown |
| categorised | — | — | — | dropdown | shown |
| unassigned | — | — | — | dropdown | shown |

Search and post-type filters apply across all four views — those exist on Content Library today and should carry over rather than being lost in the merge.

### 3.6 Cost

Both components already exist and both already take role props. This is one component with a filter and conditional columns, not new functionality. With seven weeks to the defence this is comfortably affordable, and it removes a whole category of "which screen did that label come from?" questions.

**One thing to preserve:** Content Library currently shows views and engagement rate per post (visible in the screenshot). Those columns are useful context when assigning a category and should survive into the merged screen, at least on the non-queue filters.

---

## 4. Fix the row interaction

Applies to the "Needs review" filter regardless of whether §3 lands.

### 4.1 Show all candidates as selectable options

When the methods disagree, show **both** candidates. Unlabelled, consistent order, **nothing pre-selected**:

```
Suggested for this post:
  ( ) Testimonial        ( ) Product showcase

Other categories:
  ( ) Promotional offer  ( ) Entertainment  ( ) Unassigned
```

The chip becomes a radio option. No separate dropdown needed.

### 4.2 Split the action into two buttons

| Situation | Buttons |
|---|---|
| Manager picks one of the suggested categories | **Confirm** |
| Manager picks something else | **Save** |

Or one button labelled **Save category**, enabled once a selection exists. Either works. **"Override" should not appear** unless the manager is actually changing an already-finalised category — which, under §3, is what the "Categorised" filter is for.

### 4.3 Never label a suggestion by its source

Per the earlier spec: don't show "keyword said X, LLM said Y." With Propose removed, "SUGGESTED / PENDING" becomes just **"Suggested"**, which is accurate and unambiguous.

---

## 5. Requirement implications

FR-07 in Chapter 3's Table 3 already reads correctly for this design — it says final assignment is retained by the marketing manager and says nothing about team proposals:

> **FR-07 — Content categorisation and review.** The system shall generate a suggested content category for each organic post from its accompanying text… shall prioritise for individual review those posts whose category could not be determined with confidence, and shall allow the remainder to be confirmed in batches. The system shall allow the marketing manager to accept, change, or set the category of any post, to consult the original post where the caption is not sufficient, and to record a post as unassigned where its content cannot be determined, retaining the manual assignment as the final value.

**Please check what you built from.** If the version in your working docs mentions team proposals or `category_pending`, tell me and I'll reconcile — the requirement and the build have to agree, and right now I think the requirement is already right and the build is ahead of it.

---

## 6. Checklist

**Stop first**
- [ ] Pause queue work until the lexicon and ground-truth questions are answered (§0)

**Remove**
- [ ] `TeamProposeCell`, `proposePostCategory`, and the propose action
- [ ] `category_pending` — nothing reads or writes it
- [ ] Marketing Team write access to categorisation
- [ ] The word "Override" from the primary action on uncategorised posts

**Merge**
- [ ] Single "Content" sidebar entry replacing Content Library + Categorisation Review
- [ ] Filter: Needs review (default) / All / Categorised / Unassigned
- [ ] Filter state in the query string, not component state
- [ ] Triage columns render only on "Needs review"
- [ ] Batch confirm operates on the filtered selection
- [ ] One write path to `category_final`, stamping `source` consistently
- [ ] `/dashboard/marketing/content` redirects to the canonical route with `?filter=all`
- [ ] `/dashboard/owner/content` deleted
- [ ] Search and post-type filters carried over from Content Library
- [ ] Views and engagement rate columns preserved on the non-queue filters
- [ ] Provenance (`source`, user, timestamp) shown on categorised rows

**Fix the row**
- [ ] Both candidate categories shown as selectable options when methods disagree
- [ ] Nothing pre-selected
- [ ] Chip becomes a radio option, dropdown for the remaining categories
- [ ] "Suggested" as the header, no method attribution

**Verify**
- [ ] Ground-truth 200 remain locked and excluded from the queue
- [ ] Audit trail still records every category write with user and timestamp
- [ ] Flag reasons still stored per-post as identifiers (Chapter 4 needs the breakdown)

---

## 7. What I'd do first

If you only get to one thing: **§0**. The answers to the lexicon and ground-truth questions cost you five minutes each and they're currently blocking my ability to describe the categorisation methodology accurately in Chapter 3.

The merge in §3 is the biggest improvement but it's also the biggest change, so it can wait for a clear session. Removing Propose (§2) is small and removes a whole state machine.
