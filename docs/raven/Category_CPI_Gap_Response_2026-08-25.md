# No screen computes CPI by content category — the fix is to revise FR-14 and FR-17

**Date:** 25 August 2026
**Re:** `FR_Mapping_Complete_and_Category_CPI_Gap.md` §3
**Status:** answer confirmed in code and spec; requesting the two clause edits you proposed

---

## Answer: No.

Nothing in the codebase computes cost per inquiry — or any advertising metric — broken down by content category. This isn't an oversight found by searching; it's a deliberate, explicitly documented constraint, stated identically in four independent places:

1. **`docs/mvp.md` §5.1**, "The no-join-key constraint": *"There is no key linking an organic post to the advertisement it became (verified exhaustively in `data_catalog.md`: different ID namespaces, zero ID matches, ad-name-to-caption fuzzy match tops out at 0.45)... 'Content category → ad efficiency' is permanently blocked by this — do not attempt it."*
2. **`docs/mvp.md` §5.2** (checked-and-rejected table): *"Content category → ad efficiency | Blocked by §5.1, no join key."*
3. **`prisma/migrations/20260812090000_schema_rework_mvp_v2/migration.sql:90`**: comment confirming ads carry no category FK — *"category → ad efficiency is permanently blocked, no join key exists."*
4. **`app/dashboard/owner/category-performance/page.tsx:29-31`**, in the query itself:
   ```
   // Ads no longer carry a category (mvp.md §5.1 — content category → ad
   // efficiency has no join key and is permanently out of scope). This report
   // is organic-post-only.
   ```

The `Ad` model has no `category_id` or equivalent column (confirmed against `prisma/schema.prisma`), and Category Performance's query selects only `FacebookPost` fields — `category_final`, `reach`, `reactions`, `comments`, `shares` — with no join to `Ad` at all.

There is no undocumented matching step to write up. The fuzzy-match attempt (ad name vs. post caption, topping out at 0.45 similarity) was tried and rejected during the MVP v2 respec, and that rejection is on record in §5.1 alongside the ID-namespace check.

## Requested edits, per your own proposal in §3

- **FR-17**: drop "cost per inquiry" from the content-category comparison; keep it for post type (FR-29 territory).
- **FR-14**: drop "content category" from the advertising aggregation levels (`advertisement, ad set, campaign, content category, month`); keep content category for the organic side only.

Confirming so these are ready for the traceability matrix — no code change needed on our end, this is a requirements-text fix only.
