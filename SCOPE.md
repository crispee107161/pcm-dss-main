# PCM DSS — Honest Scope Statement

**Why this document exists**: a capstone panel review (2026-08-02) flagged that "Decision Support System" oversells what this project actually does — it analyzes one marketing channel (Facebook), not the business as a whole. This document exists so the thesis/defense narrative, the code, and the AI-facing copy all say the same true thing about scope, rather than three different claims of varying honesty.

## What PCM DSS actually is

A role-gated Facebook ad and page performance analytics dashboard for a PC merchandise business. It ingests Facebook CSV exports, runs statistical analysis server-side, and surfaces the results to three roles (Marketing Manager, Sales Director, Business Owner) so they can make decisions **about the Facebook marketing channel** without doing the math by hand.

Concretely, in scope:
- Ad performance: spend, reach, impressions, link clicks, inquiries (as reported by Facebook), messaging contacts.
- Page performance: follows, interactions, link clicks, views, visits, follower growth, viewer demographics.
- Organic post performance: reach, reactions, comments, shares, engagement rate.
- Derived analysis: Spearman/Pearson correlation, multiple linear regression (inquiries ~ reach + messaging + spend), Holt-Winters forecasting (page views, 7-day horizon), Monte Carlo what-if simulation, budget-allocation recommendations across ad sets, and an AI chat/insights layer that summarizes the above.

## What PCM DSS is not

- **Not an inventory system.** No stock levels, reorder points, or supplier data.
- **Not a sales or financial/cash-flow system.** No margin, cost-of-goods, purchase, or transaction data — "inquiries" here means Facebook's reported ad-attributed count of customers reaching out (the CSV column Facebook labels "Purchases"), not a sale, order, or verified revenue event. The system deliberately drops all sales/purchase framing to stay honest about what it can see: ad efficiency and engagement, not transactions.
- **Not a pricing tool.** No price-elasticity or competitor data.
- **Not a general business DSS.** Every input, output, and decision surface in the system is downstream of one channel: Facebook. A perfectly accurate version of this system would still only ever answer "how is our Facebook marketing doing and what should we do about ad spend" — not "should we restock X" or "should we raise prices."

## The honest framing to use in the defense

> "PCM DSS is a Facebook marketing-analytics decision-support tool for a PC merchandise business — not a comprehensive business decision-support system. It supports one specific, real decision a small merchandise reseller makes regularly (how to allocate ad spend and interpret marketing performance), and does that with real, backtested statistical methods (see `PCM-DSS-Forecast-Validation-Report.docx`). It does not currently touch inventory, pricing, or cash flow, and does not claim to."

This is a stronger position for a defense than an unqualified "DSS" claim: it's specific, it's falsifiable, and every claim in it is backed by evidence already produced (`CAPSTONE-IMPROVEMENTS.md`, the forecast validation report, the `lib/stats/` test suite).

## What was changed to match this framing

- `actions/chat.ts` — the AI chat system prompt previously described itself as "an AI business analyst inside the PC Merchandise Decision Support System," which implied broader visibility than the AI actually has. Changed to explicitly state it only sees Facebook marketing data and to say so plainly if asked about inventory, pricing, or cash flow, rather than guessing. This was a live, user-facing overclaim (the AI would have plausibly hallucinated confidence in areas with zero data), not just a documentation issue — fixed in code, not just in this write-up.
- `app/layout.tsx`'s page metadata (`title: 'PC Merchandise DSS'`, `description: 'Decision Support System for PC Merchandise Facebook Ads Analytics'`) was reviewed and left as-is: the description already correctly scopes the name to "Facebook Ads Analytics," so the brand name itself doesn't need to change — the scoping just needs to be consistent everywhere it's implied, which is what this pass fixed.
- `PRODUCT.md`'s "Product Purpose" section already scopes correctly ("a decision support system that turns raw Facebook Ads/Page CSV exports into statistical analysis... so each role can make merchandise/marketing decisions") — no change needed there.

## Note: sales/revenue data is intentionally out of scope

An earlier draft of this document proposed connecting a non-marketing data source (e.g. actual units sold or revenue) as an optional future path to broaden the "DSS" claim. That direction was explicitly rejected: the project's scope is now locked to ad efficiency, expense reduction, engagement, and customer inquiries — no sales, purchases, or transaction data, full stop. The "Purchases" column Facebook exports is treated purely as an inquiry-volume signal, never as a proxy for revenue or sales performance. This keeps the system's claims falsifiable and matched to the data it actually has.
