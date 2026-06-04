# Security Fixes Log

This file tracks every security fix applied to the codebase. Update it whenever a security-related change is made.

---

## 2026-05-13 — Initial security audit fixes

Source: full-project code review via `/code-review` skill.

---

### FIX-001 — `sendChatMessage` missing authentication check

**Severity:** CRITICAL  
**File:** `actions/chat.ts`  
**Status:** Fixed

**Problem:** `sendChatMessage` had no `auth()` check. Any unauthenticated request to the Server Action endpoint could query all ads, regression models, follower history, and page metrics, and receive a natural-language AI summary of the full business dataset. Also consumed Groq API quota.

**Fix:** Added `const session = await auth(); if (!session?.user) return 'Unauthorized'` as the first two lines of the function.

**Remaining risk:** No per-role restriction — all three roles can use the AI chat. This is intentional (the ChatBot is available in all dashboards). If you want to restrict to specific roles, add a role check after the auth check.

---

### FIX-002 — Default `password123` seed accounts

**Severity:** CRITICAL  
**File:** `prisma/seed.ts`  
**Status:** Fixed

**Problem:** All three user accounts (MARKETING_MANAGER, SALES_DIRECTOR, BUSINESS_OWNER) were seeded with the hardcoded password `password123`. If the seed was ever run against production, those accounts exist with trivially guessable credentials.

**Fix:** Removed hardcoded passwords. Seed now reads from environment variables:
- `SEED_MARKETING_PASSWORD`
- `SEED_SALES_PASSWORD`
- `SEED_OWNER_PASSWORD`

Throws at startup if any are missing or shorter than 8 characters.

**Action required:** If the seed was ever run against the production Neon database, log into the admin panel and change the passwords for `marketing@pcmerchandise.com`, `sales@pcmerchandise.com`, and `owner@pcmerchandise.com` immediately.

---

### FIX-003 — `proxy.ts` was dead code (middleware never ran)

**Severity:** MEDIUM (defense-in-depth gap)  
**Files:** `proxy.ts` (deleted), `middleware.ts` (created)  
**Status:** Fixed

**Problem:** Next.js only loads edge middleware from a file named `middleware.ts` at the project root. The file was named `proxy.ts` and exported a function named `proxy` — neither matched Next.js conventions. The route protection logic (unauthenticated redirect, cross-role access blocking) was never running. The per-layout `auth()` checks were the only protection.

**Fix:** Created `middleware.ts` with the same logic. Also fixed the `any` type on the JWT token — replaced with `type JwtToken = { role: Role; sub: string } | null`. Deleted `proxy.ts`.

---

### FIX-004 — No file size limit on CSV uploads

**Severity:** HIGH  
**File:** `actions/upload.ts`  
**Status:** Fixed

**Problem:** There was no upper bound on uploaded file size. The entire file was loaded into memory as an `ArrayBuffer` then copied to a `Buffer` (~2x the file size in RAM). A large file could cause an OOM crash or Vercel function timeout.

**Fix:** Added a 10 MB guard immediately after the zero-size check:
```typescript
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10 MB
if (file.size > MAX_FILE_SIZE) {
  return { status: 'FAILED', ..., error_message: 'File too large. Maximum allowed size is 10 MB.' }
}
```

**If you need to raise the limit:** Change `MAX_FILE_SIZE` in `actions/upload.ts`. Also check Vercel's function body size limits (default 4.5 MB for serverless, configurable).

---

### FIX-005 — `addKeyword` missing input validation

**Severity:** MEDIUM  
**File:** `actions/keywords.ts`  
**Status:** Fixed

**Problem:** `addKeyword` only checked that `word` was non-empty and `categoryId` was a number. No length cap (allowing arbitrarily long strings) and no verification that the `categoryId` actually exists in the database.

**Fix:** Added:
1. `word.length > 100` guard — throws `'Keyword must be 100 characters or fewer'`
2. `prisma.category.findUnique({ where: { id: categoryId } })` check — throws `'Invalid category'` if not found

---

### FIX-006 — Inconsistent password minimum length

**Severity:** MEDIUM  
**Files:** `actions/admin.ts`, `actions/profile.ts`  
**Status:** Fixed

**Problem:** `actions/profile.ts` (self-service password change) enforced a minimum of 8 characters. `actions/admin.ts` (`createUser` and `resetPassword`) enforced only 6. An admin could set a weaker password for another user than the user could set for themselves.

**Fix:** Changed both occurrences in `actions/admin.ts` from `password.length < 6` to `password.length < 8`. Updated error messages to match. Minimum is now consistently 8 characters across all password-setting flows.

---

### FIX-007 — Added `.env.example`

