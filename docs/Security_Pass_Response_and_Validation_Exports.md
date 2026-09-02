# Security pass: three questions, one disagreement. Plus what I need for the statistical validation.

**Date:** 2 September 2026
**Re:** `SSDLC_Security_Requirements_Implemented_2026-09-02.md`, and NFR-02
**Status:** most of the security work accepted, one decision I would revisit, three things to check before the defence, and two exports I need from you

---

## 1. The security work

Most of this is straightforward improvement and needs nothing from me. Bcrypt cost 12, the twelve-character minimum, the lockout, the temporary password expiry, and the re-authentication gate are all standard hardening and they materially improve what the ISO/IEC 25010 security evaluation can claim.

Three things stand out as more than routine.

**SR-D6, CSV formula injection.** This is a genuine find. Ad names come from a client-controlled export and land in a CSV that opens in Excel, so a name beginning with an equals sign is an execution path nobody had considered. Prefixing with an apostrophe is the correct fix.

**SR-Z9, role changes taking effect immediately.** This closes the same gap the deactivation check closed, in the same place, using the same per-request read. A demoted user losing old-role access on their next request rather than at token expiry is the correct behaviour and it strengthens FR-01.

**SR-L1 through SR-L3, merging security events into the existing Audit Log** rather than building a second log screen. That was the right instinct. FR-20 covers uploads and category assignments, and the security events sit naturally alongside them under the same access gate.

---

## 2. ⚠ SR-D8: I would not scope it that way

This is the one decision I would revisit, and I want to lay out the reasoning rather than simply object.

You scoped SR-D8 to the caption categorisation call, on the grounds that sending aggregate spend and cost per inquiry to Groq is the entire purpose of the assistant and removing it would defeat the feature.

That reasoning holds for the **assistant**. FR-21 already permits exactly that, and states the boundary explicitly:

> ...shall restrict its access to aggregate measures and advertisement names, shall not transmit post content or customer-identifying information outside the system...

So the assistant is documented, bounded, and defensible as written.

**What I did not know about is `ai-insights.ts`.** It appears in your memo for the first time, it sends data to Groq, and it maps to no requirement in the table. That is the fourth time a feature has surfaced with no requirement behind it, after Top Ads, Category Performance, and the chat widget, and each of the previous three resolved cleanly once I understood what it was.

- [ ] **What is `ai-insights.ts`?** Which screen or screens call it, which roles can reach those screens, and what exactly does it send to Groq?
- [ ] Does it send anything beyond the aggregate measures and advertisement names FR-21 permits?

If it stays within the same boundary, the cleanest resolution is to widen FR-21's subject from "an assistant" to cover both call sites, since they have the same data-handling profile. If it sends something broader, we need either a separate requirement or a narrowing of what it sends.

Either way I need to know before Chapter 3 describes what leaves the system, because that paragraph currently accounts for one external call and there are two.

---

## 3. Three things to check before the defence

None of these are objections. They are consequences of the new behaviour that could surface at a bad moment.

**The lockout is a live risk on the day.** Five failed sign-ins within fifteen minutes locks an account, release is manual by an Owner, and unlocking now requires the Owner to re-enter their own password. If someone mistypes the Marketing Manager password five times while setting up the demonstration, recovery depends on the Owner account being to hand and its password being remembered.

- [ ] Confirm the Owner account cannot be locked out of unlocking others, or that a recovery path exists that does not require a working Owner login

**The forced password change intercepts everything.** `middleware.ts` redirects any session with `must_change_password` to the change screen before any other route is reachable. If a demonstration account was created or reset recently, its first sign-in lands on a password change screen instead of the dashboard.

- [ ] Confirm none of the three demonstration accounts currently carries that flag or an expired temporary password

**Re-authentication adds a step to every account action.** If User Management is demonstrated, the Owner will be asked for a password before each role change or reset. That is correct behaviour and worth knowing about in advance rather than discovering live.

---

## 4. On the carried-forward gaps

Your list is honest and I am not asking for any of it to be closed. Two notes for the manuscript rather than for you.

The `middleware.ts` JWT lag is worth stating precisely in Chapter 3, because the distinction matters: authorisation is re-verified from the database on every `auth()` call, so a demoted or deactivated user cannot perform an action they no longer have rights to. What lags is the routing decision, not the permission. Those are different claims and the second is the one that matters.

`docs/erd_schema.sql` not being regenerated is worth closing at some point, since the ERD is a Chapter 3 figure and it now omits a table and six columns.

- [ ] Regenerate it when convenient, no urgency

Everything under "not attempted" is correctly out of scope for a capstone at this stage. Multi-factor authentication, a least-privilege database role, dataset soft-delete, and upload rate limiting are all reasonable Chapter 5 recommendations, and I will present them that way. A system that names its own security limitations reads better than one that claims none.

---

## 5. What I need for the statistical validation

Separate subject, and this is the thing I need most from you this week.

I am validating the system's statistical outputs against scipy and statsmodels, independently, because those procedures are implemented in TypeScript rather than called from a library and every one of them feeds a Chapter 4 figure. This supports NFR-02 and becomes a documented control in Chapter 3.

I am running the comparison rather than asking you to, so that the check is independent of the implementation. What I need from you is the data and three definitions.

### 5.1 Two exports

**`regression_inputs.csv`**, the exact rows and columns the regression was fitted on, one row per advertisement:

```
ad_id, cost_per_inquiry, engagement_rate, frequency, ctr, cpm
```

Should be 108 rows.

**`ranking_inputs.csv`**, one row per organic post:

```
post_id, views, reach, engagement_rate
```

Should be 729 rows, being the in-period posts less the one with a missing view count.

### 5.2 Three definitions, in writing

- [ ] **The advertising engagement rate formula.** Which numerator, which denominator, and whether the stored value is a proportion or a percentage. This is not in the Definition of Terms and the raw export offers several plausible constructions.
- [ ] **Natural logarithm or log base ten** on cost per inquiry in the regression.
- [ ] **Which heteroscedasticity-consistent variant**, most likely HC3, and whether the cross-validation baseline predicts the median of each training fold or the median of the whole dataset.

### 5.3 The current figures, before I compute mine

- [ ] A screenshot or transcription of the Analysis screen's regression and correlation sections

I want your numbers written down before I produce my own. Comparing against a figure I have already seen is not the same test as comparing against one I have not.

### 5.4 What I expect to find

Most likely agreement, and where a figure differs I expect it to be a definitional mismatch rather than an error. A percentage against a proportion changes a coefficient by a factor of one hundred and leaves the correlation identical. Natural log against base ten changes every coefficient by a constant and leaves R-squared untouched. Those are the first two things I will check before raising anything with you.

The cross-validated error will differ slightly regardless, since a TypeScript random number generator and scikit-learn's will not produce identical folds on the same seed. What I will be checking there is the margin between model and baseline, not the absolute figures.

---

## 6. Order

1. **§5.1 and §5.2**, the exports and definitions. Blocking my work this week.
2. **§2**, what `ai-insights.ts` is. Could add or widen a requirement.
3. **§3**, the three defence-day checks. Quick, and they prevent a bad five minutes.
4. **§4**, the ERD regeneration, whenever.

Still open from before, unchanged: the always-visible caption, the two combined-Generate decoupling fixes, the three exercise runs, and the `PROGRESS.md` corrections.
