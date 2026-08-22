-- Renames the CategoryFlagReason value rather than dropping+adding it, since
-- Postgres enums can't drop a value in use — and this way the rename is
-- lossless even if it later turns out a row does carry the old value.
-- Confirmed via scripts (ad hoc, not checked in) that no row currently uses
-- 'RARE_CATEGORY' before this migration was written.
ALTER TYPE "CategoryFlagReason" RENAME VALUE 'RARE_CATEGORY' TO 'ENTERTAINMENT_SUGGESTED';
