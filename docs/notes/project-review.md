# Expert Capstone System Audit Request

You are acting as a panel of:

1. Senior Information Systems Professor
2. DSS (Decision Support System) Researcher
3. Business Intelligence Consultant
4. SME (Small and Medium Enterprise) Operations Consultant
5. Potential Client (PC Merchandise Owner)

I want you to critically evaluate my capstone project and determine whether it is truly a Decision Support System (DSS) or merely a reporting/dashboard system.

## Project Overview

Project Title:

**Decision Support System for Multi-Platform Sales and Marketing Insights**

Client:

**PC Merchandise, Muzon, San Jose del Monte, Bulacan**

Note: the project title says "Multi-Platform," but the implemented system is Facebook-only (Ads + Page data). Treat "multi-platform" as an unrealized ambition, not a current capability, when evaluating.

Current System Concept:

The system ingests Facebook Ads and Facebook Page performance data — there is no TikTok, Shopee, or internal sales-record integration, and no direct platform API calls.

Data sources (CSV upload only, no API integrations):

* Facebook Ads export
* Facebook Page-level metrics
* Facebook organic posts
* Audience demographics (age/gender/territory)
* Follower history

Main Features (already implemented):

* KPI Dashboard (per-role)
* Statistical Correlation Analysis (Spearman rank correlation, incl. lagged correlation)
* Multi-Variable Linear Regression
* Time-Series Forecasting (Holt-Winters triple exponential smoothing, falls back to Holt Linear under 14 data points)
* What-If Simulation
* Campaign Health Score
* Budget Allocator
* Campaign Rankings & Category Performance
* Audience/Demographics Analysis (age, gender, territory, follower growth)
* AI-Generated Insights & Chat (Groq LLM API)
* PDF Report Export (Puppeteer)
* CSV Import Management (per file-type validation via `lib/csv/`)
* Role-Based Access (enforced in `middleware.ts`, JWT-based via NextAuth)

  * Business Owner
  * Sales Director
  * Marketing Manager

Proposed / Not-Yet-Implemented Advanced Features:

* ANOVA
* Customer Lifetime Value (CLV) Prediction
* Recommendation Engine
* Any data source beyond Facebook (Shopee, TikTok, POS/internal sales)

Technology Stack:

* Next.js 16 (App Router), React 19, TypeScript
* Tailwind CSS v4
* Prisma ORM → PostgreSQL (Neon in production)
* NextAuth.js v5 (JWT sessions)
* Recharts (visualization)
* Groq API (AI insights/chat)
* Puppeteer (PDF report generation)
* No automated test suite currently exists

## Evaluation Tasks

### Part 1 — DSS Classification

Determine whether this project is:

* A true DSS
* A Business Intelligence Dashboard
* A Management Information System (MIS)
* A Reporting System
* A Hybrid BI + DSS

Explain why.

Use academic DSS definitions and compare the system against established DSS characteristics.

---

### Part 2 — Business Value Analysis

Evaluate whether this system would genuinely help PC Merchandise.

Answer:

* What business decisions can actually be improved?
* What decisions remain unsupported?
* What decisions are currently based on guesswork?
* Which decisions become data-driven after implementation?

Provide concrete examples.

---

### Part 3 — SME Scalability

Evaluate whether this system could realistically benefit:

* Computer stores
* Retail stores
* Online sellers
* Small businesses
* Medium businesses

For each business type:

* Rate usefulness from 1-10
* Explain why

---

### Part 4 — Critical Weaknesses

Act as a harsh capstone panelist.

Identify:

* Weak DSS components
* Missing analytical capabilities
* Missing decision models
* Missing forecasting features
* Missing recommendation mechanisms
* Missing business processes

List everything that would prevent this system from being considered a strong DSS.

Do not be nice.

Assume you are trying to fail the proposal if weaknesses exist.

---

### Part 5 — Research Contribution

Determine:

* Is this project innovative?
* Is it just another dashboard?
* Does it contribute something meaningful to SMEs?
* Is it thesis-worthy?
* Is it publishable as a conference paper?

Explain why.

---

### Part 6 — Client Perspective

Act as the owner of PC Merchandise.

Answer:

* Would I actually use this every week?
* Would I pay for this?
* What feature would make me keep using it?
* What feature is unnecessary?
* What would make me abandon the system?

Be brutally honest.

---

### Part 7 — Commercial Viability

Evaluate whether this could become a SaaS product.

Discuss:

* Market fit
* Competition
* Unique selling points
* Weaknesses
* Monetization opportunities

Compare it against:

* Power BI
* Looker Studio
* Tableau
* Shopify Analytics
* Shopee Analytics
* Meta Business Suite

Explain where PCM DSS is stronger and weaker.

---

### Part 8 — Final Verdict

Provide a final score:

| Category             | Score (1-10) |
| -------------------- | ------------ |
| DSS Quality          | ?            |
| Technical Design     | ?            |
| Business Value       | ?            |
| Innovation           | ?            |
| Research Quality     | ?            |
| Commercial Potential | ?            |

Then answer:

1. Is PCM DSS genuinely a DSS?
2. Would you approve it as a capstone?
3. Would you recommend major revisions?
4. What are the top 10 improvements required before deployment?
5. What would make this system exceptional instead of average?

Important:

Do not give generic feedback.

Challenge every assumption.

If the project has flaws, expose them.

If the project has strengths, explain why.

I want an honest professional assessment, not encouragement.