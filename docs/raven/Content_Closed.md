# Content closed. One decision on the No category subtitle.

**Date:** 5 September 2026
**Re:** `Show_All_731_Implemented_Response_2026-09-05.md`
**Status:** one decision, then the tab is closed

---

## 1. The guard already existed, which is the answer I hoped for

`updatePostCategory` has refused writes to `MANUAL_GROUND_TRUTH` rows since the original FR-08 work, and nothing about the visibility change touched it.

**Tracing every writer to confirm none can produce a `MANUAL_GROUND_TRUTH` row with a null `category_final`** is the part that matters. The client-side lock rendering depends on that property, and it was holding by circumstance rather than by construction until you checked.

The two defence-in-depth items are the right instinct. `batchConfirmAgreed` relying on an invariant instead of stating its exclusion, and `CategoryEditCell` checking ground truth after the uncategorised branch rather than before, were both correct in practice and structurally fragile. Fixing them when nothing was exploitable is cheaper than fixing them after something is.

---

## 2. The lock footnote is right

> "Locked reference posts are part of the study's external benchmark and can't be edited here."

Scoping it to the Manager, since the Owner's screen is view-only throughout and has no Change link to be absent, is correct.

**One wording change**, per the rule against referencing the research in interface copy:

- [ ] **Replace "the study's external benchmark" with something operational**, for example:

> Locked posts are part of a fixed set used to check the system's accuracy and cannot be edited.

Same information, no reference to a study the Manager is not part of.

---

## 3. The 18 to 28 move: accepted, and it is simpler than you framed it

Correct that both figures were right for their scope, and flagging it rather than letting it read as a regression was the right call.

On the subtitle question, the situation is cleaner than your framing suggests. **All 28 were coded by the research coders outside the system**, not 10 of 28. The 18 from the backlog import and the 10 from the reference sample came from the same two people, the same codebook, and the same caption-only procedure. There is no mixed case.

So "Posts reviewed and found to have no determinable category. Reviewed, not skipped." is uniformly accurate. Its job is to distinguish reviewed-and-undecidable from not-yet-reviewed, and it does that correctly for all 28.

- [ ] **Leave the subtitle as it is**
- [ ] **Add the existing provenance footnote to the No category tab**, the one already on All: "Codebook assignments were made outside the system by the research coders, so no individual account is recorded against them."

That explains who reviewed them without the subtitle having to carry it, and it keeps the two tabs consistent. If the provenance column already renders on that tab, the footnote belongs beside it for the same reason it does on All.

---

## 4. Content is closed

Nothing outstanding once §2 and §3 land. Both are single strings.

We will return to this screen only if something upstream changes what it displays.

---

## 5. Priority

1. **§2**, the footnote wording
2. **§3**, the provenance footnote on the No category tab

Neither is urgent.
