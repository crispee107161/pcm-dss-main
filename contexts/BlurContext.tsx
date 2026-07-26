'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

const STORAGE_KEY = 'pcm-dss-blur-sensitive'

interface BlurContextValue {
  blurred: boolean
  toggleBlur: () => void
}

const BlurContext = createContext<BlurContextValue | null>(null)

export function BlurProvider({ children }: { children: ReactNode }) {
  const [blurred, setBlurred] = useState(false)

  useEffect(() => {
    setBlurred(localStorage.getItem(STORAGE_KEY) === 'true')
  }, [])

  useEffect(() => {
    document.documentElement.dataset.blurSensitive = String(blurred)
  }, [blurred])

  function toggleBlur() {
    setBlurred((prev) => {
      const next = !prev
      localStorage.setItem(STORAGE_KEY, String(next))
      return next
    })
  }

  return (
    <BlurContext.Provider value={{ blurred, toggleBlur }}>
      {children}
    </BlurContext.Provider>
  )
}

export function useBlur(): BlurContextValue {
  const ctx = useContext(BlurContext)
  if (!ctx) throw new Error('useBlur must be used within BlurProvider')
  return ctx
}
