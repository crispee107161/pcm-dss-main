# Delete the cut pages, and the browser pass still needs a browser

**Date:** 2 September 2026
**Re:** `Three_Confirmations_Answered_2026-09-02.md`
**Status:** two of three confirmations accepted, one question on the gating gap, one gap in the sweep method, plus an earlier memo still open

---

## 0. Two things closed cleanly

**The stranded-post count is zero.** FR-08 records as fully implemented with no caveat. That is the answer I hoped for and it means the corpus carries both suggestions on every in-period post.

**Your query also independently confirms 731.** You ran it against "in-period posts (731 total, Aug 2025 to Jul 2026 Manila)" without being asked to verify that figure, and it matches what we settled last week from a different direction. Table 2 goes to 731 with confidence.

**The Predictive Model removal is confirmed.** Zero references under `actions/` or `components/`. FR-21 holds as written.

---

## 1. ⚠ The gating gap needs one clarification, and then deletion

You flagged `correlation`, `regression`, and `simulation` as having no auth gating in their page files, reachable by all three roles, and characterised it as informational.

**I need one thing clarified before I can agree with that characterisation.**

- [ ] **Are those three routes reachable while logged out entirely, or only by any authenticated role?**

Your wording says "no auth gating at all in their page files," which reads as no session check, and separately says "all three roles can reach them," which reads as authenticated but not role-gated. Those are very different, and the first one contradicts FR-01 directly:

> The system shall authenticate users through a username and password **before granting access to any module**.

If a route renders without a session, that clause is untrue as written, and ISO/IEC 25010 security is one of the criteria objective 6.1 evaluates against.

### 1.1 Either way, delete them rather than gate them

Here is why this is not merely a housekeeping matter.

Those pages render the **cut predictive regression**, the same `regressionModel` output we removed from the assistant last week. We removed it because it reports coefficients, R-squared, and n from a model that appears in no requirement, on no screen in the navigation, and in no chapter, and would not match anything in Chapter 4 if someone asked about it.

Removing it from the assistant while leaving three pages that render the same thing at a guessable URL solves half the problem. A panelist who types `/dashboard/owner/regression` sees a regression that is not in the manuscript, and the explanation that it is a cut feature nobody links to is a weak thing to be saying in that moment.

- [ ] **Delete the three page files.** The underlying `lib/stats/` modules can stay, since nothing routes to them and `mvp.md` documents them as cut.
- [ ] **Confirm `/ui` is also gone**, or delete it. It appeared in the reverse traceability as an unauthenticated component showcase and I have not seen it reported as removed.

Deleting is cleaner than gating. Gating preserves a route to a model that contradicts Chapter 4 and only restricts who can reach it. Deleting means the route does not exist, FR-01 holds without qualification, and there is nothing to explain.

---

## 2. The sweep is valuable, but it is not the browser pass

Your caveat is the right one and I want to build on it rather than dispute it.

**What curl proved well.** Role gating is enforced server-side, so HTTP status, redirect target, and response signature are exactly the right instruments for it. The Marketing Team results in particular are strong evidence, and the 87KB versus 368KB comparison on the Analysis route is a neat way to demonstrate the ad-efficiency gate is actually withholding content rather than hiding it client-side. That finding stands and I will cite it.

**What it cannot prove.** As you say, curl does not execute JavaScript. The analytics layer is almost entirely client-rendered charts, so a component that mounts and then fails to populate returns a healthy 200 with a large response body and looks identical to one that works.

That is precisely the failure I am worried about for the demonstration. Not a broken route, but a chart that renders empty in front of a panel.

**This is ours to close, not yours.** We will do a manual click-through on all three accounts, opening every screen and confirming each chart actually draws. No tooling needed, just time.

- [ ] Nothing required from you here, unless you would rather do it yourself

One thing from your sweep worth acting on separately: the running dev server had **already crashed** with a stale Jest-worker exception before you started, to the point that `/api/auth/csrf` was returning 500. That went unnoticed until you happened to check.

- [ ] Worth a restart and a fresh verification on the morning of the defence, since a silently dead server is a bad way to start a demonstration

---

## 3. Still open from `Lifecycle_Cohort_and_Threshold_Parameters.md`

Sent 27 August, and I do not think it reached you, since this response addresses the earlier memo instead. Three items, in priority order:

**The lifecycle cohort question.** I computed cost per inquiry by month of advertisement life from the raw exports, pooling every advertisement: 22.57, 21.95, 19.21, 16.94 across months one to four. Read naively that says advertisements get cheaper as they age, which contradicts ad fatigue. It is almost certainly survivorship, since the advertisements reaching month four are the ones that were working and therefore were not switched off. The contributing population falls from 187 to 49 across those four steps.

- [ ] **Does FR-27's lifecycle report hold the cohort fixed**, tracking the same advertisements across their whole life, or does it pool everything that reached each period?

You described it as "month-of-life cohort curves," which sounds correct, but Chapter 4 either reports a finding or an artefact depending on the answer.

**The minimum survival threshold value.** FR-16 refers to it and I do not know the number. Going into Definition of Terms as a named term, so I need the constant and its unit.

**The expenditure threshold provenance.** The commit date on `MIN_SPEND_THRESHOLD_PHP` and whether the value has ever changed. Not a challenge, the same provenance question we asked about the lexicon and the prompt, and I expect it to be clean.

---

## 4. Where the table stands

Twenty-one requirements, unchanged by this response.

FR-08 and FR-21 are now confirmed implemented. FR-01 is the only requirement in question, and only if the answer to §1 is that those routes render without a session. If they are authenticated but not role-gated, FR-01 holds as written and the deletion request stands on the Chapter 4 grounds alone rather than on a requirements gap.

- [ ] §1's clarification is the only thing that could move a mark

---

## 5. Order

1. **§1**, the logged-out question, then delete the three pages and confirm `/ui`
2. **§3**, the cohort question
3. **§3**, the two threshold values

Everything else is ours. Print is waiting on §1 alone.
