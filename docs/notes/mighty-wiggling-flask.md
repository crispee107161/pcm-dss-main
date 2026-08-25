# Draft the revised SCOPE.md — messaging conversations replaces inquiries

> **Status:** Draft for review only. No code changes yet — waiting on your
> confirmation before touching `lib/stats/`, the UI, or the other ~40 files
> that reference "inquiries." This supersedes the earlier
> "keep both datasets separate" plan, which is now obsolete: you decided to
> fully adopt the daily export and change the capstone's claims to match.

## Context

`Daily vs Monthly Ads Export - Finding.pdf` correctly diagnosed that the daily
Facebook export never carried a `Purchases` column — it's not a mapping bug,
it's a different export format. I independently verified its September
reconciliation against the raw CSVs (4,789 messaging conversations, ₱66,067.60
spend, both exact matches) — that part checks out.

Its recommendation — drop `Purchases`/inquiries, use "Messaging conversations
started" as the outcome variable instead — is a scope change, not a bug fix,
because `SCOPE.md` (panel-reviewed 2026-08-02) locks the current formula and
the current definition of "inquiries." You've now authorized making that scope
change. This plan produces the revised `SCOPE.md` text for your review before
any implementation starts.

**One open technical fork, decided below (flag if you disagree):** the current
formula is `Inquiries = β₀ + β₁·Reach + β₂·MessagingContacts + β₃·Spend` —
messaging conversations is currently a *predictor*. It can't also be the
outcome. The revised formula drops it as a predictor:
`MessagingConversations = β₀ + β₁·Reach + β₂·Spend`. This also means the
What-If Simulator's "messaging" input slider no longer makes sense and needs
to become a spend/reach-only control — flagged here, not yet built.

**Also worth being honest with yourself about before defending this:**
"messaging conversations started" is a *weaker* signal of real customer
intent than "Purchases" was — a conversation can open from curiosity, a
misclick, or an automated greeting, with no purchase intent at all, whereas
"Purchases" (however imperfect) was at least Facebook's own attribution of an
inquiry-shaped action. The trade you're making is real signal quality for
12x the sample size and 4x the date coverage. That's a defensible trade for a
capstone under time pressure, but it's a trade, not a strict upgrade — say so
in the defense rather than letting "more data" imply "better data."

## Draft: revised `SCOPE.md`

Everything below is the proposed full replacement text. Sections not shown
changed are carried over unchanged from the current file.

---

