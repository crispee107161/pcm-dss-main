'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import MonthlyKpiCards from '@/components/kpi/MonthlyKpiCards'
import { SpendInquiriesChart, ReachTrendChart } from '@/components/marketing/TrendCharts'
import { GenderPieChart, TerritoryChart } from '@/components/marketing/PageMetricsCharts'
import CorrelationTable from '@/components/analytics/CorrelationTable'
import RegressionSummary from '@/components/analytics/RegressionSummary'
import type { RegressionInsight } from '@/lib/insights/regression-insight'
import WhatIfSimulator from '@/components/analytics/WhatIfSimulator'
import CampaignHealthTable from '@/components/analytics/CampaignHealthTable'
import BudgetAllocator from '@/components/analytics/BudgetAllocator'
import CostCuttingScenario from '@/components/analytics/CostCuttingScenario'
import type { MonthlyKpi, SpearmanRow } from '@/types/index'
import type { ScoredAd } from '@/lib/stats/health-score'

// ── Serialisable versions of DB rows (dates → strings) ──────────────────────

interface AdTrend {
  period: string
  total_spend: number
  total_inquiries: number
  total_reach: number
  ad_count: number
  avg_spend_per_ad: number
}

interface TopSpendRow {
  ad_name: string
  ad_set_name: string
  amount_spent: number
  reporting_starts: string | null
  reporting_ends: string | null
}

interface TopInquiriesRow {
  ad_name: string
  ad_set_name: string
  inquiries: number | null
  reporting_starts: string | null
  reporting_ends: string | null
}

interface GenderRow { gender: string; distribution: number }
interface TerritoryRow { territory: string; distribution: number }

interface RegressionModelRow {
  id: number
  intercept: number
  coefficient: number
  coef_reach: number | null
  coef_messaging: number | null
  coef_amount_spent: number | null
  residual_std_error: number | null
  best_lag: number | null
  r_squared: number
  n: number
  trained_at: string
}

export interface SalesDashboardTabsProps {
  displayName: string
  greeting: string
  monthlyKpis: MonthlyKpi[]
  adTrends: AdTrend[]
  spendDelta: number | null
  inquiryDelta: number | null
  topSpend: TopSpendRow[]
  topInquiries: TopInquiriesRow[]
  genderData: GenderRow[]
  territoryData: TerritoryRow[]
  scoredAds: ScoredAd[]
  spearmanRows: SpearmanRow[]
  latestModel: RegressionModelRow | null
  regressionInsight?: RegressionInsight | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatPHP(v: number) {
  return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(v)
}

function formatDate(d: string | null) {
  if (!d) return '—'
  return new Intl.DateTimeFormat('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d))
}

function SLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em] whitespace-nowrap">{children}</p>
      <div className="flex-1 h-px bg-gradient-to-r from-red-100/70 to-transparent" />
    </div>
  )
}

