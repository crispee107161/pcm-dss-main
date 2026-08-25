# Review of the full app inventory — findings and actions

**Date:** 22 August 2026
**Re:** your `Response_Full_App_Inventory.md`
**Blocking:** §1 and §2. Everything else can wait for your next session.

---

## 0. First — this is a good inventory, and the route tree is cleaner than I expected

Three things worth saying before the findings.

**Six cut features are properly gated.** `/correlation`, `/regression`, `/simulation` on both role trees, all behind `notFound()` stubs with the code left unwired on disk. That's exactly the right handling, and it means the forecast section was an exception rather than a pattern.

**No dynamic drill-downs.** Your §4 point that the route tree is genuinely flat is the single most reassuring thing in the document. It means nothing else is hiding behind a click-through.

**The shared-component list (§5) is more useful than you probably realised.** For Chapter 3's system design section, "one screen set with a role parameter" is a far better mental model than twenty independently-designed screens, and I'll write it that way. Your §6 second bullet said the same thing — agreed, and I'll use it.

Now the findings.

---

## 1. ⚠ BLOCKING — Manage Keywords is still live and editable, and the integrity question is unanswered

Line 27 of your table:

> `/dashboard/marketing/keywords` — Manager (Full) — categories with their keyword lists (ALG-04 lexicon), **add/edit/remove keywords**

My memo of earlier today (`Keyword_Lexicon_Integrity_and_FR08.md`) asked for this to be made read-only. It hasn't landed, and more importantly **§1 of that memo is still unanswered:**

1. Is the lexicon versioned or timestamped?
2. **Has it changed since the ground truth was imported?**
3. If it has, can you recover the lexicon as it stood at import time and re-run the keyword method against it?

**Why this can't wait.** The keyword method scored κ = 0.139. That's a visible, uncomfortable number sitting one click away from an interface that lets someone "fix" it. If the lexicon has moved since the ground truth landed, the FR-15 keyword result isn't measuring method accuracy any more — it's measuring how well an adjusted lexicon matches labels somebody could see.

That is the same circularity you correctly caught yourself on the n=775 panel. Same error, different route in.

**Actions:**
- [ ] **Answer the three questions above today**
- [ ] Snapshot the current lexicon to a committed file — we need the exact term list as a manuscript appendix regardless
- [ ] Make the lexicon read-only: remove Manage Keywords from the Manager's nav, keep a view-only display (inspectability is the main argument *for* a rule-based baseline, so being able to open the term list at defence is a genuine asset)
- [ ] Disable AI-assisted keyword suggestions entirely
- [ ] Enforce read-only server-side, not just by hiding the UI

---

## 2. ⚠ BLOCKING — is the ground truth actually imported?

Two of your statements can't both be current:

| Source | Says |
|---|---|
| Inventory §7 | *"`groundTruth.n === 0` is the current live state until that lands"* |
| Screenshots sent this morning | Ground-truth panel showing **n = 200**, keyword κ = 0.139, LLM κ = 0.444, human ceiling κ = 0.650, full confusion matrices |

**Which is it?** Either the screenshots came from a local run that wasn't persisted, or §7 is stale on this point.

This matters because Objective 2's entire result depends on it, and because the Method Evaluation redesign in §3 below can't be built without live figures to generate the summary from.

**For the record on the labelling itself:** §7 says the two-coder pass "hasn't been run yet." It has. Janine and I coded 200 posts independently on 13 August, computed inter-coder kappa before discussing anything (0.6505, 78.5% agreement), resolved all 43 disagreements, and produced `ground_truth_categories.csv` — 200 rows, `post_id` + `category`, which I sent you the same day. If that file hasn't been imported, it's a five-minute job and it unblocks everything downstream.

**Actions:**
- [ ] Confirm whether `ground_truth_categories.csv` is imported and persisted in the deployed environment
- [ ] If not, import it — `category_ground_truth`, `source = manual_ground_truth`, those 200 locked against overwrite
- [ ] Confirm FR-15 computes against `category_ground_truth`, never against `category_final`
- [ ] Correct §7 of the inventory — the labelling pass is done

---

## 3. Method Evaluation — keep it as its own screen, but invert what leads

Now that I can see the whole navigation, I can answer the placement question I'd been holding.

### 3.1 Placement: keep it separate. Don't fold it into Categorization Review.

Three reasons the inventory made clear:

- **The route tree is flat** (your §4). Nesting Method Evaluation inside another screen would make it the only nested thing in the app, and harder to reach at defence than any other feature.
- **The Owner's copy is already correctly placed** — line 41, under Reports. That's the demotion I asked for, and it landed. Good.
- **The Manager's copy is under Analytics** (line 42), which is inconsistent with the Owner's. One-line fix.

- [ ] Move the Manager's Method Evaluation from Analytics to Reports, matching the Owner's

### 3.2 What still needs to change: lead with plain language

Both copies still open with kappa cards and confusion matrices. That's right for a panelist and wrong for Sir Dan — he can't read a confusion matrix and doesn't need to.

**Above the fold**, one short paragraph generated from the computed figures:

> Category suggestions were compared against 200 posts categorised by hand. The AI method matched the human decision 65% of the time, against 78% agreement between two people doing the same task independently. Suggestions are usually right, but should be reviewed rather than accepted in bulk.
>
> The AI method is weakest on entertainment, which it suggests more often than it applies.

That second line is the one genuinely actionable sentence on the page — it tells him which suggestions to look at hardest.

