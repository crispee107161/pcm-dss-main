import type { AudienceParseResult } from './parse'

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
  topPages: AudienceRankRecord[]
}

// Audience.csv only ships one export shape (percent-form, e.g. "12.3"), so
// unlike validate-demographics.ts this doesn't need fraction/percent
// auto-detection — just a straight /100 to match the fraction convention
// every `distribution` column in this schema uses.
const toFraction = (pct: number) => pct / 100

// A true audience share (age/gender, cities) can never be negative or
// exceed 100% for a single entity — reject rather than silently rendering
// a bogus split, matching validate-demographics.ts's convention. Top Pages
// is deliberately excluded: it's a Meta affinity score, not a share (see
// FollowerAudienceRank's schema comment), so values routinely exceed 100.
function assertValidPercent(pct: number, context: string): void {
  if (pct < 0 || pct > 100) {
    throw new Error(`${context}: expected a percentage between 0 and 100, got ${pct}`)
  }
}

export function validateAudienceResult(result: AudienceParseResult): AudienceResult {
  if (
    result.ageGender.length === 0 &&
    result.topCities.length === 0 &&
    result.topPages.length === 0
  ) {
    throw new Error('Audience CSV has no recognizable data (expected Age & gender, Top cities, or Top pages blocks)')
  }

  result.ageGender.forEach((r) => {
    assertValidPercent(r.men_pct, `Age & gender (${r.age_bracket}, Men)`)
    assertValidPercent(r.women_pct, `Age & gender (${r.age_bracket}, Women)`)
  })
  result.topCities.forEach((r) => assertValidPercent(r.pct, `Top cities (${r.label})`))

  // Age & gender is a genuine partition of the whole audience (unlike
  // Top cities/pages, which are top-10-of-many or an affinity score) — its
  // twelve cells should sum close to 100%. Tolerance mirrors
  // validate-demographics.ts's 1.5x threshold for the same reason: catch a
  // garbled export without rejecting normal rounding drift.
  const ageGenderTotal = result.ageGender.reduce((s, r) => s + r.men_pct + r.women_pct, 0)
  if (result.ageGender.length > 0 && ageGenderTotal > 150) {
    throw new Error(`Age & gender values sum to ${ageGenderTotal.toFixed(0)}%, which is not a valid percentage split`)
  }

  return {
    ageGender: result.ageGender.map((r) => ({
      age_bracket: r.age_bracket,
      men_distribution: toFraction(r.men_pct),
      women_distribution: toFraction(r.women_pct),
    })),
    topCities: result.topCities.map((r) => ({ label: r.label, distribution: toFraction(r.pct) })),
    topPages: result.topPages.map((r) => ({ label: r.label, distribution: toFraction(r.pct) })),
  }
}
