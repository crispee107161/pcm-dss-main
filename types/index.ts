export type Role = 'MARKETING_MANAGER' | 'MARKETING_TEAM' | 'BUSINESS_OWNER'

export type UploadType =
  | 'ADS_CSV'
  | 'POSTS_CSV'
  | 'PAGE_METRIC_CSV'
  | 'FOLLOWER_HISTORY_CSV'
  | 'PAGE_VIEWERS_CSV'
  | 'DEMOGRAPHICS_CSV'

export interface UploadResult {
  status: 'SUCCESS' | 'FAILED'
  upload_type: UploadType
  records_inserted: number
  records_updated: number
  records_unchanged: number
  error_message?: string
  retrained: boolean
}

export interface SpearmanRow {
  variable: string
  // Permanently null since the messaging-conversations DV pivot — Purchases/inquiries
  // data is out of scope by policy (see DV-PIVOT-PLAN.md "Why this changed"). Kept
  // optional, not removed; no code sets it to a real value.
  vs_inquiries?: number | null
  vs_messaging: number | null
}

export interface MLRModelInfo {
  intercept: number
  coef_reach: number
  // No longer a live predictor since the messaging-conversations DV pivot — messaging
  // is the outcome now, not an input (see DV-PIVOT-PLAN.md). Optional so callers stop
  // needing to fill it with a filler 0.
  coef_messaging?: number
  coef_amount_spent: number
  r_squared: number
  residual_std_error: number
  n: number
  equation: string
  model_type?: string
  coef_spend_sq?: number
}

export interface SimulationOutput {
  reach_input: number
  // Optional/unused since the What-If Simulator dropped its messaging input
  // (messaging is the model's outcome now, not an input — see DV-PIVOT-PLAN.md Phase 3).
  messaging_input?: number
  amount_spent_input: number
  // Holds a projected messaging-conversations count now, not inquiries — the field
  // name is kept to match the existing SimulationResult DB column (unmigrated,
  // out of scope for this pass).
  projected_inquiries: number
  interval_lower: number
  interval_upper: number
  model: MLRModelInfo
  warnings: string[]
  training_ranges?: {
    reach: [number, number]
    messaging?: [number, number]
    spend: [number, number]
  }
}

export interface MonthlyKpi {
  period: string
  total_spend: number
  // Legacy field name, kept post-pivot (see DV-PIVOT-PLAN.md) — holds a
  // messaging-conversations total, not Facebook-reported "Purchases".
  // `lib/data/analytics.ts`'s `getMonthlyKpis()` populates it correctly from
  // `total_messaging_contacts`, but that function is currently unused/dead code.
  total_inquiries: number
  total_reach: number
  ad_count: number
}
