# Prophet vs Holt-Winters: Forecasting Decision

## What the Codebase Already Has

The codebase has a working forecasting algorithm — **Holt-Winters Triple Exponential Smoothing** — implemented in pure TypeScript at `lib/stats/forecast.ts:65`. It is already wired up to 6 pages (3 `page-metrics` pages + 3 `report` pages) and runs inside Next.js with no external dependencies.

---

## Why Prophet Can't Just Replace It Directly

Prophet is a Python library. It cannot run inside a Node.js/Next.js process. To use it you'd need:

| Layer | What changes |
|---|---|
| **New: Python microservice** | A small FastAPI/Flask app that loads Prophet, receives time-series data, returns forecast JSON |
| **Backend (Next.js API routes)** | New API routes that call the Python service instead of `computeHoltWintersForecast` |
| **Frontend (6 pages)** | The 6 pages that currently call `computeHoltWintersForecast` directly need to hit the new API routes |
| **Infrastructure** | Python process must run alongside Next.js (e.g., on a separate port) |

---

## Honest Trade-off

Holt-Winters already handles **weekly seasonality** (period=7) reasonably well.

What Prophet adds specifically is **yearly seasonality detection** — Christmas spike, back-to-school, ber-months peaks, etc. This is exactly why generating 2+ years of data matters. Holt-Winters with a 7-day period cannot see the December spike pattern across years.

Prophet also handles **changepoints** (sudden growth pattern shifts), which Holt-Winters does not.

---

## Why 2+ Years of Data Matters for Prophet

Prophet's documentation recommends at least 2 years of daily data to reliably detect yearly seasonality. The synthetic data generation (Jan 2024 → May 2026) now provides ~29 months of coverage, meeting this requirement.

---

## Summary

| | Holt-Winters (current) | Prophet |
|---|---|---|
| Language | TypeScript (runs in Next.js) | Python only |
| Weekly seasonality | ✓ | ✓ |
| Yearly seasonality | ✗ | ✓ |
| Changepoint detection | ✗ | ✓ |
| Implementation effort | Already done | Full-stack change |
| Stack changes required | None | Python service + API routes + frontend wiring |

Implementing Prophet is doable but non-trivial — it requires a Python microservice, new Next.js API routes, and updates to the 6 pages currently calling `computeHoltWintersForecast` directly.
