export type Role = 'MARKETING_MANAGER' | 'MARKETING_TEAM' | 'BUSINESS_OWNER'

export type UploadType =
  | 'ADS_CSV'
  | 'POSTS_CSV'
  | 'PAGE_METRIC_CSV'
  | 'FOLLOWER_HISTORY_CSV'
  | 'PAGE_VIEWERS_CSV'
  | 'DEMOGRAPHICS_CSV'
  | 'AUDIENCE_CSV'

export interface UploadPeriodTotals {
  count: number
  totalSpend?: number
}

// FR-04/FR-07 — a row that fails validation (or is a within-file duplicate
// key) no longer aborts the whole upload; it's rejected individually and
// the rest of the file is still processed. See
// docs/raven/Three_Decisions_and_FR_Table_Writable.md §1.
export interface RowRejection {
  row: number
  reason: string
}

export interface UploadResult {
  status: 'SUCCESS' | 'FAILED' | 'NEEDS_CONFIRMATION'
  upload_type: UploadType
  // SUCCESS only — total data rows the file contained (inserted + updated +
  // unchanged + rejected), i.e. FR-05's "records read" figure.
  records_read?: number
  records_inserted: number
  records_updated: number
  records_unchanged: number
  // SUCCESS only — rows that failed validation and were excluded, plus why.
  // `rejected_rows` is capped (see actions/upload.ts) so a badly-formed
  // file with thousands of bad rows doesn't balloon the response payload.
  records_rejected?: number
  rejected_rows?: RowRejection[]
  error_message?: string
  // SUCCESS only, POSTS_CSV — FR-04a: how many of the rows just upserted
  // fall outside the declared study period. Rows are still inserted/updated
  // (retain, don't delete — docs/raven/FR04a_Implementation_and_731st_Post_Response_2026-08-25.md
  // §2), so this is a visibility signal, not a rejection.
  warning_message?: string
  // NEEDS_CONFIRMATION only — the period the incoming file covers already has
  // records on file; nothing was written yet. Re-submit with confirmed=true
  // to proceed and replace the existing figures with the incoming ones.
  periodLabel?: string
  existing?: UploadPeriodTotals
  incoming?: UploadPeriodTotals
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
