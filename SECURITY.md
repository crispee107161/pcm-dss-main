# Security Assessment — PC Merchandise Decision Support System

**Assessment date:** 2026-07-27
**System:** PCM-DSS (Next.js 16 / React 19 / TypeScript / Prisma / Neon PostgreSQL)
**Scope:** Full application — authentication, authorization, data handling, file upload, AI integration, dependencies, configuration
**Methodology:** Manual source review against the OWASP Top 10 (2021), cross-referenced with automated dependency scanning (`npm audit`) and the project's own prior fix history (`.claude/SECURITY_FIXES.md`)

This document is written to be handed in as part of a security audit assignment. It describes what was checked, what was found, what was fixed, and what residual risk remains and why.

---

## 1. System Overview

PCM-DSS is a role-gated internal dashboard used to analyze Facebook ad and page performance data for a PC merchandise business. Three fixed roles — `BUSINESS_OWNER`, `MARKETING_MANAGER`, `SALES_DIRECTOR` — each see only their own dashboard. Users upload CSV exports, the system runs statistical analysis (correlation, regression, forecasting) server-side, and an AI assistant (Groq API) answers natural-language questions about the data.

Because the system holds internal business data (ad spend, sales figures, follower counts) and login credentials for a small, fixed set of staff, the realistic threat model is: **an unauthenticated outsider trying to get in**, and **a legitimate lower-privilege user trying to see data outside their role**. There is no public user registration and no payment processing, so several OWASP categories (e.g., broken object-level authorization across thousands of tenants) don't meaningfully apply — the review focuses on what's actually exposed.

---

## 2. Methodology

1. Read authentication/session logic (`lib/auth.ts`, `middleware.ts`, `actions/auth.ts`).
2. Read every Server Action under `actions/` for missing auth checks, missing role checks, and unvalidated input.
3. Searched the entire codebase for raw SQL (`$queryRaw`/`$executeRaw`), `dangerouslySetInnerHTML`, `eval`, and other classic injection/XSS sinks.
4. Reviewed file upload handling (`actions/upload.ts`, `lib/csv/`) for path traversal, unbounded size, and content-type trust issues.
5. Reviewed `public/` for anything served unauthenticated that shouldn't be.
6. Checked `.env` / `.env.example` / `.gitignore` for secret handling and confirmed nothing sensitive is tracked in version control.
7. Ran `npm audit` against the full dependency tree and manually triaged each finding by whether the vulnerable package actually runs in production versus dev tooling only.
8. Compared findings against the project's own prior audit log to confirm previously claimed fixes are still present in the code, not just documented.

---

## 3. Findings and Fixes

### 3.1 Broken Access Control — Password hashes exposed to the browser (High) — **Fixed**

**Location:** `app/dashboard/owner/administration/page.tsx`

**Issue:** The admin user-management page fetched users with `prisma.user.findMany({ orderBy: { created_at: 'asc' } })` — no `select` clause. Prisma returns every column by default, including `password_hash`. That full object array was passed as a prop into a `'use client'` component. TypeScript's compile-time `User` interface in the client component only *declared* four fields, but TypeScript types do not strip fields at runtime — the actual JavaScript objects, bcrypt hashes included, were serialized into the React Server Components payload sent to the browser. Anyone viewing the Network tab on that page could read every user's password hash and run it through an offline cracker, entirely bypassing the login rate limiter.

**Fix:** Added an explicit `select` clause restricting the query to `id, email, role, created_at`. Password hashes never leave the database query, let alone the server.

```ts
prisma.user.findMany({
  orderBy: { created_at: 'asc' },
  select: { id: true, email: true, role: true, created_at: true },
})
```

**Lesson for the write-up:** this is a textbook example of why relying on a TypeScript interface to "narrow" a value is not a security control — TypeScript erases at compile time and has zero effect on what's actually serialized over the wire. The narrowing has to happen in the query itself.

---

### 3.2 Security Misconfiguration — Unexplained executable in public web root (High) — **Fixed**

**Location:** `public/kernel.bin`

**Issue:** A ~1 MB file with genuine ELF executable magic bytes (`7f 45 4c 46`) was sitting inside `public/`, which Next.js serves verbatim and unauthenticated at the site root. It was not referenced anywhere in the application code (no import, no `fetch`, no `<script src>`). Regardless of how it got there, a compiled binary silently downloadable from a business dashboard's public folder is both unnecessary attack surface and the kind of thing that immediately draws suspicion in any audit.

