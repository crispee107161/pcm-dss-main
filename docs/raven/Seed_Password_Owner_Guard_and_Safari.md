# Seed password, yes to the guard, and one thing only you can do

**Date:** 2 September 2026
**Re:** `Owner_Deadlock_Baseline_and_Deletions_2026-09-02.md`
**Status:** two answers, one correction to a question you asked me, three asks

---

## 1. The seed password

```
SEED_OWNER2_PASSWORD=marble-saffron-quartz-67
```

Twenty-four characters, passphrase form rather than random string, deliberately. It is typeable under pressure at a keyboard someone else set up, which matters if the account is ever needed during the demonstration for the exact reason it exists.

- [ ] **Please run `npx prisma db seed` yourself.** You have the environment and the credentials, and I would rather not have a second person writing to the live database when one is already set up to do it.
- [ ] Confirm `owner2@pcmerchandise.com` exists and can sign in afterwards

Treat this as a demonstration-environment credential rather than a production secret. If the client takes the system on after the defense, this account should be reset or removed as part of handover, and that belongs in the user manual.

---

## 2. Yes to the last-active-Owner guard

You were right to ask rather than assume, and the answer is yes. Add it.

The reasoning is not only about resilience. **NFR-12 now reads:**

> ...repeated failed authentication attempts shall lock the account until released by an authorised user, with at least one account holding release authority remaining able to act at all times.

"At all times" is a property of the system, not of who happens to exist in it today. A second account satisfies that requirement by accident, and accidents stop holding. Someone tidies up accounts in September, demotes the second Owner because it looks redundant, and the requirement quietly becomes false with nothing to signal it.

The guard makes it structurally true.

- [ ] **Refuse `updateUserRole` and `deactivateUser` where the target is the only other `BUSINESS_OWNER`**
- [ ] Return a message naming the reason, something like "cannot remove the last remaining owner account," rather than a generic refusal
- [ ] Log the refused attempt through `lib/security-log.ts`, since a denied authorization event is exactly what that log is for

Four lines, and it converts a mitigation into an invariant.

---

## 3. ⚠ FR-06: you asked me a question only you can answer

Your "still open" list has the FR-06 confirmation waiting on me. It is the other way round.

I asked whether the advertising engagement rate sums across an advertisement's monthly rows before dividing, and whether the two engagement rates share a column name at the schema level. Both are facts about the code and the schema. I have no way to establish either.

- [ ] **Does `sum(post_engagements) / sum(reach)` sum across an advertisement's monthly rows before dividing**, or is it computed per row and then averaged? Your earlier memo said the former, per ALG-09, and I want it confirmed rather than inferred.
- [ ] **Do the organic and advertising engagement rates share a column name** in the schema, or are they distinguishable at that level?

The second matters for the appendix. Two quantities differing by a factor of one hundred under the same field name is the shape of thing that causes a wrong figure two years from now, and it is worth a note either way.

Once both are confirmed, FR-06's revised wording is settled and Definition of Terms gains its two entries.

---

## 4. ⚠ The Safari check is yours, not ours

You mentioned having an iPhone. Nobody on our side does.

- [ ] **Open the system in Safari on iOS**, sign in on each of the three accounts, and open every analytical screen

What I need is not a formal pass, just whether anything is broken. Charts that do not draw, layouts that overflow, buttons that cannot be tapped, or a login that does not complete.

This one item decides NFR-06's wording. If Safari on iOS is clean, the requirement covers Chrome and Safari across desktop and mobile, which is a reasonable claim. If it is not, the requirement narrows to Chrome and the rest becomes a Chapter 5 recommendation. Either is fine, but I cannot write the sentence without knowing.

Worth doing before the deployment rather than after, since a layout problem found now is a fix and one found in October is a limitation.

---

## 5. Noted and no action

**The baseline correction.** 28.5 per cent replaces 28.2, baseline MAE PHP 5.86 replaces 5.83, RMSE 8.79 replaces 8.77, MAPE 27.1 replaces 26.9. Chapter 4 cites 28.5. I will update the specification documents, since as you say those are ours.

The movement being small and upward is the expected direction for a constant predictor, which is a small confirmation that both implementations are behaving.

**The two memos describing a deleted file.** Correcting them in the current memo rather than editing what was already sent is the right handling. The same applies to declining to rewrite our specification documents. Both are the reason the paper trail from this review will hold up if anyone follows it.

**The dead code deletion**, including updating the comments elsewhere that pointed at the removed file rather than leaving them dangling.

---

## 6. Still on our side

The Neon console auto-suspend check, the production timing re-run once deployed, the independent validation spot-check including the new baseline figures, and the manuscript changes.

## 7. Order

1. **§4**, the Safari check. Blocks a requirement and takes ten minutes.
2. **§1**, the seed run.
3. **§2**, the guard.
4. **§3**, the two FR-06 facts.

Nothing here is large. §4 is first only because it is the one nobody else can do.
