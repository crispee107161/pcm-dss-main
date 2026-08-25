-- docs/raven/Six_Edits_and_Chat_Feature_Decision.md §3, FR-07 version
-- identifier: two nullable additive columns, no data loss, no existing
-- column touched. Applied manually via `prisma db execute` +
-- `migrate resolve --applied`, same as the two migrations before it
-- (20260825050000, 20260825051500) — Neon's pooled connection string
-- doesn't support the session-level advisory lock `migrate dev`/`deploy`
-- needs. Both columns are written going forward only; historical rows stay
-- NULL, same convention as MANUAL_CHANGE_AFTER_FINALISATION in
-- 20260823150110.
ALTER TABLE "FacebookPost" ADD COLUMN "category_llm_model" TEXT;
ALTER TABLE "FacebookPost" ADD COLUMN "category_keyword_lexicon_count" INTEGER;
