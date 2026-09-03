# ERD Narrative (verified) — 2026-09-03

Standalone ERD narrative, cross-checked directly against `prisma/schema.prisma`
(not just `docs/erd_schema.sql`) line-by-line on 2026-09-03. All 10 enums, all
21 models, and all 7 FK relationships confirmed to match. Paired with two
rendered artifacts in this folder:

- `pcm_dss_erd_diagram.mmd` (Mermaid source) / `pcm_dss_erd_preview.png` (rendered) — the ERD
- `pcm_dss_architecture_diagram.py` (mingrammer `diagrams` source) / `pc_merchandise_dss_-_system_architecture.png` (rendered) — the system architecture diagram

This supersedes the ERD portion (§2) of `ERD_and_System_Architecture_Narrative_2026-09-02.md`
and folds in the update memo `ERD_and_System_Architecture_Narrative_2026-09-03.md`
(account lockout / SecurityEventLog). Read this one on its own — it's complete,
not a diff.

---

## 1. Entity clusters

### 1.1 Core: identity, uploads, audit (2 audit trails)

- **User** — root entity. `role` enum: `MARKETING_MANAGER` / `MARKETING_TEAM` /
  `BUSINESS_OWNER`. Soft-delete via `is_active` (never hard-deleted — would
  break `UploadLog.user_id`'s RESTRICT FK for any user with upload history).
  Carries 6 security-hardening columns added 2026-09-03: `failed_login_attempts`,
  `last_failed_login_at` (SR-A6 lockout counter/window), `is_locked`,
  `locked_at` (manual gate, not time-based auto-release), `must_change_password`,
  `temp_password_expires_at` (SR-A8 forced password change, 24h temp-credential
  expiry).
- **UploadLog** — 1 User → many (`user_id`, RESTRICT). One row per CSV upload
  attempt across all 7 upload types. Includes `records_rejected`/
  `rejected_reasons` (FR-04/FR-07 per-row validation failures — never
  written as their own rows, no child table).
- **CategoryAuditLog** — 1 User → many (`user_id`, RESTRICT). FR-24 trail:
  every human categorisation decision (`PROPOSE`/`ACCEPT`/`REJECT`/
  `OVERRIDE`/`BULK_ACCEPT`/`BATCH_CONFIRM`). `facebook_post_id` is
  deliberately **not** an FK — must survive independently of the post row.
- **SecurityEventLog** — 1 User → many, **nullable**, `ON DELETE SET NULL`
  (one of three SET NULL FKs in this schema, alongside `FacebookPost`'s two
  category-assignment FKs below — the rest are RESTRICT). SR-L1 trail: every
  auth/account-admin event (12-value `SecurityEventType` enum — sign-in
  success/failure, sign-out, lock/unlock, password change/reset, account
  create/deactivate/reactivate, role change, authorization denial). Nullable
  because a failed sign-in against an unknown email has no User row to
  attach to — `actor_email` is the display fallback. `target_user_id` is
  deliberately not an FK either (same reasoning as `CategoryAuditLog`'s: an
  admin-on-another-user action must outlive the target row).
- **InterCoderReliability** — standalone, no FK. One-time offline Cohen's
  kappa snapshot between the two external ground-truth coders.

### 1.2 Content: organic posts + ads

- **FacebookPost** — most-connected entity. Two FKs to User:
  `category_final_assigned_by_id` (who finalized) and `category_pending_by`
  (who proposed, MARKETING_TEAM). Categorisation lives in 3 `CategoryLabel`
  enum columns (`category_keyword`, `category_llm`, `category_final`) — no
  FK to Category/Keyword (those are ALG-04-lexicon-only, see §1.3).
- **Ad** — flat, no FK. Unique on `(ad_id, reporting_starts)`. No category FK
  — categorisation applies to organic content only, never paid ads.

### 1.3 ALG-04 keyword lexicon (legacy-adjacent, still live)

- **Category** (1) → **Keyword** (many) via `category_id`, RESTRICT. Simple
  lexicon table used only by the ALG-04 keyword classifier — separate from
  the `CategoryLabel` enum FacebookPost actually reads.
- **LlmClassificationRun** — standalone. `post_ids` is an int array (batch
  reference, not relational).

### 1.4 Statistical audit trails

- **CorrelationAssumptionRun** — standalone. One row per S7 Analysis page
  load (Shapiro-Wilk-driven Pearson/Spearman method selection).
- **RegressionRun** — standalone. One row per FR-31 specification
  (`PRIMARY`/`SECONDARY`) per page load — the largest table in the schema
  (flat coefficient/diagnostic columns, ~50 fields).

### 1.5 Page-level daily metrics + demographic snapshots

All independent of each other and of everything else — separate CSV
sources sharing only a "daily snapshot" or "distribution snapshot" shape:
**PageMetricDaily** (6 CSVs upsert here by `date`), **FollowerHistory**
(daily count/delta), **PageViewers** (distinct from `PageMetricDaily.viewers`
despite the name — different source file, different values on overlapping
dates), **FollowerGender** / **FollowerTerritory** (distribution snapshots,
unique by label), **FollowerAgeGender** (6 fixed age brackets), and
**FollowerAudienceRank** (top-10-of-many ranked snapshot, `category='city'`
only today, upsert prunes rows that fall out of the top 10).

### 1.6 Cut-feature legacy tables (mark as legacy in the diagram)

- **RegressionModel**, **SimulationResult** — the old predictive model
  (messaging ~ reach + spend), unrelated to and not to be confused with
  FR-31's `RegressionRun` (explanatory model). `SimulationResult.user_id`
  FK to User is still a live DB constraint even though the feature itself
  is unwired from the current build — gray out or label "legacy/unwired,"
  don't drop from the diagram.

---

## 2. Cardinality cheat-sheet (7 FKs total)

| From | To | Cardinality | FK column | On delete |
|---|---|---|---|---|
| User | UploadLog | 1 → many | `UploadLog.user_id` | RESTRICT |
| User | CategoryAuditLog | 1 → many | `CategoryAuditLog.user_id` | RESTRICT |
| User | SecurityEventLog | 1 → many (nullable) | `SecurityEventLog.user_id` | **SET NULL** |
| User | FacebookPost (finalizer) | 1 → many (nullable) | `FacebookPost.category_final_assigned_by_id` | SET NULL |
| User | FacebookPost (proposer) | 1 → many (nullable) | `FacebookPost.category_pending_by` | SET NULL |
| User | SimulationResult (legacy) | 1 → many | `SimulationResult.user_id` | RESTRICT |
| Category | Keyword | 1 → many | `Keyword.category_id` | RESTRICT |

Everything else (13 tables) is standalone — no FK in or out. Cluster them
visually by §1's groupings rather than drawing false relationship lines.

## 3. Diagram layout note

`SecurityEventLog`, `FacebookPost.category_final_assigned_by_id`, and
`FacebookPost.category_pending_by` are the three SET NULL FKs among the
User-rooted relationships (the rest are RESTRICT) — worth a distinct arrow
style (dashed, or a different color) so none of the three reads as identical
to the RESTRICT FKs.
