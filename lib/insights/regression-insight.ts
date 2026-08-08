import { predictFromModel } from '@/lib/stats/regression'

export interface RegressionModelLike {
  model_type?: string | null
  intercept: number
  coef_reach?: number | null
  coef_amount_spent?: number | null
  coefficient: number
  r_squared: number
  n: number
}

export interface RegressionHistoryPoint {
  reach: number
  amount_spent: number
}

export interface MarginalEffect {
  label: string
  deltaInputLabel: string
  deltaInquiries: number
}

export type Confidence = 'high' | 'medium' | 'low'

export interface RegressionInsight {
  confidence: Confidence
  confidenceDetail: string
  headline: string
  detail: string
  marginalEffects: MarginalEffect[]
}

const BUMP = 0.10

function median(vals: number[]): number {
  if (vals.length === 0) return 0
  const sorted = [...vals].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

function confidenceFromR2(r2: number): Confidence {
  if (r2 >= 0.7) return 'high'
  if (r2 >= 0.4) return 'medium'
  return 'low'
}

export function computeRegressionInsight(
  model: RegressionModelLike,
  history: RegressionHistoryPoint[],
): RegressionInsight | null {
  if (history.length === 0) return null

  const medReach = median(history.map(h => h.reach))
  const medSpend = median(history.map(h => h.amount_spent))

  if (medSpend <= 0) return null

  const base = predictFromModel(model, medReach, medSpend)

  const candidates: MarginalEffect[] = [
    {
      label: 'Ad Spend',
      deltaInputLabel: `+₱${Math.round(medSpend * BUMP).toLocaleString()}`,
      deltaInquiries: predictFromModel(model, medReach, medSpend * (1 + BUMP)) - base,
    },
  ]

  if (medReach > 0) {
    candidates.push({
      label: 'Reach',
      deltaInputLabel: `+${Math.round(medReach * BUMP).toLocaleString()} people`,
      deltaInquiries: predictFromModel(model, medReach * (1 + BUMP), medSpend) - base,
    })
  }

  const marginalEffects = candidates.sort((a, b) => b.deltaInquiries - a.deltaInquiries)
  const top = marginalEffects[0]

  const confidence = confidenceFromR2(model.r_squared)
  const confidenceDetail = confidence === 'high'
    ? `Based on ${model.n} past ads, predictions usually land close to reality.`
    : confidence === 'medium'
      ? `Based on ${model.n} past ads — treat this as a ballpark, not a promise.`
      : `Based on only ${model.n} past ads — use this as a hint, not for budget decisions.`

  const hasSignal = top && Math.abs(top.deltaInquiries) >= 0.05

  const headline = hasSignal
    ? `${top.label} is your best lever for more messaging conversations`
    : `No single lever stands out yet`

  const roundedBase = Math.max(0, Math.round(base))
  const deltaWord = Math.abs(top?.deltaInquiries ?? 0) >= 1.5 ? 'conversations' : 'conversation'
  const detail = hasSignal
    ? `A typical campaign spends around ₱${Math.round(medSpend).toLocaleString()} and gets about ${roundedBase} messaging conversations. Raising ${top.label.toLowerCase()} by 10% (${top.deltaInputLabel}) is projected to add about ${Math.abs(top.deltaInquiries) < 1 ? Math.abs(top.deltaInquiries).toFixed(1) : Math.round(Math.abs(top.deltaInquiries))} more ${deltaWord}.`
    : `Reach and spend don't show a strong individual effect on their own yet — more ad data will sharpen this.`

  return { confidence, confidenceDetail, headline, detail, marginalEffects }
}
