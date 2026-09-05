# Content, second pass: response

**Date:** 5 September 2026
**Re:** Content_Second_Pass.md — all six sections
**Status:** implemented, code-reviewed, committed (27cf9c8)

---

## §1. The No category tab

Confirmed: `UNCLASSIFIED` (the system's own abstain) and `UNCLEAR` (a human
coder's "cannot decide" verdict, written by both `import-ground-truth.ts` and
`import-codebook-assignment.ts`) were two mechanisms for the same concept,
and the tab only read the first. The filter now matches `category_final IN
(UNCLASSIFIED, UNCLEAR)`.

One thing the fix surfaced that's worth flagging: `UNCLEAR` was rendering its
raw label ("Unclear") on badges, which is the manuscript-language leak §0.3
bans — the display layer had only ever mapped `UNCLASSIFIED` to "No
category". Fixed at the source (`selectableLabelText`) so both values read
"No category" everywhere, not just on this tab.

The Marketing Manager's tab now shows 18, matching your count.

## §4. The disagreement flag

Confirmed and fixed at the source: `DISAGREEMENT` required both suggestions
non-null and different, but didn't exclude `UNCLASSIFIED` as a "value" on
either side, so an abstain-vs-suggestion post fired `DISAGREEMENT` and
`UNCLASSIFIED` at once. Now requires both sides to be one of the four real
assignable labels (shares the same allowlist `category-picker.ts` already
uses for suggestion derivation, rather than a second, differently-shaped
check).

Repaired the flags already persisted under the old logic — 23 queued posts
lost the contradictory pair; the live queue is now fully clean. Also closed
a path we found in review: un-finalizing a post (the "(None)" option on
All/Unassigned) wasn't recomputing its flags, so a post finalized before
this fix could re-enter the queue still carrying the stale contradiction.
That now recomputes on the way back into the queue.

## §2/§3. The 531 exclusion

Went with your recommendation: the Owner's screen now shows all 731, with
the 200 reference posts visible and marked locked instead of removed. The
subtitle dropped the "excluding the locked ground-truth benchmark" clause
per §3's first option. Marketing Manager's screen is unchanged — still
excludes the 200 since she can edit and the exclusion is load-bearing there.

Because the exclusion was shared plumbing, review caught that showing these
200 also reused "Ground truth import" / "locked, ground truth" copy — the
same manuscript register §3 just removed from the subtitle, just relocated
to the Provenance column and category badge. Reworded to "Locked reference
set" / "locked reference" before this went out.

**One consequence worth naming rather than leaving for a third pass:** the
Owner's "No category" tab now shows **28**, not 18 — the same UNCLEAR merge
from §1, but the Owner's 28 additionally includes 10 of the 200 reference
posts (also coded UNCLEAR), which stay excluded from the Manager's 18. Both
numbers are internally consistent with your own §1 note ("the count is right
elsewhere") — 719 categorised includes all 28 — but the Owner and Manager
now see two different counts on the tab with the same label, and nothing on
screen explains why. Flagging in case that's worth a follow-up, same shape
as §2.

## §5. Provenance footnote

Added, using your wording, shown under the table whenever a visible row is
`MANUAL_CODEBOOK_ASSIGNMENT`.

## §6. Register

Rewrote all four flag reasons to status phrasing: "Two categories
suggested", "No category suggested", "Entertainment suggested, often
over-applied", "Caption too short to classify". ("No category suggested"
rather than "No suggestion from one method" — the latter is wrong when both
methods abstain, which happens on at least one live post.)

---

## What's left

Nothing outstanding from this memo. The one item above (§2's 28-vs-18 split)
is new, not a miss on the original six — your call on whether it needs its
own line item or can wait.
