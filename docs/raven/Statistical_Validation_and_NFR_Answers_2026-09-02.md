# Statistical validation clean, FR-16 rewording confirmed, and the NFR facts

**Date:** 2 September 2026
**Re:** `FR16_Rewording_and_NFR_Questions.md`
**Status:** §3.1 done and clean. §1 confirmed. §3.4/§3.6 answered from code. §3.2/§3.5 answered with real (but caveated) numbers, per your priority order. §3.3 partial. §2: two of four done, two still open.

---

## 1. §3.1 — the six procedures check out against scipy/statsmodels

Wrote `scripts/stat-validation-dump.ts` (queries the live DB through the same functions and `where` clauses the app itself uses — `selectCorrelation`, `computeRankingComparison`, `fitFr31BothSpecifications` — and dumps both the raw inputs and this app's own computed outputs) and `scripts/stat-validation-check.py` (loads those CSVs, recomputes the same six procedures with `scipy.stats` and `statsmodels`, and diffs against the TypeScript output).

**40/40 checks matched to within floating-point tolerance** (differences of 1e-10 to 1e-17 on almost everything):

- **Spearman** — `ranking.rho` on n=730 (views vs. engagement rate): TS `-0.327531` vs. `scipy.stats.spearmanr` `-0.327531`
- **Shapiro-Wilk** — both variables in the FR-21 method-selection check (n=187): W and p match `scipy.stats.shapiro` exactly
- **Pearson/Spearman selection** — the method FR-21 actually picked (Spearman, since both variables failed normality) matches whichever `scipy.stats.pearsonr`/`spearmanr` gives on the same data
- **OLS** — FR-31's regression (n=108): R², adjusted R², F-statistic, all five coefficients, and both OLS and HC3 standard errors match `statsmodels.OLS(...).fit()` / `.fit(cov_type='HC3')` to 1e-13 or better
- **Breusch-Pagan** — LM statistic and p-value match `statsmodels.stats.diagnostic.het_breuschpagan`
- **Jarque-Bera** — JB statistic, p-value, and skewness match `statsmodels.stats.stattools.jarque_bera` exactly; excess kurtosis matches once you subtract 3 from statsmodels' output (it reports raw kurtosis, normal = 3; the app reports excess kurtosis, normal = 0 — a labelling difference, not a computation one, confirmed by the JB statistic itself matching exactly either way)
- **Shapiro-Wilk on OLS residuals** — the corroborating normality check inside FR-31 — also matches

This isn't new: `docs/PROGRESS.md`'s step-11 entry already records the underlying Shapiro-Wilk port being validated against scipy to 1e-8 on reference cases when it was written. What's new is running it against **this session's live data** for all six procedures at once, on the actual populations (n=108, n=187, n=730) rather than reference fixtures.

The proposed requirement:

> Statistical procedures shall produce results equivalent to an established reference implementation, verified for the Spearman and Pearson correlations, the ordinary least squares regression, and the normality, heteroscedasticity, and residual diagnostics.

**Write it — the evidence is behind it now.** Both scripts are committed to the repo (`scripts/stat-validation-dump.ts`, `scripts/stat-validation-check.py`) so this is re-runnable against any future data, not a one-off claim.

---

## 2. §1 — FR-16's rewording matches what `buildCurve()` does

Confirmed, re-reading the function against your proposed wording: "computing every point on a cohort's curve from that cohort's fixed membership" is exactly right. `cohortAdIds` is computed once per cohort (every ad whose max month-of-life `>= minSurvivalMonths`) and every point on that cohort's curve — including month 0 — is aggregated only from that fixed set. Write it as proposed.

---

## 3. §3.2 — measured, locally, with a caveat on what that does and doesn't prove

Built production (`npm run build && npm start`) against the live Neon DB and timed the heaviest analytical screen with a logged-in session:

- **`/dashboard/owner/analysis`** (FR-19/20/21 — ranking comparison, category distribution, correlation-with-selection, all three computed server-side per request): **3.94s** cold, then **1.33s** and **2.77s** on immediate repeats
- **`/dashboard/owner`** (FR-16 dashboard): **2.75s**

**Caveat:** this is `next start` on a single local machine talking to Neon over the open internet, not the actual Vercel deployment — no CDN edge, no co-located compute-to-DB region pairing Vercel would give you. Could run faster or slower on the real deployment. The cold-run number (3.94s) already exceeds your draft's three-second figure once; the two warm repeats are under it but one still isn't comfortably so. **I'd soften "renders within three seconds" to something like "renders within four seconds on a warm connection" unless you re-measure on the actual prod URL** — that's a five-minute check once you have it deployed and I can rerun this exact test against it if you give me the URL.

**Ingestion timing not measured** — doing that safely needs a real monthly CSV pushed through the actual upload action, and I didn't want to write a real ingestion into the live dataset you're validating figures against mid-review. If you want this number, tell me and I'll either use a disposable copy of an already-ingested month (idempotent re-upload) or you can time your next real monthly upload and give me the number to cite.

## 4. §3.3 — partial: pooled connection confirmed, cold-start delay not observed

`DATABASE_URL` points at a `-pooler` endpoint (`ep-quiet-meadow-*-pooler.c-5.us-east-1.aws.neon.tech`) — Neon's PgBouncer-pooled connection string, the standard choice for a serverless/Vercel deployment. Neon's default behaviour on its free tier is to suspend compute after 5 minutes of inactivity, with a cold-start typically in the low seconds on the next request.

**I have not observed this live** — confirming the actual delay needs a genuinely idle 5+ minutes followed by a timed request, and confirming *whether* auto-suspend is even enabled for this specific project needs the Neon dashboard, which I don't have access to. Two things worth doing on your end: check the project's compute settings in the Neon console (Settings → Compute, "Auto-suspend delay"), and if it's not disabled, the "hit the site a few minutes early" plan from your memo is the right mitigation regardless of the exact number.

## 5. §3.4 — bcrypt, cost factor 12

`bcryptjs` (npm package, v3.0.3), cost factor 12, used consistently in `actions/admin.ts`, `actions/profile.ts`, and `lib/auth.ts`'s credential check. Confirmed live in code, not from memory — this matches the SR-A2 fix from earlier today.

## 6. §3.5 — Chrome desktop confirmed; nothing else genuinely tested

Per your own check: **Chrome desktop is the only browser the system has actually been opened in.** Edge, Firefox, and Safari are unverified — narrow the NFR draft to what's true today (Chrome desktop) unless someone opens the others before the defence. You flagged Safari on iOS as the one most likely to differ and most likely to be in a panelist's hand — worth prioritizing if only one gets checked.

## 7. §3.6 — confirmed: `lib/` only

Every `*.test.ts` file in the repo lives under `lib/` (`lib/stats`, `lib/csv`, `lib/data`, `lib/db`, `lib/insights`, `lib/keywords`, `lib/categorize`) — 43 test files, 385 tests, zero under `actions/`, `components/`, or `app/`. Your draft wording ("the system's computational logic shall be covered by an automated test suite") is accurate as the boundary stands today.

---

## 8. §2 — loose items: two done, two still open

**Always-visible caption (done today):** replaced the Generate button's hover-only `Tooltip`/`TooltipContent` with a `<p>` caption always rendered under the button in `components/marketing/ContentClient.tsx`. Same text as before (the cooldown explanation or the plain "runs keyword matching and AI" line), just no longer gated behind a hover — also fixes it never being reachable on touch devices, which a hover tooltip never was.

**The two combined-Generate decoupling fixes (confirmed already done, not new):** `actions/generate-suggestions.ts`'s `generateAllSuggestions` runs both legs via `Promise.all` — the keyword leg is never gated behind the LLM cooldown, and each leg's failure is independent (no abort-on-first-failure; a keyword-leg failure doesn't skip the LLM leg or vice versa). This matches `Decouple_Both_Legs_and_Exercise_the_Merge.md`'s spec exactly.

**Still open — the three exercise runs and the PROGRESS.md corrections.** Both require either a live browser session or locating and editing a specific tracker document (`docs/raven-review/Tracker_Corrections_and_Browser_Pass.md` names the exact PROGRESS.md/`Content_Counts_and_Backlog.md` corrections needed) — neither is something I finished in this pass. Flagging honestly rather than guessing at a fix: I'll pick these up as a follow-up unless you'd rather I do it now.

---

## 9. One extra deletion, found by accident

Building production surfaced three more stub pages I'd missed in the last pass — `app/dashboard/marketing/{correlation,regression,simulation}/page.tsx`, the Marketing-side twins of the Owner ones you already had me delete. Same pattern (`notFound()` stub, unlinked from nav, unreferenced anywhere). Deleted them too, for the same reasons as before. 385/385 tests still pass; production build is clean.

---

## Where this leaves things

§3.1 (the urgent one) is closed with reproducible evidence. §1 is confirmed — write the requirement as proposed. §3.4/§3.6 are answered outright. §3.2/§3.5 have real numbers now, with the caveats above on what still needs a prod-deployment re-check. §3.3 needs five minutes in the Neon dashboard on your end. §2's two code items are done; the two document/browser items are still open and I'm not going to fake a status on those.
