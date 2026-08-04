'use client'

import { useState } from 'react'
import { generateAIInsights, type InsightData } from '@/actions/ai-insights'
import { Button } from '@/components/ui/button'
import { Loading02Icon } from '@animateicons/react/huge'

interface AIInsightCardProps {
  data: InsightData
}

export default function AIInsightCard({ data }: AIInsightCardProps) {
  const [insight, setInsight] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    const result = await generateAIInsights(data)
    if (result.ok) {
      setInsight(result.text)
    } else {
      setInsight(null)
      setError(result.reason)
    }
    setLoading(false)
  }

  return (
    <div
      className="rounded-2xl p-6 print-no-break border border-violet-500/20"
      style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-violet-700) 18%, var(--card)) 0%, var(--card) 55%, var(--background) 100%)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">AI Business Insights</h2>
          <p className="text-xs text-gray-500 mt-0.5">Groq · Llama 3 · interprets your data in plain English</p>
        </div>
        {!insight && !loading && (
          <Button
            onClick={handleGenerate}
            className="bg-primary hover:bg-primary/90 active:bg-primary/80 text-white whitespace-nowrap px-4"
          >
            {error ? 'Try Again' : 'Generate Insights'}
          </Button>
        )}
        {insight && (
          <Button
            onClick={handleGenerate}
            variant="ghost"
            size="sm"
            className="text-xs text-gray-500 hover:text-gray-900 hover:bg-gray-100"
          >
            Regenerate
          </Button>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 text-gray-500">
            <Loading02Icon size={18} color="#9E9E9E" />
            <span className="text-xs font-medium tracking-wide">Analysing your data…</span>
          </div>
          <div className="space-y-2.5 animate-pulse">
            <div className="h-3.5 bg-gray-200 rounded-full w-full" />
            <div className="h-3.5 bg-gray-200 rounded-full w-11/12" />
            <div className="h-3.5 bg-gray-200 rounded-full w-4/5" />
            <div className="h-3.5 bg-gray-200 rounded-full w-3/4 mt-3" />
            <div className="h-3.5 bg-gray-200 rounded-full w-5/6" />
          </div>
        </div>
      )}

      {insight && !loading && (
        <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
      )}

      {error && !loading && (
        <p className="text-sm text-amber-700 dark:text-amber-400 italic">{error}</p>
      )}

      {!insight && !error && !loading && (
        <p className="text-sm text-gray-600">
          Click &ldquo;Generate Insights&rdquo; to get an AI-powered plain-English summary of your campaign performance and recommended next steps.
        </p>
      )}
    </div>
  )
}
