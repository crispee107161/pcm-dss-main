# Reply — six items confirmed, one correction on §2's premise

**Date:** 25 August 2026
**Re:** `Six_Edits_and_Chat_Feature_Decision.md`
**Status:** all six of your open items answered below. Nothing built yet — confirming first, building once you've seen the §2 correction.

---

## §1 — Chat gated to Owner and Marketing Manager

Confirmed, your preferred option (exclude the widget entirely for Team rather than stripping the model from its context).

Implementation will follow the same shape as `hideAdEfficiency`: a `showChat` prop threaded through `Sidebar.tsx`, set from each layout's existing role check (`app/dashboard/marketing/layout.tsx` already computes `isTeam`; `app/dashboard/owner/layout.tsx` has no Team case at all). No new role-detection logic needed, same pattern as the Analysis gate.

## §2 — Ad query scoped to study period, with a correction

Confirmed, this should happen. But it isn't the one-line fix your memo assumes, and the reason matters beyond `chat.ts`.

I checked: there is no ad-side equivalent of `STUDY_PERIOD_POST_WHERE`. `lib/data/study-period.ts` only ever scoped `FacebookPost` — its own comment says so explicitly ("every FacebookPost query feeding an analytical output ANDs this on"). I also checked `lib/data/dashboard.ts`, which runs its own `prisma.ad.findMany(...)` for the dashboard's ad figures, and that query has no study-period filter either.

So the framing in §2 — "every other screen in the system reports on the declared window" — isn't accurate for ads. Nothing in the system currently scopes ad figures to the study period. FR-04a's helper covers posts only; the dashboard's ad totals are already running over the full ingested range, same as chat would be.

Two ways to close this, and I'd like your call before building either:

- [ ] **Chat only** — add a `STUDY_PERIOD_AD_WHERE` (on `reporting_starts`/`reporting_ends`) and apply it in `actions/chat.ts` alone. Smallest change, but it leaves chat as the *only* ad-scoped screen while the dashboard keeps reporting the full range — a new, different two-sources-of-truth problem, just moved rather than closed.
- [ ] **Chat and dashboard both** — same filter, applied in both `actions/chat.ts` and `lib/data/dashboard.ts`. Larger diff, but it's the only version that actually makes "every analytical output is scoped to the declared period" true, which is the sentence you said you're waiting to write in Chapter 3.

Ads' own date fields are `reporting_starts`/`reporting_ends`, not `publish_time` like posts, so the new constant needs its own definition rather than reusing the post one — mechanically simple either way, just want the scope confirmed given what I found.

## §3 — FR-07 version identifier: building it

Confirmed. Adding `category_llm_model` (model at suggestion time) plus a lexicon version/term-count stamp for the keyword side. Clause stays as originally written; I'll report it back as implemented once it lands.

## §3 — FR-09 views-to-reach correlation: building it

Confirmed. Will sit on the Analysis ranking-comparison section beside the existing figures, same computation shape as the current correlation.

## §3 — FR-04 per-row validation: extending to all five remaining validators

Confirmed, extending rather than narrowing the clause. Matches the pattern already built for ads/posts (`lib/csv/row-validation.ts`, `records_rejected` on `UploadLog`) — the remaining five validators get the same per-row rejection treatment instead of an all-or-nothing file reject.

## §4 — Chat feature: all three conditions confirmed, FR-21 as written

Confirmed as written:

1. Gated to Owner and Marketing Manager (§1 above)
2. Ad query scoped to study period (§2 above, pending the scope call)
3. Visible caption on the widget stating figures are drawn from the consolidated dataset and should be confirmed against the reports

FR-21's proposed wording describes the feature accurately once §1 and §2 land. No changes requested to the clause text.

---

## What I need back before building

Just the §2 scope call — chat-only or chat-and-dashboard. Everything else above is confirmed and ready to build as soon as you've replied.
