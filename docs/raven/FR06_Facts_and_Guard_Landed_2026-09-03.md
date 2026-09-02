# FR-06's two facts, and the guard is in

**Date:** 3 September 2026
**Re:** `Seed_Password_Owner_Guard_and_Safari.md`
**Status:** §3 answered directly from the code, §2 implemented and tested; §1 and §4 are mine to do, not yours — noted below

---

## 1. §3 — FR-06's two facts

You're right that these were never yours to answer. Read straight from `prisma/schema.prisma` and `lib/stats/correlation-selection.ts`:

**Does the advertising engagement rate sum across an ad's monthly rows before dividing?** Yes. `aggregateByAdId()` sums `post_engagements` and `reach` per `ad_id` across every monthly row first; the division happens after, in `selectCorrelation()`:

```ts
x.push(totals.engagements / totals.reach)
```

Confirmed, not inferred — this is the same sum-then-divide-per-Ad-ID aggregation as every other CPI/engagement figure in the app (ALG-09).

**Do the two engagement rates share a column name at the schema level?** No. `FacebookPost.engagement_rate` (line 264 of the schema, `Float`, percentage 0–100) is the only column with that name anywhere in the schema. The advertising figure is never stored — it's computed at query time from `Ad.post_engagements` and `Ad.reach`, two differently-named raw columns. So there's no shared-name collision to footnote; the two figures are distinguishable at the schema level by construction, only colliding in prose (Definition of Terms) where both get called "engagement rate."

FR-06's revised wording is settled on my end — go ahead and add the two Definition of Terms entries.

## 2. §2 — the last-active-Owner guard is in

`actions/admin.ts`: `updateUserRole` and `deactivateUser` now refuse the action when the target is the only other active `BUSINESS_OWNER`, matching your three asks exactly —

- Refuses on the target being the last other active `BUSINESS_OWNER` (checked via `isLastRemainingOwner()`, counting active owners excluding the actor)
- Returns `"Cannot remove the last remaining owner account."` rather than a generic refusal
- Logs the refusal through `lib/security-log.ts` as `AUTHORIZATION_DENIED`, same pattern as every other denial in that file

`updateUserRole` only blocks when the change actually demotes (target is currently `BUSINESS_OWNER` and the new role isn't) — reassigning `BUSINESS_OWNER → BUSINESS_OWNER` is a no-op, not a demotion, so it's not blocked. 405/405 tests pass, `tsc --noEmit` clean.

NFR-12's "at all times" clause is now structurally true rather than true by accident.

## 3. §1 — the seed run is on the user, not me

Noted that you want the password-holder running `npx prisma db seed` directly rather than a second party writing to the live DB — that's a decision for the user to execute, not something I should do on their behalf even with the password in hand. Flagging it to them now.

## 4. §4 — the Safari check needs a physical device

Also flagging to the user directly — this genuinely needs an iPhone/iOS Safari in someone's hands, which isn't something I can run myself.

---

## Where this leaves things

**Closed this round:** FR-06's two facts, the last-active-Owner guard.

**Still on the user:** run `npx prisma db seed` with your `SEED_OWNER2_PASSWORD`, confirm `owner2@pcmerchandise.com` signs in; open the app in Safari on iOS across all three roles and report back what (if anything) breaks.

**Still on you (per your own §6):** Neon console auto-suspend check, production timing re-run once deployed, independent validation spot-check including the new baseline figures, and the manuscript changes for the engagement-rate definitions and FR-06 wording.
