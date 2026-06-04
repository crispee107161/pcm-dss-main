'use client'

import { useState, useRef, useEffect } from 'react'
import { sendChatMessage, type ChatMessage } from '@/actions/chat'

const SUGGESTIONS = [
  'Which ad had the best CPA?',
  'What does the R² value mean?',
  'How much did we spend in total?',
  'What should we focus on next?',
]

export default function ChatBot() {
  const [open, setOpen] = useState(false)
  const [history, setHistory] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [history, loading])

  async function handleSend(message?: string) {
    const text = (message ?? input).trim()
    if (!text || loading) return

    const userMsg: ChatMessage = { role: 'user', text }
    setHistory(h => [...h, userMsg])
    setInput('')
    setLoading(true)

    const reply = await sendChatMessage(history, text)
    setHistory(h => [...h, { role: 'model', text: reply }])
    setLoading(false)
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Chat panel */}
      {open && (
        <div className="animate-scale-in fixed bottom-20 left-2 right-2 sm:left-auto sm:right-4 sm:w-[380px] z-[60] flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden card-shadow-floating"
          style={{ height: '480px' }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-slate-900 flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.607L5 14.5m14.8.5l1.196 4.783a1 1 0 01-.985 1.217H3.99a1 1 0 01-.985-1.217L4.2 15m10.6 0H9.2" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">PCM Assistant</p>
              <p className="text-slate-400 text-xs">Powered by Groq · Llama 3</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-white transition-colors p-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {history.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs text-slate-400 text-center pt-2">
                  Ask me anything about your campaigns, model, or performance data.
                </p>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      className="animate-fade-slide-up text-left text-xs text-slate-600 bg-slate-50 hover:bg-red-50/40 hover:text-slate-800 border border-slate-200 hover:border-red-200 rounded-xl px-3 py-2 transition-[background-color,border-color,color]"
                      style={{ animationDelay: `${i * 60}ms` }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {history.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-red-600 text-white rounded-br-sm'
                    : 'bg-slate-100 text-slate-800 rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-slate-100 p-3 flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your data..."
              disabled={loading}
              className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 focus-visible:border-transparent disabled:opacity-50 placeholder-slate-400 transition-[border-color]"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="w-9 h-9 flex items-center justify-center bg-red-600 hover:bg-red-500 active:bg-red-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl transition-[background-color] flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-4 right-4 z-[60] flex items-center justify-center bg-red-600 hover:bg-red-500 active:bg-red-700 text-white rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-1"
        style={{
          width: 52,
          height: 52,
          boxShadow: '0 4px 16px rgba(220,38,38,0.4), 0 1px 4px rgba(0,0,0,0.15)',
          transition: 'background-color 0.15s, box-shadow 0.15s, transform 0.15s',
        }}
        title="AI Assistant"
      >
        <svg
          className="w-5 h-5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          style={{ transition: 'transform 0.2s cubic-bezier(0.22,1,0.36,1)', transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}
        >
          {open ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          )}
        </svg>
      </button>
    </>
  )
}
