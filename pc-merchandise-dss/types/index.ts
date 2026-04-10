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

export interface RegressionResult {
  intercept: number
  coefficient: number
  r_squared: number
  n: number
  equation: string
}

export interface SimulationOutput {
  amount_spent_input: number
  projected_purchases: number
  model: RegressionResult
}

export interface MonthlyKpi {
  period: string
  total_spend: number
  total_purchases: number
  total_reach: number
  ad_count: number
}
