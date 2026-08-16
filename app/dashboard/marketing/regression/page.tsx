import { notFound } from 'next/navigation'

// Regression is a cut MVP v2 feature (see CLAUDE.md's Architecture section /
// mvp.md §5) — unlinked from nav but still reachable by direct URL. Gate it
// so direct navigation 404s; the underlying view and stats stay on disk.
export default function RegressionPage() {
  notFound()
}