**Everything else** goes behind `MethodologyNote`, the collapsible you already use on eight screens (your §5). Kappa, both confusion matrices, per-category recall, the human ceiling, the sample caveat, the n=775 circularity warning. One click for a panelist, invisible to the Manager.

**Generate the summary from the figures, don't hard-code it.** A sentence saying 65% while the screen shows 58% on a re-run is worse than no sentence.

- [ ] Invert the layout on both copies: plain-language summary above, statistics behind `MethodologyNote`
- [ ] Add per-category recall to the statistics block (currently only inferable from the matrix)
- [ ] Summary text computed at render time from live figures

### 3.3 Remove the script-run instructions from the Manager's copy

Line 42: *"includes script-run instructions for populating ground truth."*

That's a developer instruction on a client-facing screen. Sir Dan should never see a line telling him to run a script. If the import needs a trigger, it belongs in the Owner's administration area or nowhere in the UI.

- [ ] Remove script-run instructions from `/dashboard/marketing/method-evaluation`

### 3.4 Requirement wording update

FR-08 in Chapter 3's Table 3 is being extended to cover the presentation decision:

> **FR-08 — Categorisation method evaluation.** The system shall record the suggestions produced by each categorisation method alongside the manually assigned category, shall report percentage agreement, Cohen's kappa, a confusion matrix, and per-category recall for each method against the manual labels, and shall present these alongside a plain-language summary of what the agreement level implies for the review of suggestions.

---

## 4. Rankings vs. Top Ads — I withdraw the merge recommendation

Having now seen what each actually does, they're different screens serving different questions:

- **Rankings** — ad-set/campaign efficiency table, grouped by ID
- **Top Ads** — six top-10 panels split across volume (spend, conversations, reach) and efficiency (cost/conversation, CTR, cost/click), with a date-range filter

Merging would mean either dropping panels or building a bigger unified component for no gain. **Keep both.** My earlier §2.1 was based on the labels alone and I was wrong.

**One thing to fix:** "Top Ads" sitting next to "Rankings" reads as duplication when it isn't. Rename it to something that says what it does — *Top Performers*, or *Ad Leaderboards*, or similar. Your call on the wording.

- [ ] Keep both screens
- [ ] Rename "Top Ads" so the distinction from "Rankings" is visible in the nav

---

## 5. `/ui` has no auth check

Line 18: reachable by anyone, logged in or not.

You're right that it exposes no business data, so the practical risk is low. But the system is being evaluated against **ISO/IEC 25010, which includes Security as one of the eight characteristics**, and an ungated route is an unnecessary finding on an evaluation we control.

Cheapest fix that keeps it useful: gate it behind the same auth check as everything else, or behind a dev-only environment flag.

- [ ] Gate `/ui`, or delete it

---

## 6. Two orphans to resolve

### 6.1 Owner Content Library — delete it

Line 26 / your §6: unlinked from the sidebar, but the route file and auth check are still live and reachable by direct URL.

You called it dead weight and I agree. It's not the Owner's screen per the access matrix, and an orphaned route is exactly the category of thing this inventory exists to eliminate.

- [ ] Delete `/dashboard/owner/content` (route file and all)

### 6.2 Asymmetry worth a reason

`/dashboard/owner/campaign-rankings` has a marketing twin (line 33) but `/dashboard/owner/ad-set-ranking` doesn't. Deliberate or accidental?

If ad-set-level efficiency is Owner-only by design, fine — just confirm, so Chapter 3's access matrix states it correctly.

- [ ] Confirm whether ad-set Rankings is intentionally Owner-only

---

## 7. Two screens have no FR — they need one or they come out

Lines 34 and 38, both marked "Unsure":

**Trend Analysis** (`/dashboard/owner/trend-analysis`, `/dashboard/marketing/trend-analysis`) — I can't map this to anything in the spec, and the description doesn't tell me what it computes. **What does it actually show?** Depending on the answer it either gets an FR in Table 3, folds into FR-14 (period comparison), or comes out of the build.

⚠ **One thing to check on this screen specifically:** if it shows any trend line extending past the last data point, or any language implying direction of future movement, it's the forecast problem again in a different shape. Please confirm it's purely retrospective.

**Category Performance** (`/dashboard/owner/category-performance`) — this one I can place. It's FR-17 (content comparison reporting) in the revised Table 3. Your description matches it: organic-post category performance, sum-then-divide per ALG-09, n-labelled, ad-side explicitly excluded for lack of a join key. Correct implementation.

- [ ] Tell me what Trend Analysis computes, and confirm it's retrospective only
- [ ] Category Performance = FR-17, no change needed

---

## 8. Your §7 note about FR-25–FR-30 not being in the Objectives

Good flag, and you're right that it's a documentation question rather than a code gap. It's resolved on our side: Chapter 3's requirements table has been renumbered and consolidated (32 → 20 requirements), and every screen now maps to a requirement that traces to an objective.

I'll send you the mapping from your current FR numbers to the manuscript's before you update any code comments. Don't renumber anything yet.

---

## 9. Priority order

1. **Answer the lexicon integrity questions** (§1) — today
2. **Confirm ground-truth import status** (§2) — today
3. Make the lexicon read-only (§1)
4. Method Evaluation: invert the layout, move the Manager's copy to Reports, remove the script instructions (§3)
5. Tell me what Trend Analysis computes (§7)
6. Gate `/ui`, delete Owner Content Library (§5, §6.1)
7. Rename Top Ads (§4)

Items 1, 2, and 5 are answers rather than code. If nothing else happens this week, those three would still be the most useful thing you could send.
