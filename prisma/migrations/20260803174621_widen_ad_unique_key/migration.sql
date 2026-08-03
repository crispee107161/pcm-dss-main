-- Facebook allows the same ad name to appear in more than one ad set
-- (e.g. a real delivering ad and an unrelated "TESTER" ad set sharing a name
-- on the same reporting date). The old (ad_name, reporting_starts) key
-- collapsed those into one row, causing repeat CSV uploads of the same file
-- to always report changed rows as the two source rows kept overwriting
-- each other. Widening the key to include ad_set_name is safe: it can only
-- be a superset of the old constraint, so no existing row can violate it.
DROP INDEX "Ad_ad_name_reporting_starts_key";
CREATE UNIQUE INDEX "Ad_ad_name_ad_set_name_reporting_starts_key" ON "Ad"("ad_name", "ad_set_name", "reporting_starts");
