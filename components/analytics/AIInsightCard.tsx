'use client'

import { useState } from 'react'
import { generateAIInsights, type InsightData } from '@/actions/ai-insights'

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
          <button
            onClick={handleGenerate}
            className="text-sm font-medium text-white bg-red-600 hover:bg-red-500 active:bg-red-700 px-4 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 whitespace-nowrap"
          >
            Generate Insights
          </button>
        )}
        {insight && (
          <button
            onClick={handleGenerate}
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Regenerate
          </button>
        )}
      </div>

      {loading && (
        <div className="space-y-2.5 animate-pulse">
          <div className="h-3.5 bg-slate-700 rounded-full w-full" />
          <div className="h-3.5 bg-slate-700 rounded-full w-11/12" />
          <div className="h-3.5 bg-slate-700 rounded-full w-4/5" />
          <div className="h-3.5 bg-slate-700 rounded-full w-3/4 mt-3" />
          <div className="h-3.5 bg-slate-700 rounded-full w-5/6" />
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
