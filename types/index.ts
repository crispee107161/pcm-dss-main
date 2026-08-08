export type Role = 'MARKETING_MANAGER' | 'SALES_DIRECTOR' | 'BUSINESS_OWNER'

export type UploadType =
  | 'ADS_CSV'
  | 'ADS_DAILY_CSV'
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
  // Only set for ADS_DAILY_CSV uploads — rows dropped because their "Result type"
  // wasn't the messaging objective (Reach/Post engagements/ThruPlay/unrecoverable
  // blanks), plus how many blank-result rows were rescued as zero-conversion days
  // and how many same-ad/set/day rows got merged. See lib/csv/validate-ads-daily.ts.
  filter_summary?: {
    totalRows: number
    keptRows: number
    rescuedBlankRows: number
    mergedDuplicateRows: number
    droppedByResultType: Record<string, number>
    // Pre-existing monthly-granularity Ad rows deleted because this daily upload
    // covers the same ad/ad-set/period — prevents double-counting spend/results
    // across both granularities. See lib/db/upsert-ads.ts.
    supersededMonthlyRows: number
    // Monthly-granularity Ad rows that overlap this upload's date range but
    // couldn't be matched to any ad in the daily file (usually a rename between
    // exports) — left in place rather than guessed at. Harmless to training
    // (maybeRetrainRegression excludes non-daily rows independently) but worth
    // a human glance to confirm they're really just naming drift.
    unmatchedMonthlyRows: number
  }
}

export interface SpearmanRow {
  variable: string
  // Permanently null since the messaging-conversations DV pivot — Purchases/inquiries
  // data is out of scope by policy (see DV-PIVOT-PLAN.md "Why this changed"). Kept
  // optional, not removed, only because SalesDashboardTabs.tsx (sales dashboard,
  // separately scoped) still types against this shape; no code sets it to a real value.
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
  // `total_messaging_contacts`, but that function is currently unused/dead
  // code. The only *live* consumer is the Sales Director dashboard's own
  // separate inline `getMonthlyKpis` in `app/dashboard/sales/page.tsx`,
  // which still reads the deprecated, permanently-null `Ad.inquiries` field
  // and will read 0 for any new upload — deliberately deferred, not fixed
  // in this pass.
  total_inquiries: number
  total_reach: number
  ad_count: number
}
