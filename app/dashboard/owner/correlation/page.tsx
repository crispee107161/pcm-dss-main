import { notFound } from 'next/navigation'

// Correlation (the old ad-metrics-vs-messaging Spearman/lagged-correlation
// matrix) is superseded by S7 Analysis (FR-19-22) and its laggedCorrelation.ts
// dependency is a cut MVP v2 feature (CLAUDE.md's Architecture section /
// mvp.md §5) — unlinked from nav but was still reachable by direct URL.
// Gate it so direct navigation 404s; the underlying view and stats stay on disk.
export default function OwnerCorrelationPage() {
  notFound()
}