**Fix:** Confirmed with the project owner that it was not an intentional asset, then deleted it.

---

### 3.3 Identification and Authentication Failures — Rate limiting bypassable via IP spoofing (Medium) — **Fixed**

**Location:** `actions/auth.ts`, `lib/rate-limit.ts`

**Issue:** Login brute-force protection was keyed on `x-forwarded-for` + email (10 attempts / 10 minutes). This header is trustworthy on Vercel's edge network (which sets it before the request reaches the app) but is trivially attacker-controlled on any other hosting setup with no reverse proxy in front. An attacker could rotate the header value on every request and get a fresh rate-limit bucket every time, fully defeating the throttle.

**Fix:** Added a second, independent rate-limit bucket keyed on **email only** (no IP), capped at 30 attempts / 10 minutes. Even if the IP-based bucket is bypassed via header spoofing, the email-only bucket still throttles brute-force attempts against any single account. This is defense-in-depth without requiring new infrastructure (e.g., Redis) for what is currently a low-traffic internal tool.

---

### 3.4 Vulnerable and Outdated Components — Critical auth library CVEs (Critical) — **Fixed**

**Location:** `package.json` (`next-auth`)

**Issue:** `npm audit` (run as part of this assessment) surfaced that `next-auth@5.0.0-beta.30` depends on a vulnerable version of `@auth/core` with three published advisories:
- Uncaught exception thrown by `getToken()` on malformed `Authorization` headers.
- Email address normalization happens *before* Unicode normalization, allowing a homoglyph character to bypass equality checks on the email — a potential account-boundary bypass.
- OAuth `state`/`nonce`/PKCE cookies were not cryptographically bound to the provider that issued them.

This directly affects the authentication path this application relies on for every login.

**Fix:** Upgraded to `next-auth@5.0.0-beta.32` (the patched release) and pinned the exact version (removed the `^` range) so a future `npm install` can't silently pull a different, unaudited beta. Re-ran `npm audit` to confirm all three findings are resolved.

---

### 3.5 Vulnerable and Outdated Components — Remaining `npm audit` findings (Low, accepted) — **Triaged, not fixed**

After the `next-auth` upgrade, `npm audit` reports 8 remaining findings (1 low, 4 moderate, 3 high):

| Package | Advisory | Why it's low real-world risk here |
|---|---|---|
| `find-my-way` (via `@prisma/dev` → `prisma`) | HTTP/2 DDoS | Only used by Prisma's local dev CLI, never runs in the deployed app |
| `@hono/node-server` (via `@modelcontextprotocol/sdk` → `shadcn`) | Path traversal on Windows | Only used by the `shadcn` CLI tool during development, not shipped or served |
| `esbuild` | Arbitrary file read via dev server | Only active when running a local dev server, not in production builds |
| `valibot` | `flatten()` throws on inherited property names | Transitive dev dependency, not exercised by application code |

All four sit in **developer tooling**, not code that runs when the deployed app serves a request. Fixing the `shadcn`/`@hono` chain requires `npm audit fix --force`, which downgrades `shadcn` to a breaking major version for no production security benefit. Recommendation: leave as-is, re-check after the next routine `npm install`, and mention in a write-up that dev-only vulnerable dependencies were identified and consciously deprioritized rather than overlooked.

---

### 3.6 Server-Side Request Forgery / Rate Limiting — PDF export route (Medium) — **Fixed**

**Location:** `app/api/reports/[role]/pdf/route.ts`, `lib/pdf/browser.ts`

