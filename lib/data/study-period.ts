import type { Prisma } from '@/app/generated/prisma/client'
import { parseIsoLocalAsManila } from '@/lib/csv/timezone'

// FR-04a (docs/raven/FR04a_Implementation_and_731st_Post_Response_2026-08-25.md §2). The
// declared study period is fixed editorial scope for the manuscript (twelve
// months, Aug 2025-Jul 2026 Manila local), not a value anyone needs to
// change at runtime — Raven explicitly asked for a constants/env module
// instead of a settings screen, so this is that module. Overridable via env
// for tests/staging without a code change; defaults to the declared range.
const START_RAW = process.env.STUDY_PERIOD_START ?? '2025-08-01T00:00:00'
const END_RAW = process.env.STUDY_PERIOD_END ?? '2026-07-31T23:59:59'

export const STUDY_PERIOD_START: Date = parseIsoLocalAsManila(START_RAW)
export const STUDY_PERIOD_END: Date = parseIsoLocalAsManila(END_RAW)

// Derived from the same two constants above (not a second literal) so a
// STUDY_PERIOD_START/END env override for staging/tests can't leave a caption
// quoting the hardcoded declared range — see the Follows-per-100-Visits
// caption on the Executive Dashboard (docs/raven/Executive_Dashboard_Review.md A2).
const STUDY_PERIOD_LABEL_FMT = new Intl.DateTimeFormat('en-PH', { month: 'short', year: 'numeric', timeZone: 'Asia/Manila' })
export const STUDY_PERIOD_LABEL = `${STUDY_PERIOD_LABEL_FMT.format(STUDY_PERIOD_START)} – ${STUDY_PERIOD_LABEL_FMT.format(STUDY_PERIOD_END)}`

export function isInStudyPeriod(publishTime: Date): boolean {
  return publishTime >= STUDY_PERIOD_START && publishTime <= STUDY_PERIOD_END
}

// Mirrors lib/categorize/content-filter.ts's whereForFilter/EXCLUDE_GROUND_TRUTH
// pattern: every FacebookPost query feeding an analytical output or the
// categorisation queue ANDs this on, so out-of-period rows (retained in the
// table, never deleted — Raven's §4 instruction) are excluded from analysis,
// backlog counts, and future bulk-categorisation passes without touching the
// underlying data.
export const STUDY_PERIOD_POST_WHERE: Prisma.FacebookPostWhereInput = {
  publish_time: { gte: STUDY_PERIOD_START, lte: STUDY_PERIOD_END },
}

// Combines an existing FacebookPost where-clause with the study-period
// bound. Used at call sites that already filter by something else (a UI
// date-range picker, category_final: null for the queue, etc.) so the two
// constraints AND together instead of one silently overwriting the other.
export function withStudyPeriod(where?: Prisma.FacebookPostWhereInput): Prisma.FacebookPostWhereInput {
  return where ? { AND: [where, STUDY_PERIOD_POST_WHERE] } : STUDY_PERIOD_POST_WHERE
}

// docs/raven/Scope_Call_Both_and_Clauses_Restored.md §2 — the ad side never
// had an equivalent of STUDY_PERIOD_POST_WHERE (Raven's original "every
// other screen already scopes ads" premise was wrong; nothing did). Ads use
// reporting_starts, not publish_time — a separate constant rather than
// reusing the post one so the two datasets' own date fields stay explicit
// at each call site. Confirmed (§3 of the same memo) that the ingested ad
// records already fall entirely inside this range today, so this is a
// structural guarantee for future uploads, not a fix to a wrong number now.
export const STUDY_PERIOD_AD_WHERE: Prisma.AdWhereInput = {
  reporting_starts: { gte: STUDY_PERIOD_START, lte: STUDY_PERIOD_END },
}

// Mirrors withStudyPeriod for Ad queries — see that function's comment.
export function withStudyPeriodAd(where?: Prisma.AdWhereInput): Prisma.AdWhereInput {
  return where ? { AND: [where, STUDY_PERIOD_AD_WHERE] } : STUDY_PERIOD_AD_WHERE
}

// PageMetricDaily was never given a study-period constant when FR-04a was
// implemented (docs/raven/FR04a_Implementation_and_731st_Post_Response_2026-08-25.md
// §2 lists FacebookPost and Ad call sites only) — every reader of this table
// queried it unfiltered, so the Follows-per-100-Visits chart's x-axis ran
// back to whatever the earliest uploaded row was (April 2025), months before
// the declared study period, breaking FR-04a's "excluded from all
// analytical outputs" requirement
// (docs/raven/Executive_Dashboard_Review.md A2). `date` is Manila-anchored
// the same way as FacebookPost.publish_time (lib/db/upsert-page-metric.ts).
export const STUDY_PERIOD_PAGE_METRIC_WHERE: Prisma.PageMetricDailyWhereInput = {
  date: { gte: STUDY_PERIOD_START, lte: STUDY_PERIOD_END },
}

// Mirrors withStudyPeriod/withStudyPeriodAd — for the page-metrics screens,
// which already build their own `{ date: range }` filter from a user-picked
// date range and need to AND the study-period floor onto it rather than
// have one silently overwrite the other.
export function withStudyPeriodPageMetric(where?: Prisma.PageMetricDailyWhereInput): Prisma.PageMetricDailyWhereInput {
  return where ? { AND: [where, STUDY_PERIOD_PAGE_METRIC_WHERE] } : STUDY_PERIOD_PAGE_METRIC_WHERE
}

// Manila-anchored YYYY-MM-DD strings for the two constants above — the same
// day-level format lib/date-range.ts's toISODate produces, but computed via
// Asia/Manila rather than server-local time so `.getFullYear()`/`.getDate()`
// (UTC on Vercel) can't read STUDY_PERIOD_START's UTC instant as the day
// before, the same trap month-buckets.ts's manilaYearMonth documents. Lets a
// caller show "resolved range" text under an "All time" selector (docs/raven/
// Top_Ads_Review.md §4) without exposing the study period concept itself —
// just the two boundary dates, matching §0.3's "state the operational
// consequence, not the methodology" rule.
const MANILA_DAY_FMT = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' })
export const STUDY_PERIOD_START_DAY = MANILA_DAY_FMT.format(STUDY_PERIOD_START)
export const STUDY_PERIOD_END_DAY = MANILA_DAY_FMT.format(STUDY_PERIOD_END)
