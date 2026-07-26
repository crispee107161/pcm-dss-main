'use client'

import { useState } from 'react'
import { generateAIInsights, type InsightData } from '@/actions/ai-insights'
import { Button } from '@/components/ui/button'
import { Loading02Icon } from '@animateicons/react/huge'
import { ReportSection } from '@/components/reports/ReportPrimitives'

interface AIInsightCardProps {
  data: InsightData
  /** 'dark' (default) matches the live dashboard theme; 'print' matches the plain print report. */
  variant?: 'dark' | 'print'
}

export default function AIInsightCard({ data, variant = 'dark' }: AIInsightCardProps) {
  const [insight, setInsight] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    const result = await generateAIInsights(data)
    setInsight(result)
    setLoading(false)
  }

  if (variant === 'print') {
    return (
      <ReportSection title="AI Business Insights">
        <p className="text-xs text-gray-400 -mt-2 mb-4">Groq · Llama 3 · interprets your data in plain English</p>

        {!insight && !loading && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-gray-200 max-w-md">
              Click &ldquo;Generate Insights&rdquo; to get an AI-powered plain-English summary of your
              campaign performance and recommended next steps.
            </p>
            <Button
              onClick={handleGenerate}
              variant="outline"
              size="sm"
              className="border-gray-25 text-gray-25 hover:bg-gray-800 whitespace-nowrap print:hidden"
            >
              Generate Insights
            </Button>
          </div>
        )}

        {loading && (
          <div className="space-y-3">
            <div className="flex items-center gap-2.5 text-gray-300">
              <Loading02Icon size={16} color="#737373" />
              <span className="text-xs font-medium tracking-wide">Analysing your data…</span>
            </div>
            <div className="space-y-2.5 animate-pulse">
              <div className="h-3 bg-gray-500 rounded-full w-full" />
              <div className="h-3 bg-gray-500 rounded-full w-11/12" />
              <div className="h-3 bg-gray-500 rounded-full w-4/5" />
            </div>
          </div>
        )}

        {insight && !loading && (
          <div className="space-y-3">
            <p className="text-sm text-gray-100 leading-relaxed">{insight}</p>
            <Button
              onClick={handleGenerate}
              variant="ghost"
              size="sm"
              className="text-xs text-gray-300 hover:text-gray-25 -ml-2 print:hidden"
            >
              Regenerate
            </Button>
          </div>
        )}
      </ReportSection>
    )
  }

  return (
    <div
      className="rounded-2xl p-6 print-no-break border border-violet-500/20"
      style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--color-violet-700) 18%, var(--card)) 0%, var(--card) 55%, var(--background) 100%)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-white">AI Business Insights</h2>
          <p className="text-xs text-gray-400 mt-0.5">Groq · Llama 3 · interprets your data in plain English</p>
        </div>
        {!insight && !loading && (
          <Button
            onClick={handleGenerate}
            className="bg-primary hover:bg-green-600 active:bg-green-700 text-white whitespace-nowrap px-4"
          >
            Generate Insights
          </Button>
        )}
        {insight && (
          <Button
            onClick={handleGenerate}
            variant="ghost"
            size="sm"
            className="text-xs text-gray-400 hover:text-white hover:bg-white/10"
          >
            Regenerate
          </Button>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 text-gray-400">
            <Loading02Icon size={18} color="#9E9E9E" />
            <span className="text-xs font-medium tracking-wide">Analysing your data…</span>
          </div>
          <div className="space-y-2.5 animate-pulse">
            <div className="h-3.5 bg-white/10 rounded-full w-full" />
            <div className="h-3.5 bg-white/10 rounded-full w-11/12" />
            <div className="h-3.5 bg-white/10 rounded-full w-4/5" />
            <div className="h-3.5 bg-white/10 rounded-full w-3/4 mt-3" />
            <div className="h-3.5 bg-white/10 rounded-full w-5/6" />
          </div>
        </div>
      )}

      {insight && !loading && (
        <p className="text-sm text-gray-500 leading-relaxed">{insight}</p>
      )}

      {!insight && !loading && (
        <p className="text-sm text-gray-500">
          Click "Generate Insights" to get an AI-powered plain-English summary of your campaign performance and recommended next steps.
        </p>
      )}
    </div>
  )
}
