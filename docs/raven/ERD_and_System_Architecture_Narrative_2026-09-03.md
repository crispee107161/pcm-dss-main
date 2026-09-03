# ERD + System Architecture Narrative — para sa diagram (v2)

Para kay Raven. Update sa `docs/raven/ERD_and_System_Architecture_Narrative_2026-09-02.md`
(supersedes yun — huwag na gamitin yung old version). Bagong laman: account
lockout / forced password change / security audit logging (SR-A6, SR-A8,
SR-L1), landed via commit `3225df2` ngayong 2026-09-03. Source of truth pareho
pa rin: `docs/erd_schema.sql` (already synced, kasama na itong commit) at
`CLAUDE.md`.

**Kung ito lang ang binago**: 1 bagong table (`SecurityEventLog`), 1 bagong
enum (`SecurityEventType`), 6 bagong column sa `User`, at 1 bagong FK
(`SecurityEventLog.user_id → User`). Walang nabago sa dating 6.2 §2.1-2.6
clusters o sa dating 6 FK — dinagdag lang ang mga ito.

---

## 1. System Architecture Narrative — dagdag

Layer overview (§1.1-1.3 sa old doc) hindi nagbago. Dagdag na flow lang:

### 1.7 Auth / lockout flow (bago)

```
Browser (sign-in form)
  → lib/auth.ts authorize() — NextAuth v5 credentials provider
      1. lookup User by email
      2. check is_locked → reject kung true (SR-A6)
      3. check must_change_password + temp_password_expires_at
         (lib/auth-lockout.ts: isTempPasswordExpired()) → reject kung expired (SR-A8)
      4. verify password_hash
      5. success → reset failed_login_attempts, update last-login;
         failure → increment failed_login_attempts (lib/auth-lockout.ts:
         isWithinLockoutWindow() decides kung dagdag sa esisting run o
         fresh start), auto-lock (is_locked=true, locked_at=now) pag
         umabot sa threshold
      6. bawat resulta (success/failure/lockout) → logSecurityEvent()
         (lib/security-log.ts) → SecurityEventLog row
  → session JWT carries mustChangePassword claim
  → middleware.ts + lib/auth-guard.ts requireUsableSession() force-redirect
    papuntang change-password page hanggang ma-clear ang flag (may gap sa
    coverage ng plain middleware: /api/reports/*/csv|pdf at /print/*/report
    ay dumadaan dapat sa requireUsableSession() hindi lang sa auth())
```

Account unlock (Owner-only admin action, hindi part ng sign-in flow):
`actions/admin.ts` → clears `is_locked`/`locked_at` → `logSecurityEvent()`
(ACCOUNT_UNLOCKED). May emergency fallback din: `scripts/emergency-unlock.ts`
(direct DB script, hindi dumadaan sa app — para lang sa case na naka-lock
lahat ng admin accounts).

### 1.8 Stack summary — dagdag

- Idagdag sa listahan: **SR-L1 centralized security audit logging**
  (`lib/security-log.ts` — single funnel, lahat ng auth/account-admin
  events dumadaan dito, hindi direktang `prisma.securityEventLog.create()`)

---

## 2. ERD Narrative — dagdag

### 2.1 Core cluster — updated na User columns

`User` may 6 bagong column ngayon (lahat added sa `3225df2`), lockout at
forced-password-change state:

- `failed_login_attempts` (int, default 0) — consecutive-failure counter,
  SR-A6
- `last_failed_login_at` (nullable timestamp) — ginagamit para malaman kung
  nasa loob pa ng lockout window ang huling failure (bago mag-increment vs.
  mag-restart ng counter)
- `is_locked` (bool, default false) — manual gate, hindi auto-expire sa
  time; kailangan ng admin action o emergency script para ma-clear
- `locked_at` (nullable timestamp)
- `must_change_password` (bool, default false) — SR-A8, gate sa lahat ng
  `/dashboard` route pati report export/print routes
- `temp_password_expires_at` (nullable timestamp) — 24h expiry ng
  admin-issued temp password, independent sa must_change_password flag mismo

### 2.9 Security audit trail (bagong cluster)

- **SecurityEventLog** — bagong table, kahanay ng CategoryAuditLog bilang
  "pangalawang audit trail." Magkaiba ang dalawa: CategoryAuditLog = mga
  desisyon sa content categorisation (FR-24); SecurityEventLog = mga
  auth/account-admin event (SR-L1) — sign-in success/failure, sign-out,
  lock/unlock, password change/reset, account create/deactivate/reactivate,
  role change, authorization denial.
  - `user_id` FK → User, **ON DELETE SET NULL** (hindi RESTRICT tulad ng
    UploadLog/CategoryAuditLog) — dahil nullable talaga ang column: isang
    failed sign-in laban sa hindi existing na email ay walang User row na
    ikakabit. `actor_email` ang display fallback sa ganitong case.
  - `target_user_id` — hindi FK (deliberate, tulad ng
    CategoryAuditLog.facebook_post_id) — para sa mga admin action tulad ng
    "User A locked User B's account," ang row dapat mabuhay kahit matanggal
    si User B.
  - `event_type` enum (`SecurityEventType`) — 12 values, listahan nasa
    `docs/erd_schema.sql` lines 87-100.

### 2.7 Cardinality cheat-sheet — dagdag na row

| From | To | Cardinality | FK column |
|---|---|---|---|
| User | SecurityEventLog | 1 → many (nullable) | `SecurityEventLog.user_id` (ON DELETE SET NULL — iba sa ibang User FKs na RESTRICT) |

7 FK relationships na ngayon (dating 6), pareho pa rin ang dami ng
standalone clusters — SecurityEventLog lang ang bagong non-standalone table.

---

## 3. Diagram notes

- Sa ERD proper: idagdag ang `SecurityEventLog` box malapit sa `User` at
  `CategoryAuditLog` (parehong "audit trail" visual region/color), na may
  dashed o iba't ibang linestyle sa FK arrow papunta sa User para
  makita agad na ON DELETE SET NULL ito (iba sa RESTRICT ng UploadLog/
  CategoryAuditLog) — importante ito dahil ibang delete-behavior semantics.
- Sa architecture diagram: idagdag ang §1.7 flow bilang ika-4 na labeled
  arrow (kasabay ng existing na read/upload/AI-categorisation flows) —
  "auth/lockout flow," mula Browser papuntang `lib/auth.ts` papuntang
  `SecurityEventLog`.
