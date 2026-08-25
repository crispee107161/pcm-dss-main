import type { AudienceParseResult } from './parse'
import type { RowRejection } from './row-validation'

export interface AgeGenderRecord {
  age_bracket: string
  men_distribution: number
  women_distribution: number
}

export interface AudienceRankRecord {
  label: string
  distribution: number
}

export interface AudienceResult {
  ageGender: AgeGenderRecord[]
  topCities: AudienceRankRecord[]
}

export interface AudienceValidationResult {
  valid: AudienceResult
  rejected: RowRejection[]
}

// Audience.csv only ships one export shape (percent-form, e.g. "12.3"), so
// unlike validate-demographics.ts this doesn't need fraction/percent
// auto-detection — just a straight /100 to match the fraction convention
// every `distribution` column in this schema uses.
const toFraction = (pct: number) => pct / 100

// A true audience share (age/gender, cities) can never be negative or
// exceed 100% for a single entity — reject rather than silently rendering
// a bogus split, matching validate-demographics.ts's convention.
function isValidPercent(pct: number): boolean {
  return pct >= 0 && pct <= 100
}

// FR-04/FR-07 — a single row with an out-of-range percentage is rejected
// individually rather than aborting the whole file; the ageGenderTotal
// check below stays whole-file since a garbled sum is a property of the
// file as a set, not a single row (docs/raven/Four_Remaining_Gaps_Please_Confirm.md
// §3 — this validator now backs FR-13a, so it's load-bearing, not a
// low-traffic edge case).
export function validateAudienceResult(result: AudienceParseResult): AudienceValidationResult {
  if (result.ageGender.length === 0 && result.topCities.length === 0) {
    throw new Error('Audience CSV has no recognizable data (expected Age & gender or Top cities blocks)')
  }

  const rejected: RowRejection[] = []

  const ageGender: AgeGenderRecord[] = []
  result.ageGender.forEach((r, i) => {
    if (!isValidPercent(r.men_pct)) {
      rejected.push({ row: i + 1, reason: `Age & gender (${r.age_bracket}, Men): expected a percentage between 0 and 100, got ${r.men_pct}` })
      return
    }
    if (!isValidPercent(r.women_pct)) {
      rejected.push({ row: i + 1, reason: `Age & gender (${r.age_bracket}, Women): expected a percentage between 0 and 100, got ${r.women_pct}` })
      return
    }
    ageGender.push({
      age_bracket: r.age_bracket,
      men_distribution: toFraction(r.men_pct),
      women_distribution: toFraction(r.women_pct),
    })
  })

  const topCities: AudienceRankRecord[] = []
  result.topCities.forEach((r, i) => {
    if (!isValidPercent(r.pct)) {
      rejected.push({ row: i + 1, reason: `Top cities (${r.label}): expected a percentage between 0 and 100, got ${r.pct}` })
      return
    }
    topCities.push({ label: r.label, distribution: toFraction(r.pct) })
  })

  // Age & gender is a genuine partition of the whole audience (unlike Top
  // cities, which is top-10-of-many) — its twelve cells should sum close to
  // 100%. Tolerance mirrors validate-demographics.ts's 1.5x threshold for
  // the same reason: catch a garbled export without rejecting normal
  // rounding drift. Checked against the surviving valid rows only, so one
  // individually out-of-range row (already rejected above) doesn't also
  // masquerade as "the whole file is garbled."
  const ageGenderTotal = ageGender.reduce((s, r) => s + r.men_distribution + r.women_distribution, 0)
  if (ageGender.length > 0 && ageGenderTotal > 1.5) {
    throw new Error(`Age & gender values sum to ${(ageGenderTotal * 100).toFixed(0)}%, which is not a valid percentage split`)
  }

  return { valid: { ageGender, topCities }, rejected }
}
