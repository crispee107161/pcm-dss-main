export type Role = 'MARKETING_MANAGER' | 'SALES_DIRECTOR' | 'BUSINESS_OWNER'

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
  error_message?: string
  retrained: boolean
}

export interface SpearmanRow {
  variable: string
  vs_purchases: number | null
  vs_messaging: number | null
}

export interface MLRModelInfo {
  intercept: number
  coef_reach: number
  coef_messaging: number
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
  messaging_input: number
  amount_spent_input: number
  projected_purchases: number
  interval_lower: number
  interval_upper: number
  model: MLRModelInfo
}

export interface MonthlyKpi {
  period: string
  total_spend: number
  total_purchases: number
  total_reach: number
  ad_count: number
}

// kept for backward compat with any remaining usages
export interface RegressionResult {
  intercept: number
  coefficient: number
  r_squared: number
  n: number
  equation: string
}
