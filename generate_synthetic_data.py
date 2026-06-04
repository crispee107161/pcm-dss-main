#!/usr/bin/env python3
"""
PCM-DSS Synthetic Data Generator
=================================
Generates realistic synthetic Facebook Ads and Page Metric CSV files
based on statistical properties observed in the real data (Sep 2025 – Jan 2026).

The generated data preserves the inter-metric relationships the MLR depends on:
    Amount Spent → Reach → Messaging Contacts → Purchases

No external dependencies required — pure Python stdlib only.

Usage:
    python generate_synthetic_data.py

Output:
    data/Ads/synthetic/                — Monthly Ads CSVs (14 months)
    data/Page-Level Metrics/synthetic/ — Daily metric CSVs (5 metrics × 14 months)

After generation, upload the files through the DSS upload interface.
The MLR model auto-retrains after each Ads CSV upload.
"""

import csv
import random
from datetime import date, timedelta
from pathlib import Path

# ── Reproducible output ──────────────────────────────────────────────────────
random.seed(42)

# ── Output directories ───────────────────────────────────────────────────────
ROOT = Path(__file__).parent
ADS_OUT = ROOT / "data" / "Ads" / "synthetic"
METRICS_OUT = ROOT / "data" / "Page-Level Metrics" / "synthetic"
ADS_OUT.mkdir(parents=True, exist_ok=True)
METRICS_OUT.mkdir(parents=True, exist_ok=True)


# ── Helpers ──────────────────────────────────────────────────────────────────

def gauss(mean: float, std: float, lo: float = None, hi: float = None) -> float:
    v = random.gauss(mean, std)
    if lo is not None:
        v = max(lo, v)
    if hi is not None:
        v = min(hi, v)
    return v


def month_end(year: int, month: int) -> date:
    if month == 12:
        return date(year + 1, 1, 1) - timedelta(days=1)
    return date(year, month + 1, 1) - timedelta(days=1)


# ── Ad templates ─────────────────────────────────────────────────────────────
# Derived from the three real Ads CSVs (Sep 2025, Dec 2025, Jan 2026).
# Fields: (ad_name, ad_set_name, spend_mean_php, spend_std, purchase_prob)
# spend_mean is calibrated to the Dec 2025 peak (SEASONAL multiplier = 1.0).
AD_TEMPLATES = [
    # ── High-spend conversion ads — usually yield purchases ──────────────────
    ("R5 5600G 8 MID PARANAQUE OK G",
     "ALL REELS SHOP",            8200, 2200, 0.85),
    ("RYZEN 5 PINK OK G",
     "ALL REELS PC SET",          7800, 2000, 0.80),
    ("6 trad san mateo (winning) OK G",
     "ALL REELS SHOP",            6200, 1800, 0.75),
    ("RYZEN 5 5600G 8PCS north cal OK G",
     "ALL REELS SHOP",            5800, 1600, 0.75),
    ("PC SET COMSHOP PACKAGE",
     "PC SET AND COMSHOP 25 26",  5200, 1400, 0.80),
    ("r5 5600g 10+1+1 norzagaray OK G",
     "ALL REELS SHOP",            4800, 1400, 0.65),
    ("r5 3400g 8+1 gaya gaya OK G",
     "ALL REELS SHOP",            3800, 1200, 0.65),
    ("THE RYZEN 9 3900X OK G",
     "ALL REELS PC SET",          3200, 1000, 0.70),
    ("COMSHOP PACKAGE OK G",
     "PC SET AND COMSHOP 25 26",  3100,  950, 0.75),
    # ── Medium-spend conversion ads ──────────────────────────────────────────
    ("r5 5700x rtx4060 y68 white OK",
     "ALL REELS PC SET",          2100,  750, 0.65),
    ("RYZEN 7 5700X 4060 ROBIN OK G",
     "ALL REELS PC SET",          1900,  650, 0.60),
    ("R5 5600G POSEIDON OK G",
     "ALL REELS PC SET",          1850,  600, 0.70),
    ("R5 5600G 4 MID HIGHLIGHTS OK G",
     "ALL REELS SHOP",            1750,  580, 0.55),
    ("R7 5700X 4060 Y68 OK G",
     "ALL REELS PC SET",          1550,  480, 0.65),
    ("R7 NEW PINK OK G",
     "ALL REELS PC SET",          1200,  380, 0.60),
    ("THE RYZEN 9 3900X",
     "ALL REELS PC SET",          1500,  450, 0.60),
    # ── Low-spend conversion ads — seldom have purchases ─────────────────────
    ("RYZEN 5 5600G 10+1 tattoo OK G",
     "ALL REELS SHOP",             520,  180, 0.35),
    ("r5 5600g 15+1+1 sta mesa OK G",
     "ALL REELS SHOP",             420,  140, 0.30),
    ("r5 5600g 8+1 paranaque OK G",
     "ALL REELS SHOP",             360,  120, 0.30),
    ("r7 5700g 10+1 tanza OK G",
     "ALL REELS SHOP",             310,   95, 0.25),
    ("r5 5500 rx580 novaliches qc OK G",
     "ALL REELS SHOP",             280,   90, 0.25),
    # ── Awareness / reach campaigns — no purchases, very high reach ──────────
    ("DAN TRES G",
     "AWARENESS VIDEO - VLOG|UPDATES|COMSHOP", 1500, 480, 0.0),
    ("LOOKING COMSHOP PACKAGE G MID G",
     "AWARENESS VIDEO - VLOG|UPDATES|COMSHOP", 5200, 1800, 0.0),
    ("Update Raffle",
     "AWARENESS VIDEO - VLOG|UPDATES|COMSHOP", 1250, 400, 0.0),
]

