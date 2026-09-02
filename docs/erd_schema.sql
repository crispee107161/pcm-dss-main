-- ============================================================================
-- PC Merchandise DSS — ERD schema export
-- Regenerated 2026-09-02 from prisma/schema.prisma (source of truth).
-- Supersedes the pre-MVPv2 version of this file (had SALES_DIRECTOR role,
-- was missing MARKETING_TEAM and every FR-15/FR-24/FR-31 table added since).
-- Also supersedes docs/erd_lucid_import.tsv (introspection dump — includes
-- Neon's own neon_auth.* tables and PostGIS's spatial_ref_sys, which are
-- platform plumbing, not app schema; not reproduced here).
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS "public";

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------

-- Three fixed roles (MVP v2 rework): SALES_DIRECTOR was removed and
-- MARKETING_TEAM added. MARKETING_MANAGER and MARKETING_TEAM both land on
-- /dashboard/marketing; BUSINESS_OWNER gets /dashboard/owner.
CREATE TYPE "Role" AS ENUM ('MARKETING_MANAGER', 'MARKETING_TEAM', 'BUSINESS_OWNER');

-- One member per uploadable CSV file type.
CREATE TYPE "UploadType" AS ENUM (
    'ADS_CSV',
    'POSTS_CSV',
    'PAGE_METRIC_CSV',
    'FOLLOWER_HISTORY_CSV',
    'PAGE_VIEWERS_CSV',
    'DEMOGRAPHICS_CSV',
    'AUDIENCE_CSV'
);

CREATE TYPE "UploadStatus" AS ENUM ('SUCCESS', 'FAILED');