function DeltaBadge({ value, label }: { value: number | null; label: string }) {
  return (
    <div>
      <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em] mb-2">{label}</p>
      {value === null
        ? <span className="text-gray-400 text-xs">—</span>
        : (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold rounded-full px-2.5 py-0.5 border ${
            value >= 0
              ? 'bg-green-500/10 text-[var(--status-positive)] border-green-500/30'
              : 'bg-red-500/10 text-[var(--status-negative)] border-red-500/30'
          }`}>
            {value >= 0 ? '▲' : '▼'} {Math.abs(value).toFixed(1)}% vs prev period
          </span>
        )}
    </div>
  )
}

function RankBadge({ rank }: { rank: number }) {
  const base = 'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold'
  if (rank === 1) return <span className={`${base} bg-yellow-400 text-white`}>1</span>
  if (rank === 2) return <span className={`${base} bg-gray-300 text-gray-800`}>2</span>
  if (rank === 3) return <span className={`${base} bg-orange-600 text-white`}>3</span>
  return <span className={`${base} bg-gray-100 text-gray-500`}>{rank}</span>
}

const cardStyle = {
  boxShadow: 'var(--card-elevate-shadow-ring)',
}
const cardClass = 'bg-card rounded-2xl card-shadow'

// ── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
  { id: 'overview',   label: 'Overview',   icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { id: 'campaigns',  label: 'Campaigns',  icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { id: 'analytics',  label: 'Analytics',  icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { id: 'simulator',  label: 'Simulator',  icon: 'M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 11h.01M12 11h.01M15 11h.01M4 7h16a1 1 0 011 1v9a1 1 0 01-1 1H4a1 1 0 01-1-1V8a1 1 0 011-1z' },
] as const

type TabId = typeof TABS[number]['id']

// ── Main component ────────────────────────────────────────────────────────────

export default function SalesDashboardTabs({
  displayName,
  greeting,
  monthlyKpis,
  adTrends,
  spendDelta,
  inquiryDelta,
  topSpend,
  topInquiries,
  genderData,
  territoryData,
  scoredAds,
  spearmanRows,
  latestModel,
  regressionInsight,
}: SalesDashboardTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  // kept for potential analytics tracking; Tabs component manages the visual state

  const lastTwo = adTrends.slice(-2)
  const topTerritory = [...territoryData].sort((a, b) => b.distribution - a.distribution)[0]

  return (
    <div className="p-5 md:p-10 max-w-7xl mx-auto space-y-4">

      {/* Header */}
      <div className="pb-4 border-b border-gray-200/60">
        <h1 className="text-xl font-extrabold font-heading text-gray-900 tracking-tight">{greeting}, {displayName}</h1>
        <p className="text-gray-400 text-sm mt-0.5">Campaign performance and What-If scenarios</p>
      </div>

      {/* Tab bar */}
      <Tabs value={activeTab} onValueChange={(v) => { if (v) setActiveTab(v as TabId) }} className="space-y-4">
        <TabsList className="flex gap-1 bg-gray-100/70 rounded-xl p-1 h-auto w-full">
          {TABS.map(tab => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-semibold data-active:bg-white data-active:text-black data-active:shadow-sm text-gray-500 hover:text-gray-700 hover:bg-white/50 focus-visible:ring-ring"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={tab.icon} />
              </svg>
              <span className="text-[10px] sm:text-sm">{tab.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        {/* ── Overview ── */}
        <TabsContent value="overview" className="animate-fade-slide-up space-y-4">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em] whitespace-nowrap">Monthly KPI Summary</p>
              <div className="flex-1 h-px bg-gradient-to-r from-red-100/70 to-transparent" />
            </div>
            <MonthlyKpiCards data={monthlyKpis} />
          </div>

          {lastTwo.length === 2 && (
            <div className={`${cardClass} p-5 flex flex-wrap gap-6`} style={cardStyle}>
              <DeltaBadge value={spendDelta} label={`${lastTwo[0].period} → ${lastTwo[1].period} · Spend`} />
              <DeltaBadge value={inquiryDelta} label={`${lastTwo[0].period} → ${lastTwo[1].period} · Inquiries`} />
            </div>
          )}

          {adTrends.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              <div className={`${cardClass} p-5`} style={cardStyle}>
                <SLabel>Ad Spend vs. Inquiries</SLabel>
                <p className="text-xs text-gray-400 -mt-2 mb-4">Total spend (PHP) and resulting inquiries per period</p>
                <SpendInquiriesChart data={adTrends} />
              </div>
              <div className={`${cardClass} p-5`} style={cardStyle}>
                <SLabel>Ad Reach by Month</SLabel>
                <p className="text-xs text-gray-400 -mt-2 mb-4">Total unique reach from paid ads</p>
                <ReachTrendChart data={adTrends} />
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── Campaigns ── */}
        <TabsContent value="campaigns" className="animate-fade-slide-up space-y-4">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            <div className={`${cardClass} overflow-hidden`} style={cardStyle}>
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">Top Campaigns by Spend</p>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              {topSpend.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm font-semibold text-gray-500 mb-0.5">No spend data</p>
                  <p className="text-xs text-gray-400">Upload an Ads CSV to see top campaigns.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/70">
                      <TableHead className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.1em] px-4 py-3 w-10">#</TableHead>
                      <TableHead className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.1em] px-4 py-3">Ad Name</TableHead>
                      <TableHead className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-[0.1em] px-4 py-3">Spend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topSpend.map((ad, i) => (
                      <TableRow key={i} className="hover:bg-red-500/10 border-t border-gray-100 transition-[background-color]">
                        <TableCell className="px-4 py-3"><RankBadge rank={i + 1} /></TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="font-semibold text-gray-800 text-sm max-w-xs truncate" title={ad.ad_name}>{ad.ad_name}</div>
                          <div className="text-xs text-gray-400 hidden sm:block">{formatDate(ad.reporting_starts)} – {formatDate(ad.reporting_ends)}</div>
                        </TableCell>
                        <TableCell className="sensitive px-4 py-3 text-right font-bold text-gray-800">{formatPHP(ad.amount_spent)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>

            <div className={`${cardClass} overflow-hidden`} style={cardStyle}>
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-3">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.12em]">Top Campaigns by Inquiries</p>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              {topInquiries.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p className="text-sm font-semibold text-gray-500 mb-0.5">No inquiry data</p>
                  <p className="text-xs text-gray-400">Inquiry counts will appear here once ad data is uploaded.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50/70">
                      <TableHead className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.1em] px-4 py-3 w-10">#</TableHead>
                      <TableHead className="text-[11px] font-semibold text-gray-500 uppercase tracking-[0.1em] px-4 py-3">Ad Name</TableHead>
                      <TableHead className="text-right text-[11px] font-semibold text-gray-500 uppercase tracking-[0.1em] px-4 py-3">Inquiries</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {topInquiries.map((ad, i) => (
                      <TableRow key={i} className="hover:bg-red-500/10 border-t border-gray-100 transition-[background-color]">
                        <TableCell className="px-4 py-3"><RankBadge rank={i + 1} /></TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="font-semibold text-gray-800 text-sm max-w-xs truncate" title={ad.ad_name}>{ad.ad_name}</div>
                          <div className="text-xs text-gray-400 hidden sm:block">{formatDate(ad.reporting_starts)} – {formatDate(ad.reporting_ends)}</div>
                        </TableCell>
                        <TableCell className="sensitive px-4 py-3 text-right font-bold text-green-400">{(ad.inquiries ?? 0).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>

          <div className={`${cardClass} p-5`} style={cardStyle}>
            <SLabel>Campaign Health Scores</SLabel>
            <p className="text-xs text-gray-400 -mt-2 mb-4">
              Composite 0–100 score per ad: CPI efficiency (50%), inquiry rate (35%), reach (15%). Click a row for the breakdown.
            </p>
            <CampaignHealthTable ads={scoredAds} />
          </div>
        </TabsContent>

        {/* ── Analytics ── */}
        <TabsContent value="analytics" className="animate-fade-slide-up space-y-4">
          {(genderData.length > 0 || territoryData.length > 0) && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
              {genderData.length > 0 && (
                <div className={`${cardClass} p-5`} style={cardStyle}>
                  <SLabel>Gender Distribution</SLabel>
                  <p className="text-xs text-gray-400 -mt-2 mb-4">Breakdown of followers by gender</p>
                  <GenderPieChart data={genderData} />
                </div>
              )}
              {territoryData.length > 0 && (
                <div className={`${cardClass} p-5`} style={cardStyle}>
                  <SLabel>Top Territories</SLabel>
                  <p className="text-xs text-gray-400 -mt-2 mb-4">
                    Audience reach by region
                    {topTerritory && (
                      <> — top: <strong className="text-gray-600">{topTerritory.territory}</strong> ({(topTerritory.distribution * 100).toFixed(1)}%)</>
                    )}
                  </p>
                  <TerritoryChart data={territoryData} />
                </div>
              )}
            </div>
          )}

          <div className={`${cardClass} p-5`} style={cardStyle}>
            <SLabel>Spearman Correlation Analysis</SLabel>
            <p className="text-xs text-gray-400 -mt-2 mb-4">
              Rank-order correlation between ad metrics and outcomes (–1 to +1).
            </p>
            <CorrelationTable rows={spearmanRows} />
          </div>

          <div className={`${cardClass} p-5`} style={cardStyle}>
            <SLabel>Predictive Regression Model</SLabel>
            <RegressionSummary model={latestModel as any} insight={regressionInsight} />
          </div>
        </TabsContent>

        {/* ── Simulator ── */}
        <TabsContent value="simulator" className="animate-fade-slide-up space-y-4">
          <div className={`${cardClass} p-5`} style={cardStyle}>
            <SLabel>What-If Simulator</SLabel>
            <p className="text-xs text-gray-400 -mt-2 mb-4">Enter hypothetical inputs to predict how many inquiries they may generate.</p>
            <WhatIfSimulator />
          </div>

          <div className={`${cardClass} p-5`} style={cardStyle}>
            <SLabel>Budget Allocation Recommender</SLabel>
            <p className="text-xs text-gray-400 -mt-2 mb-4">
              Distribute a total budget across your best-performing ad sets, weighted by historical inquiry efficiency.
            </p>
            <BudgetAllocator />
          </div>

          <div className={`${cardClass} p-5`} style={cardStyle}>
            <SLabel>Cost-Cutting Scenario</SLabel>
            <p className="text-xs text-gray-400 -mt-2 mb-4">
              See which ad sets to cut to hit a budget reduction target, and what it costs you in inquiries.
            </p>
            <CostCuttingScenario />
          </div>
        </TabsContent>

      </Tabs>
    </div>
  )
}
