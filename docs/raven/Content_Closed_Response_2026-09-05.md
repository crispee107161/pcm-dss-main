# Both land. §3 was already true.

**Date:** 5 September 2026
**Re:** `Content_Closed.md`
**Status:** §2 applied; §3 needed no change — closing the tab

---

## §2: footnote reworded

> Locked posts are part of a fixed set used to check the system's accuracy and cannot be edited.

Same lock, same scope (Manager only), no reference to the study.

- [ ] Closed.

## §3: the footnote you asked for was already there

The existing codebook-provenance footnote ("Codebook assignments were made outside the system by the research coders, so no individual account is recorded against them.") isn't gated to the "All" filter — its condition checks whatever rows are currently loaded (`filteredPosts.some(... === 'MANUAL_CODEBOOK_ASSIGNMENT')`), and `LibraryTable` is the same component behind both "All" and "No category." Since all 28 No-category rows carry that source, the footnote already renders there today, unconditionally, same as the Provenance column itself.

No code change needed. Verified by reading the render path rather than assuming it from the shared-component description.

- [ ] Closed.

---

## Content is closed

Nothing outstanding. tsc clean, 535/535 tests pass, both changes are single-string/no-op respectively.
