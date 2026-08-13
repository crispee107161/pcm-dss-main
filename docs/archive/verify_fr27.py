"""
FR-27 cohort-restricted lifecycle curve — reproduction script.

SOURCE: the DAILY ads export (19 columns, has a `Day` column).
        Filenames: john-bernard-olermo-ads-<month>.csv  (12 files)
        This is NOT the 93-column PCM-ADS-*.csv monthly export.
        The monthly export CANNOT produce week-of-life buckets.

Run from the folder containing the 12 daily files.
"""
import pandas as pd, glob, numpy as np

files = sorted(glob.glob('*ads*.csv'))
assert len(files) == 12, f"expected 12 daily files, found {len(files)}"

df = pd.concat([pd.read_csv(f, encoding='utf-8-sig') for f in files], ignore_index=True)
assert 'Day' in df.columns, "wrong export: no Day column. Use the 19-column daily files."

df['Day'] = pd.to_datetime(df['Day'])
for c in ['Amount spent (PHP)', 'Results']:
    df[c] = pd.to_numeric(df[c], errors='coerce')

# messaging-optimised rows only
m = df[df['Result type'] == 'Messaging conversations started'].copy()

# week of life = days since that ad's FIRST delivery day, floor-divided by 7
m['wk'] = ((m.Day - m.groupby('Ad name').Day.transform('min')).dt.days // 7)

# --- survivorship check -------------------------------------------------
life = m.groupby('Ad name').wk.max()
survivors = life[life >= 11].index
print(f"total ads: {len(life)}")
print(f"median max week of life: {life.median():.0f}")
print(f"ads surviving >= 11 weeks: {len(survivors)}")
print()

# --- COHORT-RESTRICTED CURVE (this is what FR-27 must display) ----------
c = m[m['Ad name'].isin(survivors)].groupby('wk').agg(
    spend=('Amount spent (PHP)', 'sum'),
    results=('Results', 'sum'))
c = c[c.results > 0]
c['cpi'] = c.spend / c.results
print("COHORT-RESTRICTED (44 ads surviving >= 11 weeks):")
print(c.head(12).round(2).to_string())
print()

# --- short-lived vs long-lived ------------------------------------------
short = life[life < 4].index
s = m[m['Ad name'].isin(short)]
l = m[m['Ad name'].isin(survivors)]
print(f"short-lived (<4wk):  n={len(short)}  CPI={s['Amount spent (PHP)'].sum()/s['Results'].sum():.2f}")
print(f"long-lived (>=11wk): n={len(survivors)}  CPI={l['Amount spent (PHP)'].sum()/l['Results'].sum():.2f}")
print()

# --- RAW curve (reference only, do NOT display as headline) -------------
r = m.groupby('wk').agg(spend=('Amount spent (PHP)', 'sum'),
                        results=('Results', 'sum'),
                        ads=('Ad name', 'nunique'))
r = r[r.results > 0]
r['cpi'] = r.spend / r.results
print("RAW curve (reference only — contaminated by survivorship):")
print(r.head(12).round(2).to_string())