# ── Seasonal spend/reach multipliers ─────────────────────────────────────────
# Philippine PC retail: ber-months (Sep–Dec) are peak; Jan–Feb post-holiday dip.
SEASONAL = {
    1: 0.72, 2: 0.68, 3: 0.78, 4: 0.82, 5: 0.80,
    6: 0.78, 7: 0.83, 8: 0.88, 9: 1.00, 10: 1.08,
    11: 1.18, 12: 1.28,
}

# ── Page-metric baselines (observed Sep 2025 – Jan 2026 data) ─────────────────
# mean = value at Sep 2025 baseline; std = spread; dow = day-of-week variance.
PAGE_BASELINES = {
    "Views":        {"mean": 25500, "std": 3800, "dow": 0.15},
    "Visits":       {"mean": 1250,  "std": 210,  "dow": 0.12},
    "Interactions": {"mean": 460,   "std": 85,   "dow": 0.18},
    "Link clicks":  {"mean": 125,   "std": 28,   "dow": 0.15},
    "Follows":      {"mean": 58,    "std": 16,   "dow": 0.20},
}

# Month-over-month organic growth (page was growing before Sep 2025)
MONTHLY_GROWTH = 0.028


# ── Ad CSV generation ─────────────────────────────────────────────────────────

def _quality_rankings(efficiency_php_per_msg: float):
    """Return (quality, engagement, conversion) ranking strings."""
    if efficiency_php_per_msg < 12:
        return "Above average", "Above average", "Above average"
    if efficiency_php_per_msg < 20:
        return "Above average", "Above average", "Average"
    if efficiency_php_per_msg < 35:
        return "Average", "Above average", "Average"
    return "Average", "Average", "Average"


