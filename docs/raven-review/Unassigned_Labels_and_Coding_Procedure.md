# Revisions to the Unassigned memo: shorter labels, and one question about how the benchmark was coded

**Date:** 24 August 2026
**Re:** supersedes §2, §3, and §4 of `Unassigned_Tab_and_Flag_Filter.md`
**Status:** two label changes, one behaviour clarification, one question I need answered before we start coding

---

## 0. What changed since the last memo

Two things came up on our side after that memo went out.

**"Cannot be categorised" is too long for a tab.** Alongside "All" at three characters and "Needs Review" at twelve, a twenty-one character tab would dominate the row. Revised proposal in §2.

**Reviewers can and should open the original post.** This was underspecified in the last memo, and it changes what Unassigned actually means in practice. Details in §1.

Everything else in that memo stands: keep the tab, capture a reason, make it reversible, confirm the four flag conditions.

---

## 1. Reviewers consult the original post, and that is the intended behaviour

FR-07 already provides for this: the manager may "consult the original post where the caption is not sufficient." Chapter 1's Limitations section says the same, and adds that a post remains unassigned only where its content **still** cannot be determined after consulting it.

So the correct workflow for a post with no caption is: open the link, look at the image or video, and categorise it. Marking it uncategorisable is the last resort, not the default for missing text.

**Consequence: Unassigned should be rare.** Most of the 5 caption-less posts in the corpus will be categorisable once a human watches the video, particularly for entertainment content, which the client defines partly through visual features. The tab may end up holding two or three posts, or none. That is the right outcome.

**What this means for the UI:**

- [ ] **Make "View post" more prominent on the Needs Review row.** It is currently a small text link under the title, easy to miss, and it is the primary action for exactly the posts that most need it. It should read as an action, not a footnote.
- [ ] **Open it in a new tab**, so the reviewer does not lose their place in the queue
- [ ] **Consider surfacing the post thumbnail inline** on rows with short or absent captions. Not essential, but it would remove a context switch on the posts where the reviewer needs it most. Only if it is cheap.

---

## 2. Revised labels

### 2.1 Tab

| Element | Current | Revised proposal |
|---|---|---|
| Tab label | Unassigned | **No category** |
| Subtitle | Posts explicitly marked as unable to be categorised. | **Posts reviewed and found to have no determinable category. Reviewed, not skipped.** |
| Empty state | No posts have been marked unassigned. | **No posts have been marked as having no category.** |

"No category" is eleven characters, sits evenly beside "Needs Review", and states an outcome rather than a pending status, which was the whole source of the original misreading.

Internal enum value stays `unassigned`. This is display only, and Chapter 3's FR-07 wording will continue to use "unassigned" because that is the term in the requirement.

### 2.2 Chip on the review row

"Cannot be determined from this post" is too long for a chip. Revised:

- [ ] Chip label: **"No category applies"**
- [ ] Full explanation as hover text or a short line beneath the chip row
- [ ] Still on its own line below the four categories, visually separated, so it does not read as a fifth content type

### 2.3 Reason capture, revised list

Since a reviewer can now see the post, "no caption text" is no longer sufficient grounds on its own. Revised options:

- Content does not fit any of the four categories
- Post is unavailable or has been deleted
- Content is ambiguous between categories after review
- Other, with a free-text note

Dropping "no caption text" from the list is deliberate. If the only problem is a missing caption, the answer is to open the post, not to mark it uncategorisable.

---

## 3. ⚠ Question I need answered before we start coding the backlog

**When the 200-post ground-truth sample was coded, did the coders work from captions only, or did they open the original posts?**

I am asking you because the codebook and the coding records may be in the repo, and because the answer determines how we code the remaining 130.

It matters in two directions:

**Procedural consistency.** If the 200 were coded caption-only and we code the 130 with post access, the corpus has two coding procedures and Chapter 3 cannot describe one method. Whatever was done for the 200 has to be repeated for the 130.

**Interpreting the human ceiling.** If the 200 were coded with post access, then κ = 0.6505 is an agreement level achieved using visual information neither method ever had. That makes the comparison against the LLM's κ harsher than it appears, which is defensible and arguably the right ceiling, but it has to be stated in Chapter 3 rather than found by a panelist.

- [ ] Confirm which sources the ground-truth coders used
- [ ] Confirm whether the codebook states this explicitly. If it does not, we will add it and date the addition.

---

## 4. Consolidated checklist for this memo

**Labels**
- [ ] Tab renamed "No category"
- [ ] Subtitle rewritten, including "Reviewed, not skipped"
- [ ] Empty state updated
- [ ] Chip relabelled "No category applies", own line, visually separated
- [ ] Internal enum unchanged

**Original post access**
- [ ] "View post" made a prominent action rather than a small link
- [ ] Opens in a new tab
- [ ] Thumbnail inline on short-caption rows, if cheap

**Reason capture**
- [ ] Revised four-option list, "no caption text" removed
- [ ] Reason displayed as a column and available in the export

**Question**
- [ ] How the 200 ground-truth posts were coded, and whether the codebook says so

**Still carried over from earlier memos**
- [ ] Both candidates under Suggested when methods disagree
- [ ] Flag reasons inline rather than behind "+N more"
- [ ] Confirm all four flag conditions fire independently with distinct wording
- [ ] Caption-length threshold value

---

## 5. Priority

§3 is the only item here that blocks anything. We cannot start coding the 130 until we know how the 200 were coded, and that is a lookup rather than a build.

Everything else is small, and the two label changes are strings.
