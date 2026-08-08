'use server'

import { auth } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

export interface InsightData {
  totalSpend: number
  totalInquiries: number
  totalReach: number
  cpi: number | null
  bestLag: number | null
  bestMetric: string | null
  bestR: number | null
  rSquared: number | null
  isMLR: boolean
  rse: number | null
  n: number | null
  forecastBaseline: number | null
  avgEngagement?: number | null
}

const INSIGHTS_LIMIT = 20
const INSIGHTS_WINDOW_MS = 5 * 60 * 1000 // 5 minutes

export type AIInsightResult =
  | { ok: true; text: string }
  | { ok: false; reason: string }

export async function generateAIInsights(data: InsightData): Promise<AIInsightResult> {
  const session = await auth()
  if (!session?.user) return { ok: false, reason: 'Unauthorized' }

  const { allowed, retryAfterSeconds } = rateLimit(`ai-insights:${session.user.id}`, INSIGHTS_LIMIT, INSIGHTS_WINDOW_MS)
  if (!allowed) return { ok: false, reason: `Too many requests. Try again in ${retryAfterSeconds}s.` }

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return { ok: false, reason: 'AI insights are not configured for this deployment.' }

  const systemPrompt = `You are a business analyst summarizing Facebook ad campaign performance and advertising efficiency for PC Merchandise, a small Philippine merchandise business. The business uses Facebook ads to generate customer messaging conversations; the metric counts customers who started a Messenger conversation after seeing an ad (Facebook's "Messaging conversations started" result type) — not purchases or sales. Write 3-4 concise, actionable sentences in plain English for a non-technical business owner. Interpret what the numbers mean and what action to take — do not just repeat raw numbers.`

  const userPrompt = [
    `Campaign data:`,
    `- Total ad spend: ₱${data.totalSpend.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    `- Total messaging conversations from ads: ${data.totalInquiries}`,
    `- Total reach: ${data.totalReach.toLocaleString()} unique people`,
    data.cpi != null ? `- Cost per messaging conversation (CPI): ₱${data.cpi.toFixed(2)}` : null,
    data.bestLag != null && data.bestMetric
      ? `- Messaging conversations peak ${data.bestLag} day(s) after ad ${data.bestMetric} is recorded (r = ${data.bestR?.toFixed(3)})`
      : null,
    data.rSquared != null
      ? `- Predictive model (${data.isMLR ? 'MLR' : 'SLR'}) explains ${(data.rSquared * 100).toFixed(1)}% of messaging conversation variance`
      : null,
    data.rse != null
      ? `- 80% prediction interval: ±${(data.rse * 1.2816 * Math.sqrt(1 + 1 / Math.max(data.n ?? 1, 1))).toFixed(1)} messaging conversations`
      : null,
    data.forecastBaseline != null
      ? `- 7-day page views forecast baseline: ${data.forecastBaseline.toLocaleString()} views/day`
      : null,
    data.avgEngagement != null
      ? `- Average organic post engagement rate: ${data.avgEngagement.toFixed(2)}%`
      : null,
  ].filter(Boolean).join('\n')

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user',   content: userPrompt },
        ],
        max_tokens: 320,
        temperature: 0.4,
      }),
    })

    const json = await res.json()
    if (json.error) throw new Error(json.error.message)
    const text = json.choices?.[0]?.message?.content
    if (!text) throw new Error('empty response')
    return { ok: true, text: text.trim() }
  } catch (err) {
    console.error('AI insights error:', err)
    return { ok: false, reason: 'Unable to generate insights right now. Please try again in a moment.' }
  }
}
