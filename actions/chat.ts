'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export interface ChatMessage {
  role: 'user' | 'model'
  text: string
}

export async function sendChatMessage(history: ChatMessage[], userMessage: string): Promise<string> {
  const session = await auth()
  if (!session?.user) return 'Unauthorized'

  if (userMessage.length > 2000) return 'Message too long (max 2000 characters).'

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return 'AI chat unavailable — GROQ_API_KEY not configured.'

  const [allAds, latestModel, postAgg, followerHistory, dailyMetrics] = await Promise.all([
    prisma.ad.findMany({
      select: { ad_name: true, amount_spent: true, purchases: true, reach: true },
    }),
    prisma.regressionModel.findFirst({ orderBy: { trained_at: 'desc' } }),
    prisma.facebookPost.aggregate({
      _avg: { engagement_rate: true },
      _count: { id: true },
      _sum: { reach: true },
    }),
    prisma.followerHistory.findMany({ orderBy: { date: 'desc' }, take: 1 }),
    prisma.pageMetricDaily.findMany({ orderBy: { date: 'desc' }, take: 7 }),
  ])

  const totalSpend     = allAds.reduce((s, a) => s + a.amount_spent, 0)
  const totalPurchases = allAds.reduce((s, a) => s + (a.purchases ?? 0), 0)
  const totalReach     = allAds.reduce((s, a) => s + (a.reach ?? 0), 0)
  const cpa            = totalPurchases > 0 ? totalSpend / totalPurchases : null
  const top5           = [...allAds]
    .filter(a => (a.purchases ?? 0) > 0)
    .sort((a, b) => (b.purchases ?? 0) - (a.purchases ?? 0))
    .slice(0, 5)

  const isMLR = latestModel?.coef_reach != null

  const systemPrompt = `You are PCM Assistant, an AI business analyst inside the PC Merchandise Decision Support System. PC Merchandise is a small Filipino merchandise business that sells products via Facebook ads.

Answer questions about the business data below in plain English. Be concise (under 4 sentences), specific, and actionable. Never invent numbers — only use what is provided.

=== LIVE DATA ===
Ad Campaigns (${allAds.length} total):
- Total spend: ₱${totalSpend.toLocaleString('en-PH', { minimumFractionDigits: 2 })}
- Total purchases: ${totalPurchases}
- Total reach: ${totalReach.toLocaleString()} unique people
- Cost per purchase (CPA): ${cpa ? `₱${cpa.toFixed(2)}` : 'N/A'}

Top 5 ads by purchases:
${top5.map((a, i) => `  ${i + 1}. "${a.ad_name}" — ${a.purchases} purchases, ₱${a.amount_spent.toFixed(2)} spent`).join('\n') || '  No purchase data yet.'}

Predictive Model (${isMLR ? 'Multiple Linear Regression' : 'Simple Linear Regression'}):
${latestModel
  ? [
      `- R²: ${(latestModel.r_squared * 100).toFixed(2)}% of purchase variance explained`,
      `- Sample size: ${latestModel.n} campaigns`,
      isMLR
        ? `- Equation: Purchases = ${latestModel.intercept.toFixed(3)} + ${latestModel.coef_reach?.toFixed(4)}·log(1+Reach) + ${latestModel.coef_messaging?.toFixed(4)}·log(1+Msgs) + ${latestModel.coef_amount_spent?.toFixed(4)}·log(1+Spend)`
        : `- Equation: Purchases = ${latestModel.intercept.toFixed(3)} + ${latestModel.coefficient.toFixed(6)} × Amount Spent`,
      latestModel.residual_std_error != null
        ? `- 80% prediction interval: ±${(latestModel.residual_std_error * 1.2816).toFixed(2)} purchases`
        : null,
      latestModel.best_lag != null ? `- Best time lag: ${latestModel.best_lag} day(s)` : null,
    ].filter(Boolean).join('\n')
  : '- No model trained yet.'}

Organic Posts:
- Total posts: ${postAgg._count.id}
- Avg engagement rate: ${postAgg._avg.engagement_rate?.toFixed(2) ?? 'N/A'}%
- Total post reach: ${(postAgg._sum.reach ?? 0).toLocaleString()}

Page Metrics (last 7 days, most recent first):
${dailyMetrics.length > 0
  ? dailyMetrics.map(d =>
      `  ${new Date(d.date).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}: ${d.views ?? 0} views, ${d.visits ?? 0} visits, ${d.follows ?? 0} follows`
    ).join('\n')
  : '  No page metric data yet.'}

Current followers: ${followerHistory[0]?.followers?.toLocaleString() ?? 'N/A'}
=================`

  const trimmedHistory = history.slice(-20)
  const messages = [
    { role: 'system', content: systemPrompt },
    ...trimmedHistory.map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.text })),
    { role: 'user', content: userMessage },
  ]

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages,
        max_tokens: 400,
        temperature: 0.4,
      }),
    })

    const json = await res.json()

    if (json.error) {
      console.error('Groq API error:', json.error)
      return `API error: ${json.error.message ?? 'unknown error'}`
    }

    const text = json.choices?.[0]?.message?.content
    if (!text) return 'No response received. Please try again.'
    return text.trim()
  } catch (err) {
    console.error('Chat fetch error:', err)
    return 'Network error — could not reach AI service. Please try again.'
  }
}
