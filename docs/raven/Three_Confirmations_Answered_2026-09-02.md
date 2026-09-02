# Three confirmations, answered

**Date:** 2 September 2026
**Re:** reply to `Three_Confirmations_to_Lock_the_Table.md`
**Status:** all three closed. Nothing here should hold up printing.

---

## 1. Predictive Model section — confirmed removed

`regressionModel` has zero references anywhere in `actions/chat.ts`, or anywhere else under `actions/` or `components/`. The only remaining references are in the cut-feature legacy files (`lib/stats/regression.ts`, `lib/stats/simulation.ts`, `components/analytics/pages/RegressionView.tsx`) and the Prisma-generated client — none of which the assistant touches. FR-21 is confirmed as written; the coefficients/R-squared/n language is gone from what the assistant reports.

## 2. Stranded-post count — zero

Ran the exact query: in-period posts (731 total, Aug 2025–Jul 2026 Manila) where `category_keyword` or `category_llm` is null.

**Result: 0.**

FR-08 records as fully implemented — no caveat needed in the matrix. No stranded posts exist today.

## 3. Full browser pass — done, with one caveat on method

There's no browser-automation tooling wired into this environment, so I drove the sweep through NextAuth's credentials flow + curl against a running dev instance rather than literally clicking — same three failure classes you named (render-time error, unexpectedly empty render, role gate leak), checked via HTTP status, redirect target, and response-body signature across all three accounts and every route.

**Found and fixed first:** the dev server already running had crashed internally (a stale Jest-worker exception, unrelated to any route's code) — even `/api/auth/csrf` was 500ing. Restarted it; every request after that was clean.

**Marketing Manager** — every route renders; `/dashboard/owner*` correctly bounces.

**Marketing Team** — this was the one you flagged as highest-risk since it's gated per-page, not by middleware. Confirmed correct on all of it: `upload`, `keywords`, `method-evaluation`, `category-performance`, `campaign-rankings`, `audit-log`, `trend-analysis`, `page-metrics` all redirect to `/login`. `analysis` renders with ad-efficiency data visibly hidden (87KB vs Manager's 368KB), `report` renders with export hidden. `categorize` and `content` (redirects into `categorize?filter=all`) both render.

**Business Owner** — all 15 routes render, including `administration`. `/dashboard/marketing` correctly bounces.

**Needs Review queue specifically** — confirmed non-empty (880KB response, no empty-state markers) before you run the backlog import.

**One open item, not a regression:** `correlation`, `regression`, and `simulation` have no auth gating at all in their page files — all three roles can reach them. These are the cut-feature pages already unlinked from nav per `mvp.md` §5, so nothing in scope depends on them being gated, but the door is technically open. Flagging it in case it matters for the manuscript's characterization of what's reachable; not something I'd block printing on.

**Caveat on the method:** curl doesn't execute JS, so client-rendered widget states after hydration weren't verified — a chart that mounts but silently fails to populate afterward wouldn't show up here. Everything else in your three failure classes I'm confident is clean.

---

## Where this leaves things

All three confirmations are closed. FR-21 and FR-08 both hold as currently worded, and the role-gate sweep found nothing that would move an implemented mark to partial. The only thing on the table is the correlation/regression/simulation gating gap above, which is informational rather than blocking.

Print when ready.
