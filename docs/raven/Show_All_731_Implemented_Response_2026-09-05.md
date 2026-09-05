# Show all 731: implemented, both screens now at parity

**Date:** 5 September 2026
**Re:** `Show_All_731_and_Chapter3_Wording.md`
**Status:** §2 implemented and code-reviewed; §1/§3/§4/§5 confirmed as already closed; one number changed as a direct consequence and is called out below

---

## §2.2: Marketing Manager's screen now shows all 731

The Manager's "All" and "No category" filters now query with the same `includeGroundTruth: true` flag the Owner's screen already used, so both screens are at parity: 731 visible everywhere, 200 of them locked.

**The guard question is answered: the server-side refusal already existed.** `updatePostCategory` (the one write path to `category_final`) has refused any write to a `MANUAL_GROUND_TRUTH` row since the original FR-08 guard work — nothing about today's change touched or needed to touch it. Code review verified the check is still present and unmodified, and traced every writer in the codebase (the ground-truth import script, the un-finalize path, the backlog-repair script) to confirm none of them can produce a `MANUAL_GROUND_TRUTH` row with a null `category_final`, which is the property the lock's client-side rendering depends on.

**The lock is now explained, not just silent.** On the Manager's screen every other row shows a "Change" link; the 200 locked rows didn't, with nothing on screen saying why. Added a footnote (same pattern as the existing "Codebook assignments were made outside the system…" one) that only shows to the Manager, since the Owner's screen is already view-only everywhere and needs no such distinction:

> Locked reference posts are part of the study's external benchmark and can't be edited here.

**§2.3, the subtitle:** dropped the "(excluding the locked ground-truth benchmark)" clause from the Manager's "All" filter, same as the Owner's.

**Two defense-in-depth items caught in review, applied even though nothing was exploitable today:**
- `batchConfirmAgreed`'s candidate query relied on ground-truth rows always having a non-null `category_final` rather than stating the exclusion explicitly, unlike every other query in the file. Now uses the same `EXCLUDE_GROUND_TRUTH` predicate as the read-side filters.
- `CategoryEditCell`'s ground-truth check now runs before the "uncategorised" branch rather than after, so the lock no longer depends on that same invariant to keep the Manager off the needs-review link — it's structurally correct now, not just correct in practice.

- [ ] §2 closed.

---

## One number moved as a direct result: the Manager's "No category" tab is now 28, not 18

This is not a new bug — it's the same UNCLEAR merge from §1 of the prior memo, now reaching the Manager's screen because the 200 are visible there too. 10 of the 200 locked reference posts are coded `UNCLEAR`, and the Manager's tab now includes them, matching the Owner's 28.

**This supersedes the closing line of `Content_Second_Pass_Response_2026-09-05.md` §1**, which told you *"The Marketing Manager's tab now shows 18, matching your count."* That was correct at the time (531-post scope); it is no longer correct now that scope is 731. Both 18 and 28 were right for the scope they described — flagging so this doesn't read as a regression on a number you'd already verified.

One consequence worth a conscious decision rather than a silent one: the tab's subtitle — *"Posts reviewed and found to have no determinable category. Reviewed, not skipped."* — now covers 10 posts reviewed by external research coders against the codebook, never by anyone inside the app. Defensible under the same reading ("reviewed" doesn't specify by whom), but your call on whether that needs its own clause.

---

## §1, §3, §4, §5, §6: confirmed as you closed them

Nothing further from us on the tab predicate (§1), the Chapter 3 wording (§4 of the prior memo), the provenance footnote (§5), or the register pass (§6) — all landed as described in the prior two responses.

---

## What's left

Nothing outstanding from `Show_All_731_and_Chapter3_Wording.md`. The 18→28 move above is the one open item, and it's a disclosure rather than a decision — your call on whether the subtitle wording needs a follow-up.
