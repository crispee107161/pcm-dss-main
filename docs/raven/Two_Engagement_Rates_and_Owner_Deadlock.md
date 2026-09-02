# Two engagement rates, one deadlock, and one asymmetry in the baseline

**Date:** 2 September 2026
**Re:** `Security_Pass_Response_Reply_2026-09-02.md` and `Statistical_Validation_and_NFR_Answers_2026-09-02.md`
**Status:** three findings, two small asks, four requirements revised

---

## 0. You were right about 730 and I was wrong

In-period is 731, less the one post with a null Views value, so 730 eligible. My 729 came from counting the twelve client exports, which hold 730 posts and not 731, and I carried that forward without re-deriving it.

Flagging the discrepancy rather than silently matching my expectation was the right call, and it is the second time this week that instinct has caught something. The correlations agree regardless: your ρ = -0.327531 against my -0.3274 on the same relationship.

The statistical validation itself is strong work. Forty checks matching to 1e-13 on the live populations rather than reference fixtures is exactly the evidence NFR-02 needed, and committing both scripts means it is re-runnable rather than a one-off claim.

---

## 1. ⚠ The two engagement rates are the most consequential thing in either memo

Your §2 flagged this and I want to make clear how far it reaches, because it is not only a comparison hazard.

| | Formula | Scale |
|---|---|---|
| Advertising engagement rate | sum(post_engagements) / sum(reach) | **proportion** |
| Organic engagement rate | (reactions + comments + shares) / reach × 100 | **percentage** |

Same field name, two entities, two formulas, two scales differing by a factor of one hundred.

**The manuscript currently defines one of the two and requires the wrong one.** Definition of Terms defines engagement rate once, using the organic formula. FR-06 requires the system to compute engagement rate "for organic posts" and never mentions the advertising measure, yet FR-10 and FR-11 both depend on it.

Three corrections on my side:

- Definition of Terms gains two entries, **organic engagement rate** and **advertising engagement rate**, each with its formula and its scale stated
- FR-06 is extended to require both
- Chapter 4 states the scale alongside every reported coefficient, since -0.6510 on a proportion is a different claim from the same figure on a percentage

**Revised FR-06:**

> The system shall compute engagement rate for organic posts as the sum of reactions, comments, and shares divided by reach, shall compute engagement rate for advertisements as total engagements divided by total reach, and shall compute cost per inquiry for advertisements optimised for messaging conversations, computing no cost per inquiry for advertisements run for other objectives.

- [ ] **Confirm that wording matches both computations**, particularly whether the advertising figure sums across an advertisement's monthly rows before dividing, which I have understood it does

Also worth knowing for the appendix: are the two stored in the same column name in the database, or are they distinguishable at the schema level? If the same name, that is worth a note, because it is precisely the shape of thing that causes an error two years from now.

---

## 2. ⚠ The Owner deadlock: add a second Owner account

Your §5 is right that this is a deadlock rather than an inconvenience, and thank you for testing it by inspecting the constraint rather than by locking the account.

The emergency script is a reasonable fallback, but it requires database credentials and a person holding them who is reachable in the moment. **The cleaner fix removes the failure mode instead of mitigating it:**

- [ ] **Create a second `BUSINESS_OWNER` account.** Either can then unlock the other through the interface, with no script, no database access, and nobody on standby.

Two minutes of work, and it also makes NFR-12 true as written, since that requirement says release requires an authorised user without currently guaranteeing that such a user remains able to act.

Keep the emergency script regardless. A documented CLI fallback is good practice and costs nothing to leave in place.

The account state check is noted: all three demonstration accounts clean on `is_locked`, `must_change_password`, and `failed_login_attempts`. We will re-check immediately before the defence.

---

## 3. ⚠ The cross-validation baseline is not cross-validated

From your §2 of the security reply. The model MAE of ₱4.19 is genuinely out-of-fold. The baseline MAE of ₱5.83 is in-sample, computed from the median of all 108 observations and scored against those same 108.

