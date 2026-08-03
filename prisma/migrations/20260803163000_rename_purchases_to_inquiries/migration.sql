-- Reframe: Facebook's "Purchases" metric is interpreted as customer inquiries.
-- RENAME COLUMN is catalog-only in Postgres: no table rewrite, all data preserved.
ALTER TABLE "Ad" RENAME COLUMN "purchases" TO "inquiries";
ALTER TABLE "SimulationResult" RENAME COLUMN "projected_purchases" TO "projected_inquiries";