**Issue:** The PDF export route launches a headless Chromium instance server-side and navigates it to `${origin}/print/${role}/report?pdf=1`, forwarding the request's `Cookie` header so the print page renders as the authenticated user. Three problems:
1. `origin` was derived from `new URL(request.url).origin`, which is built from the incoming `Host`/`x-forwarded-host` header. An attacker who can influence that header could make server-side Chromium navigate to an arbitrary origin while still carrying the session cookie — a Host-header-driven SSRF/cookie-forwarding path. Impact was bounded (the path segment itself is validated against a fixed role enum, and only the attacker's own cookie would be exposed), but the fix removes the class entirely rather than relying on that bound.
2. The route had no rate limit, despite being by far the most expensive endpoint in the app (one full Chromium process launched per request) — trivially exhaustible by any authenticated user, both a DoS and a hosting-cost vector.
3. `launchBrowser()` was not wrapped in error handling; a launch failure (missing binary, OOM, cold-start failure in the serverless environment) would escape unlogged as a bare 500.

**Fix:**
- Origin now resolves from `NEXT_PUBLIC_APP_URL` (or `VERCEL_PROJECT_PRODUCTION_URL` on Vercel) first, falling back to the request origin only when neither is set (local dev). Documented in `.env.example`.
- Added a dedicated rate-limit bucket (`pdf-export:${userId}`, 5 requests / 60s) via the existing `lib/rate-limit.ts`, independent from the other action-level buckets.
- `launchBrowser()` and the render/`page.pdf()` path are now both wrapped in try/catch with server-side logging, returning a generic 503/500 to the client instead of an unhandled exception.
- Added `export const runtime = 'nodejs'` and `export const maxDuration = 60`, plus an explicit 30s timeout on `page.goto`, so a hung print page fails fast instead of silently consuming the whole function budget.

Note: Section 5's "no `child_process` usage anywhere in application code" no longer holds — Puppeteer spawns a Chromium child process by design for this feature. That line has been corrected below rather than left inaccurate.

---

## 4. Prior Fixes Verified Still In Place

The codebase includes its own audit trail (`.claude/SECURITY_FIXES.md`) documenting two earlier review passes. As part of this assessment, each claimed fix was independently re-checked against the current source rather than taken on faith:

| Fix | Verified |
|---|---|
| Auth check added to `sendChatMessage` (`actions/chat.ts`) | ✅ Confirmed present |
| Auth check added to `generateAIInsights` (`actions/ai-insights.ts`) | ✅ Confirmed present |
| Hardcoded `password123` seed removed, replaced with required env vars (`prisma/seed.ts`) | ✅ Confirmed present |
| `middleware.ts` correctly named and wired (was dead-code `proxy.ts`) | ✅ Confirmed present and functioning — redirects unauthenticated users and blocks cross-role dashboard access |
| 10 MB upload size cap (`actions/upload.ts`) | ✅ Confirmed present |
| Keyword length/category validation (`actions/keywords.ts`) | ✅ Confirmed present |
| Consistent 8-character password minimum (`actions/admin.ts`, `actions/profile.ts`) | ✅ Confirmed present |
| `.env.example` documented | ✅ Confirmed present and current |
| Chat message length cap + history trimming (`actions/chat.ts`) | ✅ Confirmed present |
| Bulk keyword item count + per-word validation (`actions/keywords.ts`) | ✅ Confirmed present |
| Generic error message returned to client on upload failure, raw error kept server-side only (`actions/upload.ts`) | ✅ Confirmed present |
| Seed script no longer overwrites existing password/role on re-run (`prisma/seed.ts`) | ✅ Confirmed present |

The previously logged `OPEN-001` ("no rate limiting on any endpoint") is now stale — `lib/rate-limit.ts` exists and is actively applied in `actions/auth.ts`, `actions/chat.ts`, `actions/ai-insights.ts`, and `actions/keywords.ts`. This document supersedes that entry.

---

## 5. What's Working Correctly (by OWASP category)

- **A01 Broken Access Control** — Role checks are enforced at three independent layers: edge `middleware.ts` (redirects based on JWT role claim before the request reaches any route), each dashboard's server-rendered `page.tsx`/`layout.tsx` (`auth()` + explicit role comparison + `redirect()`), and every mutating Server Action itself (e.g., `requireOwner()` in `actions/admin.ts`, explicit role checks in `actions/upload.ts` and `actions/keywords.ts`). Because the third layer exists, a lower-privileged role cannot reach owner-only functionality even by calling the Server Action directly and bypassing the UI/middleware entirely — each action independently re-verifies the caller's role server-side.
- **A02 Cryptographic Failures** — Passwords are hashed with `bcryptjs` at cost factors 10–12, verified with `bcrypt.compare`. No plaintext password comparison anywhere in the codebase.
- **A03 Injection** — All database access goes through Prisma's typed query builder. A full-codebase search for `$queryRaw`/`$executeRaw` returned zero matches — no string-concatenated SQL exists. A search for `dangerouslySetInnerHTML` also returned zero matches — no XSS sink where user-controlled data could be rendered as raw HTML. No `eval` or `new Function` usage anywhere in application code. The one exception is the PDF export route (Section 3.6), which deliberately spawns a Chromium child process via Puppeteer to render reports — a reviewed, rate-limited, and origin-pinned exception, not an oversight.
- **A04 Insecure Design** — The AI chat and insights features explicitly wrap untrusted, database-sourced text (ad names, post captions from uploaded CSVs) with "treat this as data, not instructions" framing before sending it to the Groq API — a deliberate mitigation against prompt injection via uploaded file content, which is a more advanced consideration than most systems this size bother with.
- **A05 Security Misconfiguration** — `next.config.ts` sets a Content-Security-Policy, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, HSTS, `Referrer-Policy`, and `Permissions-Policy`.
- **A07 Identification and Authentication Failures** — Session `maxAge` is reduced to 8 hours (rather than NextAuth's 30-day default) given the sensitivity of ad-spend and sales data. Login brute-force throttling exists (Section 3.3). Self-role-modification is blocked — an owner cannot demote, delete, or reset their own account via the admin panel, preventing accidental lockout.
- **A09 Security Logging and Monitoring Failures** — Upload failures are logged server-side with full error detail (`UploadLog.error_message`) while the client only receives a generic message, giving operators debuggability without leaking internals to end users.
- **Secrets management** — `.env` is correctly excluded via `.gitignore` and was never committed to version control (confirmed via `git ls-files`). `.env.example` documents every required variable with placeholder values.

---

## 6. Residual Risks and Recommendations

| # | Item | Severity | Status | Notes |
|---|---|---|---|---|
| 1 | Live Neon DB password, `AUTH_SECRET`, and seed passwords sit in plaintext in the developer's local `.env` | Medium | **Open — action needed by project owner, not a code fix** | Not committed to git, but has been read/handled outside the app process. Recommend rotating the Neon password, `AUTH_SECRET`, and `GROQ_API_KEY`, then updating the values in the hosting provider's environment variable settings. |
| 2 | Seed accounts may still hold the placeholder `password123` if the seed script was ever run against production before `SEED_*_PASSWORD` env vars existed | Medium | **Open — action needed by project owner** | Log into `/dashboard/owner/administration` and reset each seeded account's password if there's any doubt. |
| 3 | In-memory rate limiter (`lib/rate-limit.ts`) does not share state across multiple server instances | Low | **Accepted for current scale** | Fine for a single-instance deployment; if this app scales to multiple concurrent instances, migrate to a shared store (Redis/Upstash) as already noted in the code's own comments. |
| 4 | `next-auth` remains on a pre-1.0 beta release line | Low | **Accepted, monitored** | Now on the patched beta and pinned exactly. Auth.js v5 has not reached stable; worth revisiting when it does. |
| 5 | Dev-tooling-only `npm audit` findings (Section 3.5) | Low | **Accepted** | Do not affect the deployed application. |

Items 1 and 2 are one-time manual actions for the project owner (credential rotation), not code changes, and were intentionally left out of this review's code fixes per instruction — they should still be completed before this system is considered production-ready.

---

## 7. Overall Assessment

For a system of this scope — an internal, role-gated analytics dashboard with a fixed, small user base — the security posture is **solid and above what's typical for a student-built system**. The fundamentals that are hardest to retrofit later were done correctly from early on: real password hashing, authorization enforced redundantly at the action level rather than trusted to the UI, no injection or XSS sinks anywhere in the codebase, and thoughtful mitigations for less obvious risks like AI prompt injection.

The issues found during this assessment were concrete and fixable, and all of the code-level ones have been fixed as part of this review: an accidental password-hash leak via a missing Prisma `select`, a stray unauthenticated executable in the public folder, a rate-limiter bypass path, and — found only because dependency scanning was run rather than skipped — a live critical vulnerability in the authentication library itself. That last one is worth highlighting: manual code review alone would not have caught it, which is exactly why `npm audit` (or an equivalent SCA tool) belongs in any real security review process, not just a manual read-through.

What remains open is credential rotation — a manual, one-time operational step rather than a code defect — and a small set of dev-tooling-only dependency advisories that don't reach the production runtime. With credential rotation completed, this system would reasonably be called production-ready for its actual scale and threat model.