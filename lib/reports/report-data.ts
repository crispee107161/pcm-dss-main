import { prisma } from '@/lib/prisma'
import { computeLaggedCorrelations } from '@/lib/stats/laggedCorrelation'
import { computeHoltWintersForecast } from '@/lib/stats/forecast'
import { computeRegressionInsight } from '@/lib/insights/regression-insight'
import { computeForecastInsight } from '@/lib/insights/forecast-insight'

export const REPORT_TARGET_PERIODS = [
  { label: 'September 2025', year: 2025, month: 9 },
  { label: 'December 2025', year: 2025, month: 12 },
  { label: 'January 2026',  year: 2026, month: 1 },
]

export interface ReportOptions {
  includeOrganicPosts?: boolean
}

export async function buildReportData({ includeOrganicPosts = true }: ReportOptions = {}) {
  const [allAds, allPosts, latestModel, categories, dailyMetrics, lagData, adHistory] = await Promise.all([
    prisma.ad.findMany({
      select: {
        ad_name: true, reporting_starts: true, reporting_ends: true,
        amount_spent: true, inquiries: true,
        reach: true, impressions: true, link_clicks: true, category_id: true,
      },
    }),
    includeOrganicPosts
      ? prisma.facebookPost.findMany({
          select: {
            publish_time: true, engagement_rate: true, reach: true,
            reactions: true, comments: true, shares: true, post_type: true, category_id: true,
          },
        })
      : Promise.resolve([]),
    prisma.regressionModel.findFirst({ orderBy: { trained_at: 'desc' } }),
    prisma.category.findMany(),
    prisma.pageMetricDaily.findMany({ orderBy: { date: 'asc' } }),
    computeLaggedCorrelations(),
    prisma.ad.findMany({
      where: { inquiries: { not: null } },
      select: { reach: true, total_messaging_contacts: true, amount_spent: true },
    }),
  ])

  const catMap = Object.fromEntries(categories.map(c => [c.id, c.name]))

  const totalSpend = allAds.reduce((s, a) => s + a.amount_spent, 0)
  const totalInquiries = allAds.reduce((s, a) => s + (a.inquiries ?? 0), 0)
  const totalReach = allAds.reduce((s, a) => s + (a.reach ?? 0), 0)
  const totalImpressions = allAds.reduce((s, a) => s + a.impressions, 0)
  const totalLinkClicks = allAds.reduce((s, a) => s + (a.link_clicks ?? 0), 0)
  const cpi = totalInquiries > 0 ? totalSpend / totalInquiries : null
  const ctr = totalImpressions > 0 ? totalLinkClicks / totalImpressions : null
  const cpc = totalLinkClicks > 0 ? totalSpend / totalLinkClicks : null
  const frequency = totalReach > 0 ? totalImpressions / totalReach : null

  const campaignStart = allAds.length > 0
    ? new Date(Math.min(...allAds.map(a => new Date(a.reporting_starts).getTime())))
    : null
  const campaignEnd = allAds.length > 0
    ? new Date(Math.max(...allAds.map(a => new Date(a.reporting_ends).getTime())))
    : null

  const top5Ads = [...allAds]
    .filter(a => (a.inquiries ?? 0) > 0)
    .sort((a, b) => (b.inquiries ?? 0) - (a.inquiries ?? 0))
    .slice(0, 5)

  const monthlyData = REPORT_TARGET_PERIODS.map(({ label, year, month }) => {
    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 0, 23, 59, 59)
    const ads = allAds.filter(a => {
      const d = new Date(a.reporting_starts)
      return d >= start && d <= end
    })
    return {
      period: label,
      spend: ads.reduce((s, a) => s + a.amount_spent, 0),
      inquiries: ads.reduce((s, a) => s + (a.inquiries ?? 0), 0),
      reach: ads.reduce((s, a) => s + (a.reach ?? 0), 0),
      ad_count: ads.length,
    }
  })

  const avgEngagement = allPosts.length > 0
    ? allPosts.reduce((s, p) => s + p.engagement_rate, 0) / allPosts.length
    : 0
  const totalPostReach = allPosts.reduce((s, p) => s + p.reach, 0)
  const totalReactions = allPosts.reduce((s, p) => s + p.reactions, 0)

  const adCatCounts: Record<string, number> = {}
  for (const ad of allAds) {
    const name = ad.category_id ? (catMap[ad.category_id] ?? 'Uncategorized') : 'Uncategorized'
    adCatCounts[name] = (adCatCounts[name] ?? 0) + 1
  }

  const viewsForecast = computeHoltWintersForecast(
    dailyMetrics.map(d => ({ date: d.date, value: d.views })),
    7, 7
  )
  const forecastChartData = [
    ...viewsForecast.history.slice(-21).map(h => ({
      date: h.date.slice(5), value: h.value as number | undefined, ma: h.ma as number | null | undefined,
      forecast: undefined as number | undefined,
    })),
    ...viewsForecast.forecast.map(f => ({
      date: f.date.slice(5),
      value: undefined as number | undefined,
      ma: undefined as number | null | undefined,
      forecast: f.forecastValue as number | undefined,
    })),
  ]
  const forecastInsight = dailyMetrics.length >= 7 ? computeForecastInsight(viewsForecast, 'Page views') : null

  const regressionInsight = latestModel
    ? computeRegressionInsight(
        latestModel,
        adHistory.map(a => ({ reach: a.reach ?? 0, messaging: a.total_messaging_contacts ?? 0, amount_spent: a.amount_spent })),
      )
    : null

  return {
    generatedAt: new Date(),
    totalSpend, totalInquiries, totalReach, totalImpressions, totalLinkClicks, cpi,
    ctr, cpc, frequency, campaignStart, campaignEnd,
    top5Ads,
    monthlyData,
    allAdsCount: allAds.length,
    hasOrganicPosts: includeOrganicPosts && allPosts.length > 0,
    postCount: allPosts.length,
    avgEngagement, totalPostReach, totalReactions,
    adCatCounts,
    latestModel, regressionInsight,
    lagData,
    dailyMetricsCount: dailyMetrics.length,
    viewsForecast,
    forecastChartData,
    forecastInsight,
  }
}

export type ReportData = Awaited<ReturnType<typeof buildReportData>>