```markdown
# PCM DSS — Honest Scope Statement

**Why this document exists**: a capstone panel review (2026-08-02) flagged that
"Decision Support System" oversells what this project actually does — it
analyzes one marketing channel (Facebook), not the business as a whole. This
document exists so the thesis/defense narrative, the code, and the AI-facing
copy all say the same true thing about scope, rather than three different
claims of varying honesty.

**Revision note (2026-08-05):** the outcome metric changed from
Facebook-reported "Purchases" (relabeled `inquiries` in this system) to
"Messaging conversations started." Facebook shipped a per-day ad export that
the system adopted for 12 months of coverage (vs. 3 months in the old monthly
export) — but that export never carries a `Purchases` column. Rather than
maintain two incompatible datasets, the outcome metric was redefined to
"Messaging conversations started" — present in both export formats, and the
actual optimization objective these ad campaigns are run against on Facebook.
This raised the regression's usable sample from 42 events to several thousand
daily observations. It is a narrower, more conservative claim than before:
a conversation starting is a real but weaker signal of customer intent than
a Facebook-attributed purchase event. See `ADS-DAILY-PLAN.md` for the
verification behind this change.

## What PCM DSS actually is

A role-gated Facebook ad and page performance analytics dashboard for a PC
merchandise business. It ingests Facebook CSV exports, runs statistical
analysis server-side, and surfaces the results to three roles (Marketing
Manager, Sales Director, Business Owner) so they can make decisions **about
the Facebook marketing channel** without doing the math by hand.

Concretely, in scope:
- Ad performance: spend, reach, impressions, messaging conversations started
  (the system's primary ad-outcome metric).
- Page performance: follows, interactions, link clicks, views, visits,
  follower growth, viewer demographics.
- Organic post performance: reach, reactions, comments, shares, engagement rate.
- Derived analysis: Spearman/Pearson correlation, multiple linear regression
  (messaging conversations ~ reach + spend), Holt-Winters forecasting (page
  views, 7-day horizon), Monte Carlo what-if simulation, budget-allocation
  recommendations ranked by cost per messaging conversation, and an AI
  chat/insights layer that summarizes the above.

## What PCM DSS is not

- **Not an inventory system.** No stock levels, reorder points, or supplier data.
- **Not a sales or financial/cash-flow system.** No margin, cost-of-goods,
  purchase, or transaction data — "messaging conversations started" means
  Facebook's reported count of customers who opened a chat with the page in
  response to an ad. It is a top-of-funnel engagement signal, not a sale,
  order, inquiry commitment, or verified purchase intent — weaker, in fact,
  than the "Purchases"-labeled metric this system used previously. The system
  deliberately drops all sales/purchase framing to stay honest about what it
  can see: ad efficiency and engagement, not transactions.
- **Not a pricing tool.** No price-elasticity or competitor data.
- **Not a general business DSS.** Every input, output, and decision surface in
  the system is downstream of one channel: Facebook. A perfectly accurate
  version of this system would still only ever answer "how is our Facebook
  marketing doing and what should we do about ad spend" — not "should we
  restock X" or "should we raise prices."

## The honest framing to use in the defense

> "PCM DSS is a Facebook marketing-analytics decision-support tool for a PC
> merchandise business — not a comprehensive business decision-support
> system. It supports one specific, real decision a small merchandise
> reseller makes regularly (how to allocate ad spend and interpret marketing
> performance), using messaging-conversation volume — the objective
> Facebook's own campaign delivery is optimized against — as its ad-outcome
> signal, and does that with real, backtested statistical methods (see
> `PCM-DSS-Forecast-Validation-Report.docx`). It does not currently touch
> inventory, pricing, or cash flow, and does not claim to. It also does not
> claim that a messaging conversation is a confirmed sale or purchase intent
> — only that it is the engagement signal Facebook itself targets and the
> best-covered outcome data available across the full 12-month dataset."

This is a stronger position for a defense than an unqualified "DSS" claim:
it's specific, it's falsifiable, and every claim in it is backed by evidence
already produced (`CAPSTONE-IMPROVEMENTS.md`, the forecast validation report,
`ADS-DAILY-PLAN.md`, the `lib/stats/` test suite).

## What was changed to match this framing

- `lib/stats/regression.ts` — outcome variable changed from `inquiries` to
  `total_messaging_contacts`; `messaging` dropped as a predictor (was
  circular once it became the outcome); formula is now
  `MessagingConversations = β₀ + β₁·Reach + β₂·Spend`.
- `lib/stats/ad-set-metrics.ts`, `lib/stats/cost-cutting.ts` — efficiency
  scoring changed from inquiries-per-peso to messaging-conversations-per-peso.
- `lib/stats/simulation.ts` — What-If Simulator's "messaging" input control
  removed; simulator now varies reach/spend to predict messaging conversations.
- `actions/chat.ts` — AI chat system prompt updated so it describes messaging
  conversations, not inquiries, and does not imply purchase/sale intent.
- Dashboard KPI cards, regression/correlation views, reports (`ReportView`,
  `RegressionSummary`, `CorrelationTable`) — relabeled from "Inquiries" to
  "Messaging Conversations" throughout.
- `actions/upload.ts` — daily CSV upload replaces monthly (supersedes
  overlapping periods) — see `ADS-DAILY-PLAN.md` for the mechanics.
- `app/layout.tsx`'s page metadata reviewed and left as-is: still correctly
  scoped to "Facebook Ads Analytics."
- `PRODUCT.md`'s "Product Purpose" section — updated to reference messaging
  conversations rather than inquiries as the marketing-decision signal.

## Note: sales/revenue data is intentionally out of scope

An earlier draft of this document proposed connecting a non-marketing data
source (e.g. actual units sold or revenue) as an optional future path to
broaden the "DSS" claim. That direction was explicitly rejected: the
project's scope is locked to ad efficiency, expense reduction, and
engagement — no sales, purchases, or transaction data, full stop. Neither the
former "Purchases" column nor the current "Messaging conversations started"
metric is ever treated as a proxy for revenue or sales performance. This
keeps the system's claims falsifiable and matched to the data it actually has.
```

---

## Open items still pending your confirmation

1. **Display terminology** — this draft uses "Messaging Conversations" as the
   UI label (replacing "Inquiries" on KPI cards, reports, chat copy). If you
   want different wording (e.g. "Conversation Starts," "Engagement Events"),
   say so before the UI sweep starts — it's the same rename either way, just
   a different string.
2. **Predictor-set fork above** — dropping `messaging` as a regression
   predictor. This is the only statistically valid option once it's the
   outcome, but flagging again since it's your methodology to defend.
3. **Simulator rework scope** — turning the What-If Simulator into a
   reach/spend-only tool is a real feature change, not just a rename. Confirm
   you want that in this pass rather than deferred.

## What happens after you confirm

A full implementation sweep across `lib/stats/`, `lib/insights/`, the upload
pipeline (reverting to single-`Ad`-table + supersede, since the reason to keep
tables separate — protecting `inquiries` — no longer applies), dashboards, and
docs (`PRODUCT.md`, `ALGORITHMS.md`, `CAPSTONE-IMPROVEMENTS.md`,
`system_design.md`, `docs/data_catalog.md`). Given the footprint (~40 code
files, ~10 docs), recommend phasing: stats layer first (verify regression
output looks sane on real data) → UI relabel → docs. Will write that as its
own plan once you've confirmed the items above.
