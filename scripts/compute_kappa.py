"""
PCM DSS — Inter-coder reliability for the ground-truth sample.

Run AFTER both coders return their sheets and BEFORE any discussion
between them. The whole point of the measure is that it reflects
independent coding.

USAGE
    python3 compute_kappa.py

INPUT   ./coding/coding_sheet_CODER_A.csv
        ./coding/coding_sheet_CODER_B.csv

OUTPUT  ./coding/reliability_report.txt   <- for the appendix
        ./coding/confusion_matrix.csv     <- for the appendix
        ./coding/disagreements.csv        <- work sheet for resolution
"""

import pandas as pd
import numpy as np
import os
from datetime import datetime

CODING_DIR = "./coding"
VALID = ["product_showcase", "promotional_offer", "testimonial",
         "entertainment", "unclear"]


def load(coder: str) -> pd.DataFrame:
    path = os.path.join(CODING_DIR, f"coding_sheet_CODER_{coder}.csv")
    d = pd.read_csv(path, encoding="utf-8-sig")
    d["category"] = d["category"].fillna("").astype(str).str.strip().str.lower()
    bad = sorted(set(d.loc[d.category != "", "category"]) - set(VALID))
    if bad:
        raise SystemExit(f"Coder {coder} used invalid labels: {bad}\nValid: {VALID}")
    blank = int((d.category == "").sum())
    if blank:
        raise SystemExit(f"Coder {coder} left {blank} rows unlabelled. Every row needs a label.")
    return d


def cohens_kappa(a, b, labels):
    """
    Computed longhand so the arithmetic is inspectable and can be
    reproduced by hand at defence.

        kappa = (p_o - p_e) / (1 - p_e)
    """
    n = len(a)
    p_o = float(np.mean(np.asarray(a) == np.asarray(b)))
    p_e = 0.0
    parts = []
    for lab in labels:
        pa = float(np.mean(np.asarray(a) == lab))
        pb = float(np.mean(np.asarray(b) == lab))
        p_e += pa * pb
        parts.append((lab, pa, pb, pa * pb))
    kappa = (p_o - p_e) / (1 - p_e) if p_e != 1 else float("nan")
    return kappa, p_o, p_e, parts, n


def landis_koch(k: float) -> str:
    if k < 0:      return "poor"
    if k <= 0.20:  return "slight"
    if k <= 0.40:  return "fair"
    if k <= 0.60:  return "moderate"
    if k <= 0.80:  return "substantial"
    return "almost perfect"


def main() -> None:
    A, B = load("A"), load("B")

    if not A.post_id.astype(str).equals(B.post_id.astype(str)):
        raise SystemExit("The two sheets do not cover the same posts in the same order.")

    a, b = A.category.values, B.category.values
    used = [l for l in VALID if l in set(a) | set(b)]

    kappa, p_o, p_e, parts, n = cohens_kappa(a, b, used)

    # confusion matrix
    cm = pd.crosstab(pd.Series(a, name="CODER_A"),
                     pd.Series(b, name="CODER_B"),
                     dropna=False).reindex(index=used, columns=used, fill_value=0)
    cm.to_csv(os.path.join(CODING_DIR, "confusion_matrix.csv"), encoding="utf-8-sig")

    # disagreements
    dis = A[["row_no", "post_id", "post_type", "caption"]].copy()
    dis["coder_A"] = a
    dis["coder_B"] = b
    dis = dis[dis.coder_A != dis.coder_B].copy()
    dis["resolved_category"] = ""
    dis["resolution_note"] = ""
    dis.to_csv(os.path.join(CODING_DIR, "disagreements.csv"),
               index=False, encoding="utf-8-sig")

    # marginals
    dist_a = pd.Series(a).value_counts().reindex(used, fill_value=0)
    dist_b = pd.Series(b).value_counts().reindex(used, fill_value=0)

    lines = []
    lines.append("PCM DSS — Inter-coder reliability report")
    lines.append(f"Generated: {datetime.now().isoformat(timespec='seconds')}")
    lines.append("")
    lines.append(f"Posts coded (n)          : {n}")
    lines.append(f"Categories used          : {used}")
    lines.append("")
    lines.append("COHEN'S KAPPA")
    lines.append(f"  Observed agreement p_o : {p_o:.4f}   ({int(p_o*n)} of {n} posts)")
    lines.append(f"  Expected agreement p_e : {p_e:.4f}")
    lines.append(f"  kappa = (p_o - p_e) / (1 - p_e)")
    lines.append(f"        = ({p_o:.4f} - {p_e:.4f}) / (1 - {p_e:.4f})")
    lines.append(f"        = {kappa:.4f}")
    lines.append(f"  Landis & Koch (1977)   : {landis_koch(kappa)}")
    lines.append("")
    lines.append("p_e COMPONENTS  (coder A marginal x coder B marginal, per category)")
    for lab, pa, pb, prod in parts:
        lines.append(f"  {lab:<20} {pa:.4f} x {pb:.4f} = {prod:.4f}")
    lines.append("")
    lines.append("CATEGORY DISTRIBUTION")
    lines.append(f"  {'category':<20} {'A':>6} {'B':>6}")
    for lab in used:
        lines.append(f"  {lab:<20} {dist_a[lab]:>6} {dist_b[lab]:>6}")
    lines.append("")
    top_share = max(dist_a.max(), dist_b.max()) / n
    lines.append(f"  Largest category share : {top_share:.1%}")
    if top_share > 0.55:
        lines.append("  NOTE: the sample is dominated by one category. Cohen's kappa is")
        lines.append("  depressed under skewed marginals (the 'kappa paradox'), so this")
        lines.append("  value understates coding quality relative to a balanced sample.")
        lines.append("  Report percentage agreement and the confusion matrix alongside it.")
    lines.append("")
    lines.append("CONFUSION MATRIX (rows = coder A, columns = coder B)")
    lines.append(cm.to_string())
    lines.append("")
    lines.append(f"Disagreements: {len(dis)} of {n} ({len(dis)/n:.1%})")
    if len(dis):
        pair = (dis.coder_A + " <-> " + dis.coder_B).value_counts()
        lines.append("Most common disagreement pairs:")
        for k_, v_ in pair.head(5).items():
            lines.append(f"  {k_:<45} {v_}")
    lines.append("")
    lines.append("NEXT STEP")
    lines.append("  Resolve disagreements.csv by discussion (or a third coder).")
    lines.append("  Fill 'resolved_category' and 'resolution_note'.")
    lines.append("  Do NOT overwrite either coder's original sheet — both are appendix evidence.")

    report = "\n".join(lines)
    with open(os.path.join(CODING_DIR, "reliability_report.txt"), "w", encoding="utf-8") as fh:
        fh.write(report)
    print(report)


if __name__ == "__main__":
    main()
