'use client'

import { useState } from 'react'
import { generateAIInsights, type InsightData } from '@/actions/ai-insights'
import { Button } from '@/components/ui/button'
import { Loading02Icon } from '@animateicons/react/huge'

export default function AIInsightCard({ data }: { data: InsightData }) {
  const [insight, setInsight] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleGenerate() {
    setLoading(true)
    const result = await generateAIInsights(data)
    setInsight(result)
    setLoading(false)
  }

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 print-no-break">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-white">AI Business Insights</h2>
          <p className="text-xs text-slate-400 mt-0.5">Groq · Llama 3 · interprets your data in plain English</p>
        </div>
        {!insight && !loading && (
          <Button
            onClick={handleGenerate}
            className="bg-red-600 hover:bg-red-500 active:bg-red-700 text-white whitespace-nowrap px-4"
          >
            Generate Insights
          </Button>
        )}
        {insight && (
          <Button
            onClick={handleGenerate}
            variant="ghost"
            size="sm"
            className="text-xs text-slate-400 hover:text-white hover:bg-white/10"
          >
            Regenerate
          </Button>
        )}
      </div>

      {loading && (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5 text-slate-400">
            <Loading02Icon size={18} color="#94a3b8" />
            <span className="text-xs font-medium tracking-wide">Analysing your data…</span>
          </div>
          <div className="space-y-2.5 animate-pulse">
            <div className="h-3.5 bg-slate-700 rounded-full w-full" />
            <div className="h-3.5 bg-slate-700 rounded-full w-11/12" />
            <div className="h-3.5 bg-slate-700 rounded-full w-4/5" />
            <div className="h-3.5 bg-slate-700 rounded-full w-3/4 mt-3" />
            <div className="h-3.5 bg-slate-700 rounded-full w-5/6" />
          </div>
        </div>
      )}

      {insight && !loading && (
        <p className="text-sm text-slate-200 leading-relaxed">{insight}</p>
      )}

      {!insight && !loading && (
        <p className="text-sm text-slate-500">
          Click "Generate Insights" to get an AI-powered plain-English summary of your campaign performance and recommended next steps.
        </p>
      )}
    </div>
  )
}
