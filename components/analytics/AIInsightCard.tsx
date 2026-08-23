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
      className="rounded-2xl p-6 print-no-break bg-card"
      style={{ boxShadow: 'var(--card-elevate-shadow-ring)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.12em]">AI Business Insights</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Groq · Llama 3 · interprets your data in plain English</p>
        </div>
        {!insight && !loading && (
          <Button
            onClick={handleGenerate}
            className="active:bg-primary/80 whitespace-nowrap px-4"
          >
            {error ? 'Try Again' : 'Generate Insights'}
          </Button>
        )}
        {insight && (
          <Button
            onClick={handleGenerate}
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground hover:bg-secondary"
          >
            Regenerate
          </Button>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 text-muted-foreground">
            <Loading02Icon size={18} />
            <span className="text-xs font-medium tracking-wide">Analysing your data…</span>
          </div>
          <div className="space-y-2.5 animate-pulse">
            <div className="h-3.5 bg-muted rounded-full w-full" />
            <div className="h-3.5 bg-muted rounded-full w-11/12" />
            <div className="h-3.5 bg-muted rounded-full w-4/5" />
            <div className="h-3.5 bg-muted rounded-full w-3/4 mt-3" />
            <div className="h-3.5 bg-muted rounded-full w-5/6" />
          </div>
        </div>
      )}

      {insight && !loading && (
        <p className="text-sm text-foreground leading-relaxed">{insight}</p>
      )}

      {error && !loading && (
        <p className="text-sm text-status-warning italic">{error}</p>
      )}

      {!insight && !error && !loading && (
        <p className="text-sm text-muted-foreground">
          Click &ldquo;Generate Insights&rdquo; to get an AI-powered plain-English summary of your campaign performance and recommended next steps.
        </p>
      )}
    </div>
  )
}
