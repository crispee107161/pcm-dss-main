'use server'

import { auth } from '@/lib/auth'

export interface InsightData {
  totalSpend: number
  totalPurchases: number
  totalReach: number
  cpa: number | null
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

export async function generateAIInsights(data: InsightData): Promise<string> {
  const session = await auth()
  if (!session?.user) return 'Unauthorized'

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return 'AI insights unavailable — add GROQ_API_KEY to your environment variables.'

  const systemPrompt = `You are a business analyst summarizing Facebook ad campaign performance for PC Merchandise, a small Philippine merchandise business. Write 3-4 concise, actionable sentences in plain English for a non-technical business owner. Interpret what the numbers mean and what action to take — do not just repeat raw numbers.`

  const userPrompt = [
    `Campaign data:`,
    `- Total ad spend: ₱${data.totalSpend.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`,
    `- Total purchases from ads: ${data.totalPurchases}`,
    `- Total reach: ${data.totalReach.toLocaleString()} unique people`,
    data.cpa != null ? `- Cost per purchase (CPA): ₱${data.cpa.toFixed(2)}` : null,
    data.bestLag != null && data.bestMetric
      ? `- Purchases peak ${data.bestLag} day(s) after ad ${data.bestMetric} is recorded (r = ${data.bestR?.toFixed(3)})`
      : null,
    data.rSquared != null
      ? `- Predictive model (${data.isMLR ? 'MLR' : 'SLR'}) explains ${(data.rSquared * 100).toFixed(1)}% of purchase variance`
      : null,
    data.rse != null
      ? `- 80% prediction interval: ±${(data.rse * 1.2816 * Math.sqrt(1 + 1 / Math.max(data.n ?? 1, 1))).toFixed(1)} purchases`
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
    return text.trim()
  } catch (err) {
    console.error('AI insights error:', err)
    return 'Unable to generate insights right now. Please try again in a moment.'
  }
}