For a constant predictor the optimism is small, so the 28.2 per cent improvement is if anything understated rather than overstated. That is the reassuring half.

The problem is that FR-11 says "cross-validated error against a stated baseline model," which implies both sides are cross-validated, and they are not. A panelist who asks how the baseline was computed would find an asymmetry the requirement does not describe.

- [ ] **Compute the baseline per training fold**, taking the median of each fold's training partition and scoring it on that fold's held-out partition, the same way the model is scored

One line inside the existing loop. Once it lands, FR-11 stands as written and both sides of the comparison are evaluated identically. The figure will move very slightly, and Chapter 4 uses the new one.

---

## 4. `ai-insights.ts`: delete it

Dead code, unreferenced, tracing back to the cut predictive regression. That answers my question and Chapter 3's account of one external call is correct as it stands.

- [ ] **Delete `lib/.../ai-insights.ts` and `components/analytics/AIInsightCard.tsx`**

Same reasoning as the cut regression pages. A dormant component that assembles a Groq payload is one import away from being live, and "it exists but nothing calls it" is a weaker sentence than "it does not exist." You already deleted the three Marketing-side stubs on the same grounds, which was the right instinct and I would not have known to ask.

---

## 5. Requirement revisions from your measurements

**NFR-04 does not hold as drafted.** You measured 3.94 seconds cold and 1.33 to 2.77 seconds warm against a three-second requirement.

I would rather re-measure than soften, and the deployment is the honest place to measure. So:

- [ ] **Once the system is on its production URL, re-run your timing test against it** and send the figures

If the deployed numbers hold under three seconds, the requirement stands. If not, it becomes four seconds on a warm connection, which is defensible and still a real commitment. Either way the figure will be one you measured rather than one I estimated.

**NFR-06 narrows to what has been tested.** Chrome desktop is the only browser the system has been opened in, so the requirement cannot claim four browsers.

Revised, pending any further testing:

> The system shall function on current versions of major web browsers, verified on Chrome and Safari across desktop and mobile, without installation of additional software and without affecting other software on the user's device, and shall accept export files in the formats produced by Meta Business Suite and Meta Ads Manager as downloaded.

- [ ] **Open the system in Safari, ideally on iOS**, since it is the browser most likely to differ and most likely to be in a panelist's hand

If Safari surfaces problems and there is no time to fix them, the requirement narrows to Chrome alone and Chapter 5 carries the rest as a recommendation. Narrow and true beats broad and untested.

**NFR-12 gains a clause** requiring that an authorised user remains able to effect release, which §2 above satisfies.

**NFR-17 is confirmed as drafted.** Tests confined to `lib/` is exactly the boundary "the system's computational logic" describes, so the wording is accurate rather than generous.

---

## 6. The Neon auto-suspend check

Your §4 is right that this needs the console rather than the code. We will check Settings and then Compute for the auto-suspend delay.

Either way the mitigation is the same and it is ours: open the site several minutes before the demonstration rather than cold in front of the panel.

---

## 7. Where things stand

**Closed:** the statistical validation, FR-16's rewording, the caption, the two decoupling fixes, the hashing algorithm, the test-suite boundary, and `ai-insights.ts` pending deletion.

**Asks in this memo:** the second Owner account, the per-fold baseline, the two deletions, the FR-06 confirmation, and the Safari check.

**Still open from before:** the three exercise runs of the combined Generate action, and the `PROGRESS.md` corrections. Both still worth doing, neither blocking.

**Ours:** the Neon console check, the production timing re-run once deployed, the manuscript changes above, and the independent spot-check of your validation figures. On that last point, I will run your `stat-validation-check.py` myself and separately recompute R-squared, the Spearman coefficient, and the HC3 standard errors in a clean environment. Not because I doubt the result, but because Chapter 3 describes the check as independent of the implementation, and that sentence should be true.

The kurtosis difference you found, statsmodels reporting raw and the app reporting excess, is exactly the class of definitional mismatch worth documenting. It goes in the appendix alongside the comparison, since a discrepancy found and explained reads better than a table where everything matched on the first attempt.
