# PCM-DSS — Upgrade Summary

> **Superseded 2026-08-14** by `docs/mvp.md` (rewritten 2026-08-12 for the MVP v2 respec) and `docs/PROGRESS.md`. This document reflects pre-respec scope/roles (e.g. Sales Director, cut analytics features) and is kept for historical reference only — do not treat it as current.

**Date:** June 5, 2026
**Project:** PC Merchandise Decision Support System
**Stack:** Next.js · TypeScript · PostgreSQL (Neon) · Vercel

---

## 1. Synthetic Data Generation

To strengthen the statistical models, a synthetic data generator (`generate_synthetic_data.py`) was built to produce realistic Facebook ad and page-level data that mirrors the real dataset's patterns and relationships.

### Files Generated

| File | Description | Records |
|---|---|---|
| `Ads-Synthetic.csv` | Facebook Ads with spend, reach, inquiries, impressions | ~180 ad records across 12 months |
| `Posts-Synthetic.csv` | Organic post metrics (reach, reactions, engagement rate) | ~120 posts (Oct 2025 – Jan 2026) |
| `Follows-Synthetic.csv` | Daily page follows | ~365 daily rows |
| `Interactions-Synthetic.csv` | Daily content interactions | ~365 daily rows |
| `Link clicks-Synthetic.csv` | Daily link clicks | ~365 daily rows |
| `Views-Synthetic.csv` | Daily page views | ~365 daily rows |
| `Visits-Synthetic.csv` | Daily page visits | ~365 daily rows |

**Key design rule:** Higher ad spend → higher reach → more messaging contacts → more inquiries. Correlations were intentionally preserved so the regression model trains correctly and produces meaningful results.

---

## 2. Algorithm Upgrade — Holt-Winters Forecasting

### What Was Replaced
The original forecast used a **7-day Simple Moving Average (SMA)** — a flat, backward-looking average that projects the same value every day into the future. It cannot detect growth, decline, or seasonal patterns.

### What Was Implemented
**Holt-Winters Triple Exponential Smoothing** — a time series forecasting method used by businesses and research institutions worldwide.

| Parameter | Value | Role |
|---|---|---|
| α (alpha) | 0.3 | Controls how fast the model reacts to new data (level) |
| β (beta) | 0.1 | Controls trend sensitivity |
| γ (gamma) | 0.3 | Controls seasonal adjustment |
| Period (m) | 7 | Weekly seasonality cycle |

**What it captures that SMA could not:**
- **Trend** — detects if page views are growing or declining over time
- **Seasonality** — detects weekly patterns (e.g., higher engagement on weekends)
- **Adaptive forecast** — each future day gets a unique projected value, not a flat line

**Fallback:** If fewer than 14 data points are available, the system automatically uses Holt Linear (double exponential smoothing, no seasonality) instead.

### Pages Updated
Holt-Winters is now applied across all three role dashboards:
- Marketing Manager — Page Metrics, Generate Report
- Sales Director — Page Metrics, Generate Report
- Business Owner — Page Metrics, Generate Report

---

## 3. Report Accuracy Fixes

### ROAS Column → CPI (Cost Per Acquisition)

| | Before | After |
|---|---|---|
| Column label | ROAS | CPI |
| Formula | `inquiries ÷ spend × 1,000` | `spend ÷ inquiries` |
| Issue | ROAS requires revenue data we do not have; the old formula was dimensionally incorrect | CPI is the correct metric when only inquiry counts are available |
| Example | `10 ÷ ₱5,000 × 1,000 = 2.0000` (meaningless) | `₱5,000 ÷ 10 = ₱500.00 per inquiry` (actionable) |

### Monthly Total Row Mismatch

| | Before | After |
|---|---|---|
| Issue | Total row summed **all ads ever uploaded** (all months), while the monthly rows only showed Sep / Dec / Jan — totals did not add up | Total row now sums **only the three displayed months** |
| Impact | Numbers appeared inflated and inconsistent | Totals now equal the sum of the rows above |

---

## 4. CSV Upload Fix

**Issue:** Uploading synthetic page-metric files (Follows, Interactions, Link clicks, Visits) failed with:
> `Unknown page metric name: "Visits"` / `"Link clicks"` / `"Interactions"` / `"Follows"`

**Root cause:** The parser only accepted Facebook's full export names (`"Facebook follows"`, `"Facebook visits"`, etc.) and did not recognise the shorter variants used in synthetic and some real exports.

**Fix:** Added short-name aliases to the metric name map in `lib/csv/parse.ts`. Both naming conventions now work.

---

## Summary

| Area | Change |
|---|---|
| Forecasting | Simple Moving Average → Holt-Winters Triple Exponential Smoothing |
| Report metrics | ROAS (wrong formula) → CPI (correct, actionable) |
| Report totals | All-time totals → period-accurate totals matching displayed rows |
| CSV upload | Accept both short and full Facebook metric names |
| Synthetic data | 7 CSV files generated covering 12 months of realistic data |