-- ALG-04/ALG-05 content-categorisation output labels. UNCLEAR is a legitimate
-- 5th label that only ever arrives via the external ground-truth CSV import
-- (a human coder's genuine "cannot decide") — never produced by the app's own
-- keyword or LLM classifiers, which return UNCLASSIFIED instead.
CREATE TYPE "CategoryLabel" AS ENUM (
    'PRODUCT_SHOWCASE',
    'PROMOTIONAL_OFFER',
    'TESTIMONIAL',
    'ENTERTAINMENT',
    'UNCLASSIFIED',
    'UNCLEAR'
);

-- Distinguishes *how* FacebookPost.category_final was set (provenance), so a
-- contamination check can prove the blind ground-truth sample was never
-- touched by an accepted suggestion.
CREATE TYPE "CategoryFinalSource" AS ENUM (
    'MANUAL_GROUND_TRUTH',
    'ACCEPTED_SUGGESTION',
    'MANUAL_OVERRIDE',
    'LEGACY_IMPORT',
    'MANUAL_CHANGE_AFTER_FINALISATION',
    'MANUAL_CODEBOOK_ASSIGNMENT'
);

-- S4 Categorisation Review triage signal — a set of conditions (not a
-- boolean) computed per post whenever category_keyword/category_llm change.
CREATE TYPE "CategoryFlagReason" AS ENUM (
    'DISAGREEMENT',
    'UNCLASSIFIED',
    'ENTERTAINMENT_SUGGESTED',
    'SHORT_CAPTION'
);

-- FR-24 audit trail for every human categorisation decision made on S4.
CREATE TYPE "CategoryAuditAction" AS ENUM (
    'PROPOSE',
    'ACCEPT',
    'REJECT',
    'OVERRIDE',
    'BULK_ACCEPT',
    'BATCH_CONFIRM'
);

CREATE TYPE "CorrelationMethod" AS ENUM ('PEARSON', 'SPEARMAN');

-- FR-31 explanatory regression: PRIMARY = spend >= shared PHP 1,000
-- threshold (n=108); SECONDARY = all messaging ads (n=187).
CREATE TYPE "RegressionSpecification" AS ENUM ('PRIMARY', 'SECONDARY');

-- SR-L1/L2/L3 auth and account-admin event types, logged via
-- lib/security-log.ts's single logSecurityEvent() funnel.
CREATE TYPE "SecurityEventType" AS ENUM (
    'SIGN_IN_SUCCESS',
    'SIGN_IN_FAILURE',
    'SIGN_OUT',
    'ACCOUNT_LOCKED',
    'ACCOUNT_UNLOCKED',
    'PASSWORD_CHANGE',
    'PASSWORD_RESET',
    'ACCOUNT_CREATED',
    'ROLE_CHANGED',
    'ACCOUNT_DEACTIVATED',
    'ACCOUNT_REACTIVATED',
    'AUTHORIZATION_DENIED'
);

-- ----------------------------------------------------------------------------
-- Core: users, uploads, audit
-- ----------------------------------------------------------------------------

CREATE TABLE "User" (
    "id"            SERIAL NOT NULL,
    "email"         TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role"          "Role" NOT NULL,
    "created_at"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    -- Soft-delete flag (FR-02 says "deactivate," not "delete" — a hard
    -- delete would also break UploadLog.user_id's RESTRICT FK for any user
    -- with upload history). Deactivated users cannot authenticate.
    "is_active"     BOOLEAN NOT NULL DEFAULT true,

    -- SR-A6: consecutive-failure counter, reset on any successful sign-in or
    -- once LOCKOUT_WINDOW_MS has elapsed. is_locked is a manual gate, not a
    -- timer — SR-A6 says a locked account is released via User Management
    -- (or scripts/emergency-unlock.ts as a last resort), not by time alone.
    "failed_login_attempts"     INTEGER NOT NULL DEFAULT 0,
    "last_failed_login_at"      TIMESTAMP(3),
    "is_locked"                 BOOLEAN NOT NULL DEFAULT false,
    "locked_at"                 TIMESTAMP(3),
    -- SR-A8: an admin-issued temporary password. must_change_password gates
    -- every /dashboard route (and, via lib/auth-guard.ts, the report
    -- export/print routes) until changed; temp_password_expires_at also
    -- rejects sign-in 24h after issuance even if never changed.
    "must_change_password"      BOOLEAN NOT NULL DEFAULT false,
    "temp_password_expires_at"  TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UploadLog" (
    "id"                 SERIAL NOT NULL,
    "user_id"            INTEGER NOT NULL,
    "upload_type"        "UploadType" NOT NULL,
    "filename"           TEXT NOT NULL,
    "status"             "UploadStatus" NOT NULL,
    "records_inserted"   INTEGER NOT NULL DEFAULT 0,
    "records_updated"    INTEGER NOT NULL DEFAULT 0,
    "records_unchanged"  INTEGER NOT NULL DEFAULT 0,
    "records_superseded" INTEGER NOT NULL DEFAULT 0,
    -- FR-04/FR-07: rows that failed per-row validation, excluded but no
    -- longer aborting the rest of the upload. No relation table — these rows
    -- were never written, so there's no child ID to hang one off of.
    "records_rejected"  INTEGER NOT NULL DEFAULT 0,
    "rejected_reasons"  TEXT,
    "error_message"     TEXT,
    "warning_message"   TEXT,
    "uploaded_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UploadLog_pkey" PRIMARY KEY ("id")
);

-- FR-24: the "manual category assignment" half of the audit trail
-- (UploadLog already covers uploads). No FK to FacebookPost — the log must
-- survive independently of the post row it references by numeric id.
CREATE TABLE "CategoryAuditLog" (
    "id"                SERIAL NOT NULL,
    "user_id"           INTEGER NOT NULL,
    "action"            "CategoryAuditAction" NOT NULL,
    "facebook_post_id"  INTEGER NOT NULL,
    "previous_category" "CategoryLabel",
    "new_category"      "CategoryLabel",
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CategoryAuditLog_pkey" PRIMARY KEY ("id")
);

-- SR-L1: the auth/account-admin half of the audit trail — sign-in, lockout,
-- password reset, role change, deactivation, etc. user_id is nullable (a
-- failed sign-in against an unknown email has no row to join); actor_email
-- is the display fallback in that case (see lib/data/audit-log.ts).
CREATE TABLE "SecurityEventLog" (
    "id"             SERIAL NOT NULL,
    "at"             TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "event_type"     "SecurityEventType" NOT NULL,
    "user_id"        INTEGER,
    "actor_email"    TEXT,
    "target_user_id" INTEGER,
    "outcome"        TEXT NOT NULL,
    "detail"         TEXT,

    CONSTRAINT "SecurityEventLog_pkey" PRIMARY KEY ("id")
);

-- One-time Cohen's kappa between the two external ground-truth coders,
-- computed offline and stored so S8 can display it as the human "ceiling."
CREATE TABLE "InterCoderReliability" (
    "id"                SERIAL NOT NULL,
    "n"                 INTEGER NOT NULL,
    "percent_agreement" DOUBLE PRECISION NOT NULL,
    "kappa"             DOUBLE PRECISION NOT NULL,
    "computed_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes"             TEXT,

    CONSTRAINT "InterCoderReliability_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- Content: Facebook organic posts + ads
-- ----------------------------------------------------------------------------

CREATE TABLE "FacebookPost" (
    "id"                             SERIAL NOT NULL,
    "post_id"                        TEXT NOT NULL,
    "publish_time"                   TIMESTAMP(3) NOT NULL,
    "post_type"                      TEXT NOT NULL,
    "title"                          TEXT,
    "description"                   TEXT,
    "permalink"                      TEXT NOT NULL,
    "reach"                          INTEGER NOT NULL,
    "reactions"                      INTEGER NOT NULL DEFAULT 0,
    "comments"                       INTEGER NOT NULL DEFAULT 0,
    "shares"                         INTEGER NOT NULL DEFAULT 0,
    -- Nullable (unlike the other counters): FR-19/ALG-07 must exclude posts
    -- with a genuinely blank "Views" export cell, not coerce to 0.
    "views"                          INTEGER,
    -- Percentage 0-100 (already scaled).
    "engagement_rate"                DOUBLE PRECISION NOT NULL,
    -- FR-28 watch-through inputs — populated for videos/reels only.
    "duration_sec"                   DOUBLE PRECISION,
    "avg_seconds_viewed"             DOUBLE PRECISION,
    -- FR-15 three-column design: category_final is the single source of
    -- truth read by the rest of the app; keyword/llm are kept for the FR-15
    -- agreement study (Cohen's kappa, confusion matrix).
    "category_keyword"               "CategoryLabel",
    "category_llm"                   "CategoryLabel",
    "category_llm_model"             TEXT,
    "category_keyword_lexicon_count" INTEGER,
    "category_final"                 "CategoryLabel",
    "category_final_source"          "CategoryFinalSource",
    "category_final_assigned_by_id"  INTEGER,
    "category_final_assigned_at"     TIMESTAMP(3),
    -- FR-13: a MARKETING_TEAM proposal awaiting Manager accept/override.
    "category_pending"               "CategoryLabel",
    "category_pending_by"            INTEGER,
    -- Persisted S4 triage flags — a pure function of one post's own fields.
    "category_flag_reasons"          "CategoryFlagReason"[] NOT NULL DEFAULT ARRAY[]::"CategoryFlagReason"[],
    "created_at"                     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FacebookPost_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Ad" (
    "id"                       SERIAL NOT NULL,
    "reporting_starts"         TIMESTAMP(3) NOT NULL,
    "reporting_ends"           TIMESTAMP(3) NOT NULL,
    "ad_id"                    TEXT NOT NULL,
    "ad_name"                  TEXT NOT NULL,
    "ad_set_id"                TEXT NOT NULL,
    "ad_set_name"              TEXT NOT NULL,
    "campaign_id"              TEXT NOT NULL,
    "campaign_name"            TEXT NOT NULL,
    "attribution_setting"      TEXT NOT NULL,
    "reach"                    INTEGER,
    "impressions"              INTEGER NOT NULL,
    "link_clicks"              INTEGER,
    "amount_spent"             DOUBLE PRECISION NOT NULL,
    "result_type"              TEXT,
    "frequency"                DOUBLE PRECISION,
    "post_engagements"         INTEGER,
    "views"                    INTEGER,
    "viewers"                  INTEGER,
    "total_messaging_contacts" INTEGER,
    "results"                  INTEGER,
    "cost_per_result"          DOUBLE PRECISION,
    -- Permanently null on all data since the messaging-conversations DV
    -- pivot — Purchases/sales are out of scope by policy. Column kept, not
    -- dropped, pending a reviewed migration.
    "inquiries"                INTEGER,
    "created_at"               TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Ad_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- ALG-04 keyword-classifier lexicon
-- ----------------------------------------------------------------------------

CREATE TABLE "Category" (
    "id"   SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Keyword" (
    "id"          SERIAL NOT NULL,
    "word"        TEXT NOT NULL,
    "category_id" INTEGER NOT NULL,

    CONSTRAINT "Keyword_pkey" PRIMARY KEY ("id")
);

-- ALG-05: one row per LLM classification batch, kept permanently so any
-- label can be traced back to the raw model response that produced it.
CREATE TABLE "LlmClassificationRun" (
    "id"           SERIAL NOT NULL,
    "model_name"   TEXT NOT NULL,
    "run_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "post_ids"     INTEGER[] NOT NULL,
    "raw_response" TEXT NOT NULL,
    "succeeded"    BOOLEAN NOT NULL,

    CONSTRAINT "LlmClassificationRun_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- Statistical audit trails (ALG-08 correlation, FR-31 regression)
-- ----------------------------------------------------------------------------

-- ALG-08/FR-21: one row per correlation-selection run (Shapiro-Wilk-driven
-- Spearman/Pearson choice), persisted so the method choice is reproducible.
CREATE TABLE "CorrelationAssumptionRun" (
    "id"          SERIAL NOT NULL,
    "run_at"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "n"           INTEGER NOT NULL,
    "method"      "CorrelationMethod" NOT NULL,
    "coefficient" DOUBLE PRECISION NOT NULL,
    "p_value"     DOUBLE PRECISION NOT NULL,
    "shapiro_x_w" DOUBLE PRECISION NOT NULL,
    "shapiro_x_p" DOUBLE PRECISION NOT NULL,
    "shapiro_y_w" DOUBLE PRECISION NOT NULL,
    "shapiro_y_p" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "CorrelationAssumptionRun_pkey" PRIMARY KEY ("id")
);

-- FR-31: one row per specification (PRIMARY/SECONDARY) per S7 Analysis page
-- load. Manuscript audit trail, never read back by the app. Flat columns
-- because the four predictors (engagement_rate, frequency, ctr, cpm) are
-- fixed by the spec, not user-configurable.
CREATE TABLE "RegressionRun" (
    "id"                            SERIAL NOT NULL,
    "run_at"                        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "specification"                 "RegressionSpecification" NOT NULL,
    "n"                             INTEGER NOT NULL,
    "min_spend_filter"              DOUBLE PRECISION,

    "r_squared"                     DOUBLE PRECISION NOT NULL,
    "adj_r_squared"                 DOUBLE PRECISION NOT NULL,
    "f_statistic"                   DOUBLE PRECISION NOT NULL,
    "f_p_value"                     DOUBLE PRECISION NOT NULL,
    "residual_std_error"            DOUBLE PRECISION NOT NULL,

    "intercept_coef"                DOUBLE PRECISION NOT NULL,
    "intercept_se_ols"              DOUBLE PRECISION NOT NULL,
    "intercept_se_hc3"              DOUBLE PRECISION NOT NULL,
    "intercept_p_ols"               DOUBLE PRECISION NOT NULL,
    "intercept_p_hc3"               DOUBLE PRECISION NOT NULL,

    "engagement_rate_coef"          DOUBLE PRECISION NOT NULL,
    "engagement_rate_se_ols"        DOUBLE PRECISION NOT NULL,
    "engagement_rate_se_hc3"        DOUBLE PRECISION NOT NULL,
    "engagement_rate_p_ols"         DOUBLE PRECISION NOT NULL,
    "engagement_rate_p_hc3"         DOUBLE PRECISION NOT NULL,
    "engagement_rate_vif"           DOUBLE PRECISION NOT NULL,

    "frequency_coef"                DOUBLE PRECISION NOT NULL,
    "frequency_se_ols"              DOUBLE PRECISION NOT NULL,
    "frequency_se_hc3"              DOUBLE PRECISION NOT NULL,
    "frequency_p_ols"               DOUBLE PRECISION NOT NULL,
    "frequency_p_hc3"               DOUBLE PRECISION NOT NULL,
    "frequency_vif"                 DOUBLE PRECISION NOT NULL,

    "ctr_coef"                      DOUBLE PRECISION NOT NULL,
    "ctr_se_ols"                    DOUBLE PRECISION NOT NULL,
    "ctr_se_hc3"                    DOUBLE PRECISION NOT NULL,
    "ctr_p_ols"                     DOUBLE PRECISION NOT NULL,
    "ctr_p_hc3"                     DOUBLE PRECISION NOT NULL,
    "ctr_vif"                       DOUBLE PRECISION NOT NULL,

    "cpm_coef"                      DOUBLE PRECISION NOT NULL,
    "cpm_se_ols"                    DOUBLE PRECISION NOT NULL,
    "cpm_se_hc3"                    DOUBLE PRECISION NOT NULL,
    "cpm_p_ols"                     DOUBLE PRECISION NOT NULL,
    "cpm_p_hc3"                     DOUBLE PRECISION NOT NULL,
    "cpm_vif"                       DOUBLE PRECISION NOT NULL,

    "breusch_pagan_lm"              DOUBLE PRECISION NOT NULL,
    "breusch_pagan_p"               DOUBLE PRECISION NOT NULL,
    "jarque_bera_jb"                DOUBLE PRECISION NOT NULL,
    "jarque_bera_p"                 DOUBLE PRECISION NOT NULL,
    "jarque_bera_skew"              DOUBLE PRECISION NOT NULL,
    "jarque_bera_exkurt"            DOUBLE PRECISION NOT NULL,
    "shapiro_wilk_w"                DOUBLE PRECISION,
    "shapiro_wilk_p"                DOUBLE PRECISION,

    -- Accuracy metrics: PRIMARY specification only, null on SECONDARY.
    "in_sample_mae"                 DOUBLE PRECISION,
    "in_sample_rmse"                DOUBLE PRECISION,
    "in_sample_mape"                DOUBLE PRECISION,
    "cv_r_squared"                  DOUBLE PRECISION,
    "cv_mae"                        DOUBLE PRECISION,
    "cv_rmse"                       DOUBLE PRECISION,
    "cv_mape"                       DOUBLE PRECISION,
    "baseline_mae"                  DOUBLE PRECISION,
    "baseline_rmse"                 DOUBLE PRECISION,
    "baseline_mape"                 DOUBLE PRECISION,

    -- Residual diagnostic: PRIMARY specification only.
    "residual_flagged_count"        INTEGER,
    "residual_flagged_total_spend"  DOUBLE PRECISION,

    CONSTRAINT "RegressionRun_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- Cut-feature legacy tables (kept on disk, unwired from the current build —
-- see CLAUDE.md "cut features" note; do not treat as live)
-- ----------------------------------------------------------------------------

CREATE TABLE "RegressionModel" (
    "id"                   SERIAL NOT NULL,
    "intercept"            DOUBLE PRECISION NOT NULL,
    "coefficient"          DOUBLE PRECISION NOT NULL,
    "coef_reach"           DOUBLE PRECISION,
    "coef_messaging"       DOUBLE PRECISION,
    "coef_amount_spent"    DOUBLE PRECISION,
    "coef_spend_sq"        DOUBLE PRECISION,
    "coef_link_clicks"     DOUBLE PRECISION,
    "model_type"           TEXT,
    "residual_std_error"   DOUBLE PRECISION,
    "best_lag"             INTEGER,
    "r_squared"            DOUBLE PRECISION NOT NULL,
    "adj_r_squared"        DOUBLE PRECISION,
    "n"                    INTEGER NOT NULL,
    "collinearity_warning" TEXT,
    "trained_at"           TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RegressionModel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SimulationResult" (
    "id"                  SERIAL NOT NULL,
    "user_id"             INTEGER NOT NULL,
    "reach_input"         DOUBLE PRECISION,
    "messaging_input"     DOUBLE PRECISION,
    "amount_spent_input"  DOUBLE PRECISION NOT NULL,
    "projected_inquiries" DOUBLE PRECISION NOT NULL,
    "interval_lower"      DOUBLE PRECISION,
    "interval_upper"      DOUBLE PRECISION,
    "model_id"            INTEGER NOT NULL,
    "simulated_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SimulationResult_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- Page-level daily metrics and demographic snapshots
-- ----------------------------------------------------------------------------

-- All 6 CSV files (Follows/Interactions/Link clicks/Views/Viewers/Visits)
-- upsert into this single table by date.
CREATE TABLE "PageMetricDaily" (
    "id"           SERIAL NOT NULL,
    "date"         TIMESTAMP(3) NOT NULL,
    "follows"      INTEGER,
    "interactions" INTEGER,
    "link_clicks"  INTEGER,
    "views"        INTEGER,
    -- Distinct metric from PageViewers.total_viewers (different source file,
    -- different values on overlapping dates) — not a duplicate.
    "viewers"      INTEGER,
    "visits"       INTEGER,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageMetricDaily_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FollowerHistory" (
    "id"           SERIAL NOT NULL,
    "date"         TIMESTAMP(3) NOT NULL,
    "followers"    INTEGER NOT NULL,
    "daily_change" INTEGER NOT NULL,
    "created_at"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FollowerHistory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PageViewers" (
    "id"                SERIAL NOT NULL,
    "date"              TIMESTAMP(3) NOT NULL,
    "total_viewers"     INTEGER,
    "new_viewers"       INTEGER NOT NULL,
    "returning_viewers" INTEGER NOT NULL,
    "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PageViewers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FollowerGender" (
    "id"           SERIAL NOT NULL,
    "gender"       TEXT NOT NULL,
    "distribution" DOUBLE PRECISION NOT NULL,
    -- Source file carries no date of its own — this is the upload moment.
    -- Nullable: migration-backfilled rows never touched by a real upsert
    -- carry NULL ("not recorded") rather than a fabricated date.
    "captured_at"  TIMESTAMP(3),

    CONSTRAINT "FollowerGender_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FollowerTerritory" (
    "id"           SERIAL NOT NULL,
    "territory"    TEXT NOT NULL,
    "distribution" DOUBLE PRECISION NOT NULL,
    "captured_at"  TIMESTAMP(3),

    CONSTRAINT "FollowerTerritory_pkey" PRIMARY KEY ("id")
);

-- Age-bracket x gender distribution snapshot (Audience.csv "Age & gender"
-- block). men/women_distribution are each pair's share of the WHOLE
-- audience (all 12 cells sum to ~1), not a per-bracket 100% split. Meta's 6
-- age brackets are a fixed, closed set, so rows are upsert-only, no pruning.
CREATE TABLE "FollowerAgeGender" (
    "id"                 SERIAL NOT NULL,
    "age_bracket"        TEXT NOT NULL,
    "men_distribution"   DOUBLE PRECISION NOT NULL,
    "women_distribution" DOUBLE PRECISION NOT NULL,
    "captured_at"        TIMESTAMP(3),

    CONSTRAINT "FollowerAgeGender_pkey" PRIMARY KEY ("id")
);

-- "Top X" snapshot rows from Audience.csv's "Top cities" block. category is
-- always 'city' today; kept as a discriminator (rather than folding into
-- FollowerTerritory) in case a future Meta export adds another rank-shaped
-- block. Top-10-of-many: upsert prunes labels that fall out of a given
-- upload's top 10.
CREATE TABLE "FollowerAudienceRank" (
    "id"           SERIAL NOT NULL,
    "category"     TEXT NOT NULL,
    "label"        TEXT NOT NULL,
    "distribution" DOUBLE PRECISION NOT NULL,
    "captured_at"  TIMESTAMP(3),

    CONSTRAINT "FollowerAudienceRank_pkey" PRIMARY KEY ("id")
);

-- ----------------------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------------------

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE INDEX "CategoryAuditLog_created_at_idx" ON "CategoryAuditLog"("created_at");

CREATE INDEX "SecurityEventLog_at_idx" ON "SecurityEventLog"("at");
CREATE INDEX "SecurityEventLog_user_id_idx" ON "SecurityEventLog"("user_id");

CREATE UNIQUE INDEX "FacebookPost_post_id_key" ON "FacebookPost"("post_id");

CREATE UNIQUE INDEX "Ad_ad_id_reporting_starts_key" ON "Ad"("ad_id", "reporting_starts");
CREATE INDEX "Ad_ad_set_id_idx" ON "Ad"("ad_set_id");
CREATE INDEX "Ad_campaign_id_idx" ON "Ad"("campaign_id");
CREATE INDEX "Ad_reporting_starts_idx" ON "Ad"("reporting_starts");

CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");
CREATE UNIQUE INDEX "Keyword_word_key" ON "Keyword"("word");

CREATE UNIQUE INDEX "PageMetricDaily_date_key" ON "PageMetricDaily"("date");
CREATE UNIQUE INDEX "FollowerHistory_date_key" ON "FollowerHistory"("date");
CREATE UNIQUE INDEX "PageViewers_date_key" ON "PageViewers"("date");
CREATE UNIQUE INDEX "FollowerGender_gender_key" ON "FollowerGender"("gender");
CREATE UNIQUE INDEX "FollowerTerritory_territory_key" ON "FollowerTerritory"("territory");
CREATE UNIQUE INDEX "FollowerAgeGender_age_bracket_key" ON "FollowerAgeGender"("age_bracket");
CREATE UNIQUE INDEX "FollowerAudienceRank_category_label_key" ON "FollowerAudienceRank"("category", "label");

-- ----------------------------------------------------------------------------
-- Foreign keys
-- ----------------------------------------------------------------------------

ALTER TABLE "UploadLog" ADD CONSTRAINT "UploadLog_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CategoryAuditLog" ADD CONSTRAINT "CategoryAuditLog_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SecurityEventLog" ADD CONSTRAINT "SecurityEventLog_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FacebookPost" ADD CONSTRAINT "FacebookPost_category_final_assigned_by_id_fkey"
    FOREIGN KEY ("category_final_assigned_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FacebookPost" ADD CONSTRAINT "FacebookPost_category_pending_by_fkey"
    FOREIGN KEY ("category_pending_by") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Keyword" ADD CONSTRAINT "Keyword_category_id_fkey"
    FOREIGN KEY ("category_id") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "SimulationResult" ADD CONSTRAINT "SimulationResult_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ----------------------------------------------------------------------------
-- Tables with no FK to draw (deliberate design, not an omission)
-- ----------------------------------------------------------------------------
-- FacebookPost.category_pending_by / category_final_assigned_by_id are the
-- only FKs FacebookPost carries — there is no FK to Category. Categorisation
-- moved off the legacy Category/Keyword tables (still used only by ALG-04's
-- lexicon) onto the three CategoryLabel enum columns above.
-- Ad has NO category FK at all (categorisation applies to organic content,
-- not paid ads).
-- CategoryAuditLog.facebook_post_id and RegressionModel/SimulationResult.model_id
-- are deliberately un-FK'd integer references — see the per-table comments
-- above for why each one needs to survive independently of its target row.
