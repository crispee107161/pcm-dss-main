'use client'

import { useState, useRef, useEffect } from 'react'
import { sendChatMessage, type ChatMessage } from '@/actions/chat'
import { ScrollArea } from '@/components/ui/scroll-area'
import { MessageCircleMoreIcon, type MessageCircleMoreIconHandle } from '@/components/icons/message-circle-more-icon'

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
  const iconRef = useRef<MessageCircleMoreIconHandle>(null)
  const [scrollHidden, setScrollHidden] = useState(false)

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Hide the floating launcher while actively scrolling down so it doesn't sit
  // on top of card content mid-scroll — it reappears on scroll-up or once idle.
  useEffect(() => {
    let lastY = window.scrollY
    let ticking = false
    let idleTimer: ReturnType<typeof setTimeout> | null = null

    function onScroll() {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        const y = window.scrollY
        const delta = y - lastY
        if (Math.abs(delta) > 4) {
          setScrollHidden(delta > 0 && y > 80)
          lastY = y
        }
        ticking = false
      })
      if (idleTimer) clearTimeout(idleTimer)
      idleTimer = setTimeout(() => setScrollHidden(false), 600)
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (idleTimer) clearTimeout(idleTimer)
    }
  }, [])

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
        <div className="animate-scale-in fixed bottom-20 left-2 right-2 sm:left-auto sm:right-4 sm:w-[380px] z-[60] flex flex-col bg-card rounded-2xl overflow-hidden card-shadow-floating print:hidden"
          style={{ height: '480px' }}>

          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-black flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-neutral-700 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15M14.25 3.104c.251.023.501.05.75.082M19.8 15l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.607L5 14.5m14.8.5l1.196 4.783a1 1 0 01-.985 1.217H3.99a1 1 0 01-.985-1.217L4.2 15m10.6 0H9.2" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-semibold">PCM Assistant</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-white transition-colors p-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1">
          <div className="p-4 space-y-3">
            {history.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 text-center pt-2">
                  Ask me anything about your campaigns, model, or performance data.
                </p>
                <div className="grid grid-cols-1 gap-2 mt-2">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      className="animate-fade-slide-up text-left text-xs text-gray-600 bg-gray-50 hover:bg-neutral-500/10 hover:text-gray-800 border border-gray-200 hover:border-neutral-400/40 rounded-xl px-3 py-2 transition-[background-color,border-color,color]"
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
                    ? 'bg-secondary text-secondary-foreground rounded-br-sm'
                    : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            <div ref={bottomRef} />
          </div>
          </ScrollArea>

          {/* Input */}
          <div className="flex-shrink-0 border-t border-gray-100 p-3 flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about your data..."
              disabled={loading}
              className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:border-transparent disabled:opacity-50 placeholder-gray-400 transition-[border-color]"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="w-9 h-9 flex items-center justify-center bg-neutral-700 hover:bg-neutral-600 active:bg-neutral-800 disabled:bg-gray-200 disabled:text-gray-400 text-white rounded-xl transition-[background-color] flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Floating button — just the icon, no button-shaped background */}
      <button
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => iconRef.current?.startAnimation()}
        onMouseLeave={() => iconRef.current?.stopAnimation()}
        className="fixed bottom-5 right-5 z-[60] flex items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 print:hidden
          fill-neutral-400 hover:fill-neutral-300 active:fill-neutral-500 stroke-neutral-700
          dark:fill-neutral-700 dark:hover:fill-neutral-600 dark:active:fill-neutral-800 dark:stroke-white"
        style={{
          filter: 'drop-shadow(0 2px 5px rgba(0,0,0,0.3)) drop-shadow(0 0 1px rgba(0,0,0,0.25))',
          transition: 'fill 0.15s, filter 0.15s, transform 0.2s, opacity 0.2s',
          transform: scrollHidden && !open ? 'translateY(80px)' : 'translateY(0)',
          opacity: scrollHidden && !open ? 0 : 1,
          pointerEvents: scrollHidden && !open ? 'none' : 'auto',
        }}
        title="AI Assistant"
      >
        <MessageCircleMoreIcon ref={iconRef} size={40} />
      </button>
    </>
  )
}