def generate_ad_row(
    ad_name: str,
    ad_set_name: str,
    spend_mean: float,
    spend_std: float,
    purchase_prob: float,
    reporting_starts: date,
    reporting_ends: date,
    effective_mult: float,
) -> dict:
    """
    Generate one synthetic ad row.

    All metrics derive from amount_spent, preserving the causal chain:
        spend -> reach -> messaging -> purchases
    This is exactly the relationship the MLR models.
    """
    is_awareness = ad_set_name.startswith("AWARENESS")

    # Amount spent — the root driver
    spend = max(15.0, gauss(
        spend_mean * effective_mult,
        spend_std  * effective_mult * 0.55,
        lo=15.0,
    ))
    spend = round(spend, 2)

    if is_awareness:
        # Awareness: optimised for reach (CPM ~8-14 PHP), no purchase tracking
        reach = int(max(1500, gauss(spend * 115, spend * 25, lo=500)))
        impressions = int(reach * gauss(1.18, 0.07, 1.05, 1.45))
        link_clicks = int(max(3, gauss(reach * 0.0011, reach * 0.0003, lo=1)))
        messaging = int(max(0, gauss(spend * 0.004, spend * 0.002, lo=0)))
        new_messaging = int(messaging * gauss(0.72, 0.10, 0.30, 1.0))
        results = reach
        result_indicator = "reach"
        cost_per_result = round(spend / max(1, reach), 8)
        purchases = ""
        cost_per_purchase = ""
        cost_per_new_msg = ""
        messaging_started = messaging
        cost_per_msg_started = (
            round(spend / max(1, messaging), 6) if messaging > 0 else ""
        )
        quality, engagement_rank, conversion_rank = "Average", "-", "-"

    else:
        # Conversion: tracked purchases, lower reach
        reach_rate = gauss(2.9, 0.7, lo=1.2)
        reach = int(max(80, spend * reach_rate))
        impressions = int(reach * gauss(2.05, 0.28, 1.4, 3.6))
        link_clicks = int(max(3, gauss(reach * 0.044, reach * 0.011, lo=1)))

        # Messaging ~1-4% of reach
        msg_rate = gauss(0.020, 0.008, lo=0.004, hi=0.07)
        messaging = int(max(1, reach * msg_rate))
        new_messaging = int(messaging * gauss(0.68, 0.11, 0.25, 1.0))
        messaging_started = messaging
        cost_per_msg_started = round(spend / max(1, messaging), 6)

        result_indicator = (
            "actions:onsite_conversion.messaging_conversation_started_7d"
        )
        results = messaging
        cost_per_result = round(spend / max(1, results), 8)

        if random.random() < purchase_prob and messaging >= 4:
            p_rate = gauss(0.026, 0.020, lo=0.003, hi=0.14)
            purchases = max(1, int(messaging * p_rate))
            cost_per_purchase = round(spend / purchases, 6)
        else:
            purchases = ""
            cost_per_purchase = ""

        efficiency = spend / max(1, messaging)
        quality, engagement_rank, conversion_rank = _quality_rankings(efficiency)

        cost_per_new_msg = (
            round(spend / max(1, new_messaging), 6) if new_messaging > 0 else ""
        )

    return {
        "Reporting starts": reporting_starts.isoformat(),
        "Reporting ends":   reporting_ends.isoformat(),
        "Ad name":          ad_name,
        "Ad delivery":      "active",
        "Ad set name":      ad_set_name,
        "Bid":              0,
        "Bid type":         "ABSOLUTE_OCPM",
        "Ad set budget":    "Using campaign budget",
        "Ad set budget type": 0,
        "Last significant edit": 0,
        "Attribution setting": "7-day click or 1-day view",
        "Results":          results,
        "Result indicator": result_indicator,
        "Reach":            reach,
        "Impressions":      impressions,
        "Cost per results": cost_per_result,
        "Quality ranking":  quality,
        "Engagement rate ranking":  engagement_rank,
        "Conversion rate ranking":  conversion_rank,
        "Amount spent (PHP)": spend,
        "Ends":             "2026-12-31",
        "Total messaging contacts":   messaging if not is_awareness else (messaging or ""),
        "New messaging contacts":     new_messaging if not is_awareness else (new_messaging or ""),
        "Purchases":                  purchases,
        "Cost per purchase (PHP)":    cost_per_purchase,
        "Purchases conversion value": "",
        "Purchase ROAS (return on ad spend)": "",
        "Cost per new messaging contact (PHP)": cost_per_new_msg,
        "Messaging conversations started": (
            messaging_started if not is_awareness else (messaging or "")
        ),
        "Cost per messaging conversation started (PHP)": cost_per_msg_started,
        "Orders created":  "",
        "Orders shipped":  "",
        "Link clicks":     link_clicks,
    }


