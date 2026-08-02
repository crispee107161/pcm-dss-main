# Credential Rotation Checklist

**Why**: `SECURITY.md` (Section 6, items 1–2) flags that the Neon DB password, `AUTH_SECRET`, `GROQ_API_KEY`, and the three seed-account passwords have sat in plaintext in `.env` and been read outside the app process — including, concretely, during a Claude Code session on 2026-08-02 where the seed passwords were printed to answer "where are the login creds." That's no longer a hypothetical exposure; treat it as one that already happened.

Not urgent-emergency (this is a small internal tool with no public exposure), but each item below should be done before calling the system production-ready. Check items off as completed — don't do them all in one sitting if that's disruptive; each is independent.

---

## 1. Rotate the three dashboard account passwords

These are the accounts a person actually logs in with (`marketing@pcmerchandise.com`, `sales@pcmerchandise.com`, `owner@pcmerchandise.com`).

- [ ] Log in as `BUSINESS_OWNER`.
- [ ] Go to `/dashboard/owner/administration`.
- [ ] For the **Marketing Manager** and **Sales Director** accounts: use the "Reset Password" action (`actions/admin.ts::resetPassword`) to set a new, unique, 8+ character password for each. Generate these with a password manager rather than reusing anything from `.env`.
- [ ] For the **Business Owner** account itself: `resetPassword` explicitly blocks self-reset ("Use your account settings to change your own password") — do this instead via the profile/account settings page (`actions/profile.ts`).
- [ ] Update `SEED_MARKETING_PASSWORD`, `SEED_SALES_PASSWORD`, `SEED_OWNER_PASSWORD` in `.env` to match the new values, purely so the seed script's documentation-of-intent stays accurate — **note**: `prisma/seed.ts` only creates a user if the email doesn't already exist; it will *not* overwrite an existing password on re-run. The actual password change only takes effect via the admin-panel reset above, not by editing `.env` alone.
- [ ] Distribute the new passwords to whoever uses each account, out of band (not over plaintext chat/email).

## 2. Rotate `AUTH_SECRET`

This is the JWT signing secret for all sessions.

- [ ] Generate a new secret: `npx auth secret` (Auth.js's own generator) or `openssl rand -base64 32`.
- [ ] Update `AUTH_SECRET` in `.env` (local) and in the hosting provider's environment variable settings (e.g., Vercel project settings) if deployed.
- [ ] Redeploy / restart the app so the new secret takes effect.
- [ ] **Expected side effect**: every existing session becomes invalid immediately — all logged-in users (including yourself) will be signed out and need to log in again with the new passwords from step 1. Do this rotation *after* step 1, not before, so you're not logged out before you've set the new passwords.

## 3. Rotate the Neon database password

This requires the Neon console — cannot be done from inside this repo.

- [ ] Log into [Neon console](https://console.neon.tech) → select the project → **Settings → Roles** (or the branch's connection details).
- [ ] Reset the password for the role used in `DATABASE_URL` (currently `neondb_owner`).
- [ ] Neon will show a new full connection string — copy it.
- [ ] Update `DATABASE_URL` in `.env` (local) and in the hosting provider's environment variables.
- [ ] Redeploy / restart the app. Test login and a data page load immediately after to confirm the new connection string works before considering this done.
- [ ] Old connection string stops working the moment the password is reset — don't do this mid-demo or mid-upload.

## 4. Rotate the Groq API key

Also requires an external console.

- [ ] Log into the [Groq console](https://console.groq.com/keys).
- [ ] Revoke the current key.
- [ ] Create a new key.
- [ ] Update `GROQ_API_KEY` in `.env` and the hosting provider's environment variables.
- [ ] Redeploy / restart. Test the AI insights / chat feature to confirm the new key works.

## 5. Confirm no seeded account still holds a placeholder password

`SECURITY.md` flags this as possible if the seed script was ever run before `SEED_*_PASSWORD` env vars existed (an earlier, since-removed version of `prisma/seed.ts` used a hardcoded `password123`).

- [ ] After completing step 1 (all three passwords freshly reset via the admin panel), this is moot — a fresh `resetPassword` call overwrites whatever was there before, placeholder or not.
- [ ] No separate action needed if step 1 is done for all three accounts.

## 6. After rotation

- [ ] Confirm `.env` is still excluded by `.gitignore` (it already is, per `SECURITY.md` Section 5 — just re-check nothing changed).
- [ ] Update `SECURITY.md` Section 6 to mark items 1 and 2 as resolved, with the date rotation was completed.
- [ ] If any of these values were ever shared in a chat, email, or ticket (like the seed passwords were in this session), treat that channel's history as no longer sensitive once rotation is done — but don't rely on deleting the old message as the fix; the rotation itself is what matters.

---

**Suggested order**: 1 → 2 → 3 → 4 → 5 → 6. Doing password/secret rotation (1–2) before the external services (3–4) means you're not locked out of your own admin panel while chasing down Neon/Groq console access.