**Severity:** LOW (developer hygiene)  
**File:** `.env.example` (new)  
**Status:** Fixed

**Problem:** No `.env.example` existed. New developers had no documented list of required environment variables.

**Fix:** Created `.env.example` with placeholder values for `DATABASE_URL`, `AUTH_SECRET`, `GROQ_API_KEY`, and the three `SEED_*_PASSWORD` variables.

---

---

## 2026-06-05 — Follow-up audit fixes

Source: second `/code-review` pass via `code-review-analyst` agent.

---

### FIX-008 — `generateAIInsights` missing authentication check

**Severity:** CRITICAL
**File:** `actions/ai-insights.ts`
**Status:** Fixed

**Problem:** `generateAIInsights` had no `auth()` check, identical in class to FIX-001. Any unauthenticated caller could hit the Server Action endpoint and consume Groq API quota.

**Fix:** Added `const session = await auth(); if (!session?.user) return 'Unauthorized'` at the top of the function. Also added the `auth` import.

---

### FIX-009 — `sendChatMessage` accepts unbounded `userMessage` and unbounded `history`

**Severity:** MEDIUM
**File:** `actions/chat.ts`
**Status:** Fixed

**Problem:** No cap on `userMessage` length (token-stuffing / cost abuse). No cap on `history` length (token inflation on every request).

**Fix:**
- Added `if (userMessage.length > 2000) return 'Message too long (max 2000 characters).'`
- Trim history to last 20 turns before building the Groq messages array: `const trimmedHistory = history.slice(-20)`

---

### FIX-010 — `addKeywordsBulk` missing item count cap and per-word validation

**Severity:** MEDIUM
**File:** `actions/keywords.ts`
**Status:** Fixed

**Problem:** Unlike `addKeyword` (which validates word length ≤ 100 and category existence), `addKeywordsBulk` had no limit on the number of items or on individual word lengths.

**Fix:**
- Added `if (items.length > 100)` guard
- Added per-word sanitization: trims whitespace, filters words not between 2 and 100 characters

---

### FIX-011 — Raw `error.message` returned to client in `uploadCSV`

**Severity:** LOW
**File:** `actions/upload.ts`
**Status:** Fixed

**Problem:** Prisma and CSV parse errors were returned verbatim to the browser. These can leak internal schema column names or file structure details.

**Fix:** Internal error message is logged to `UploadLog.error_message` (server-side only). Client receives a generic `'Upload failed. Please check your file and try again.'` string.

---

### FIX-012 — `seed.ts` upsert overwrites passwords and roles on re-run

**Severity:** MEDIUM
**File:** `prisma/seed.ts`
**Status:** Fixed

**Problem:** The `upsert` `update` clause silently overwrote `password_hash` and `role` every time the seed ran, which could clobber admin-changed passwords if the seed ever ran against production.

**Fix:** Changed to create-if-absent: `findUnique` check first; only calls `create` when the row doesn't exist. Existing rows are untouched.

---

## Known remaining issues (not yet fixed)

### OPEN-001 — No rate limiting on any endpoint

**Severity:** MEDIUM  
**Affects:** `actions/auth.ts` (login), `actions/chat.ts` (AI chat), `actions/upload.ts` (CSV upload)

**Problem:** Login has no brute-force protection. An attacker can attempt unlimited passwords against a known email address. AI chat and upload endpoints have no quota protection.

**Recommended fix:** Add rate limiting using `@upstash/ratelimit` with an Upstash Redis instance (free tier available). Apply to:
- Login: max 10 attempts / IP / minute
- Chat: max 30 requests / user / minute
- Upload: max 20 uploads / user / hour

This requires adding `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` to `.env` and `.env.example`.

---

### OPEN-002 — Rotate production credentials

**Severity:** CRITICAL (one-time manual action)

The `.env` file on the developer machine contains live production credentials. Even though `.gitignore` prevents committing them, they have been exposed in plaintext on a developer workstation.

**Actions required:**
1. **Rotate Neon database password** — Neon console > Settings > Reset password
2. **Rotate `AUTH_SECRET`** — generate new: `openssl rand -base64 32` — update in Vercel env vars and local `.env`
3. **Rotate `GROQ_API_KEY`** — console.groq.com > API Keys > delete old, create new
4. After rotation, update Vercel environment variables for all three

---

### OPEN-003 — Default seed passwords may exist in production DB

**Severity:** CRITICAL (one-time manual action)

If `prisma db seed` was ever run against the production database, accounts with `password123` exist.

**Action required:** Log into the admin panel (`/dashboard/owner/administration`) and reset passwords for all three seed accounts, or use Prisma Studio to verify and update `password_hash` directly.