def generate_ads_month(year: int, month: int) -> list:
    """Generate all ad rows for one calendar month."""
    start = date(year, month, 1)
    end = month_end(year, month)
    seasonal_mult = SEASONAL.get(month, 1.0)

    # Earlier in 2025 the account was smaller — ramp up from 60% to 100%
    if year == 2025 and month < 9:
        ramp = 0.60 + (month / 9) * 0.40
    else:
        ramp = 1.0

    effective_mult = seasonal_mult * ramp

    rows = []
    for ad_name, ad_set_name, spend_mean, spend_std, purchase_prob in AD_TEMPLATES:
        # Smaller ads don't run every month
        skip_prob = 0.20 if spend_mean < 800 else 0.08
        if random.random() < skip_prob:
            continue
        row = generate_ad_row(
            ad_name, ad_set_name, spend_mean, spend_std, purchase_prob,
            start, end, effective_mult,
        )
        rows.append(row)
    return rows


ADS_FIELDNAMES = [
    "Reporting starts", "Reporting ends", "Ad name", "Ad delivery", "Ad set name",
    "Bid", "Bid type", "Ad set budget", "Ad set budget type", "Last significant edit",
    "Attribution setting", "Results", "Result indicator", "Reach", "Impressions",
    "Cost per results", "Quality ranking", "Engagement rate ranking",
    "Conversion rate ranking", "Amount spent (PHP)", "Ends",
    "Total messaging contacts", "New messaging contacts",
    "Purchases", "Cost per purchase (PHP)", "Purchases conversion value",
    "Purchase ROAS (return on ad spend)", "Cost per new messaging contact (PHP)",
    "Messaging conversations started", "Cost per messaging conversation started (PHP)",
    "Orders created", "Orders shipped", "Link clicks",
]


def write_ads_csv(year: int, month: int, rows: list) -> None:
    end_day = month_end(year, month).day
    filename = (
        f"PCM-Ads-Synthetic-"
        f"{year}-{month:02d}-01-to-{year}-{month:02d}-{end_day:02d}.csv"
    )
    filepath = ADS_OUT / filename

    with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(
            f, fieldnames=ADS_FIELDNAMES, quoting=csv.QUOTE_ALL
        )
        writer.writeheader()
        writer.writerows(rows)

    n_purchase = sum(1 for r in rows if r["Purchases"] != "")
    total_spend = sum(r["Amount spent (PHP)"] for r in rows)
    print(f"  {filename}")
    print(f"    rows={len(rows)}, with_purchases={n_purchase}, "
          f"total_spend=PHP {total_spend:,.0f}")


# ── Page metric CSV generation ────────────────────────────────────────────────

def generate_daily_metrics(year: int, month: int) -> list:
    """
    Generate daily page metric values for one month.
    Earlier months are scaled down by MONTHLY_GROWTH to simulate a
    growing Facebook page leading up to Sep 2025.
    """
    months_before = (2025 - year) * 12 + (9 - month)
    growth_factor = (1 - MONTHLY_GROWTH) ** max(0, months_before)
    seasonal_mult = SEASONAL.get(month, 1.0)

    rows = []
    current = date(year, month, 1)
    end = month_end(year, month)

    while current <= end:
        dow = current.weekday()          # 0=Mon … 6=Sun
        dow_mult = 1.13 if dow >= 5 else (0.94 if dow == 0 else 1.0)

        row = {"date": current.isoformat()}
        for metric, p in PAGE_BASELINES.items():
            base = p["mean"] * growth_factor * seasonal_mult * dow_mult
            value = max(0, int(gauss(base, base * p["dow"] * 0.55)))
            row[metric] = value
        rows.append(row)
        current += timedelta(days=1)

    return rows


def write_page_metric_csv(year: int, month: int, metric: str, rows: list) -> None:
    """
    Write one page-metric CSV in UTF-16 LE with BOM — matching the encoding
    the DSS parser sniffs for (0xFF 0xFE BOM → TextDecoder('utf-16le')).

    File structure:
        sep=,
        "MetricName"
        "Date","Primary"
        "YYYY-MM-DDTHH:MM:SS","value"
    """
    safe_name = metric.replace(" ", "_")
    filename = f"{safe_name}-Synthetic-{year}-{month:02d}.csv"
    filepath = METRICS_OUT / filename

    lines = [
        "sep=,\n",
        f'"{metric}"\n',
        '"Date","Primary"\n',
    ]
    for row in rows:
        lines.append(f'"{row["date"]}T00:00:00","{row[metric]}"\n')

    content = "".join(lines)

    with open(filepath, "wb") as f:
        f.write(b"\xff\xfe")                   # UTF-16 LE BOM
        f.write(content.encode("utf-16-le"))   # Content


# ── Months to generate ────────────────────────────────────────────────────────
# Real data: Sep 2025, Dec 2025, Jan 2026.
# Synthetic fills in the gaps for 15-month continuous coverage.
SYNTH_MONTHS = [
    # 2025 — before Sep (growing account)
    (2025, 1), (2025, 2), (2025, 3), (2025, 4),
    (2025, 5), (2025, 6), (2025, 7), (2025, 8),
    # 2025 — gap between Sep and Dec
    (2025, 10), (2025, 11),
    # 2026 — continuing after Jan
    (2026, 2), (2026, 3), (2026, 4), (2026, 5),
]

PAGE_METRICS = ["Views", "Visits", "Interactions", "Link clicks", "Follows"]


# ── Entry point ───────────────────────────────────────────────────────────────

def main() -> None:
    print()
    print("PCM-DSS Synthetic Data Generator")
    print("=" * 50)
    print()
    print(f"Generating {len(SYNTH_MONTHS)} months of synthetic data")
    print(f"  Real data covers : Sep 2025 | Dec 2025 | Jan 2026")
    print(f"  Synthetic fills  : Jan-Aug 2025 | Oct-Nov 2025 | Feb-May 2026")
    print()

    # ── Ads CSVs ─────────────────────────────────────────────────────────────
    print("Ads CSVs")
    print("-" * 50)
    total_rows = 0
    total_purchase_rows = 0
    for year, month in SYNTH_MONTHS:
        rows = generate_ads_month(year, month)
        write_ads_csv(year, month, rows)
        total_rows += len(rows)
        total_purchase_rows += sum(1 for r in rows if r["Purchases"] != "")

    print()
    print(f"  Synthetic ads generated : {total_rows} rows")
    print(f"  Synthetic purchase rows : {total_purchase_rows}")
    print(f"  Real purchase rows      : ~42")
    print(f"  Combined total estimate : ~{total_purchase_rows + 42} purchase records")
    print()

    # ── Page Metric CSVs ─────────────────────────────────────────────────────
    print("Page Metric CSVs")
    print("-" * 50)
    metric_files = 0
    for year, month in SYNTH_MONTHS:
        daily_rows = generate_daily_metrics(year, month)
        days = len(daily_rows)
        for metric in PAGE_METRICS:
            write_page_metric_csv(year, month, metric, daily_rows)
            metric_files += 1
        print(f"  {year}-{month:02d}  {days} days x {len(PAGE_METRICS)} metrics")

    print()
    print(f"  Total metric files : {metric_files}")
    print()

    # ── Summary ──────────────────────────────────────────────────────────────
    print("Output locations")
    print("-" * 50)
    print(f"  Ads     : {ADS_OUT}")
    print(f"  Metrics : {METRICS_OUT}")
    print()
    print("Next steps")
    print("-" * 50)
    print("  1. Upload the Ads CSVs via /dashboard/marketing/upload")
    print("     MLR model retrains automatically after each upload.")
    print()
    print("  2. Upload the Page Metric CSVs for trend/forecast pages.")
    print()
    print("  3. Check /dashboard/marketing/regression to see the updated")
    print("     R2 and whether prediction intervals tightened.")
    print()
    print("  Expected improvement:")
    print(f"    purchase records : ~42  ->  ~{total_purchase_rows + 42}")
    print( "    R2               : ~0.27 (SLR baseline) -> likely 0.35-0.55 (MLR)")
    print( "    prediction width : should shrink ~30-40%")
    print()


if __name__ == "__main__":
    main()
