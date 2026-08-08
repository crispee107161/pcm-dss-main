'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { logoutAction, idleLogoutAction } from '@/actions/auth'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

const IDLE_TIMEOUT_MS = 15 * 60 * 1000
const WARNING_BEFORE_MS = 60 * 1000
const BROADCAST_CHANNEL_NAME = 'pcm-dss-idle-timeout'

// scroll doesn't bubble to window from inner overflow containers (sidebar nav,
// data tables), so it needs a capture-phase listener; wheel/touchmove catch
// trackpad/touch scrolling with a stationary cursor that mousemove would miss.
const ACTIVITY_LISTENERS: Array<[string, AddEventListenerOptions]> = [
  ['mousemove', {}],
  ['mousedown', {}],
  ['keydown', {}],
  ['touchstart', { passive: true }],
  ['touchmove', { passive: true }],
  ['wheel', { passive: true }],
  ['scroll', { capture: true, passive: true }],
]

type BroadcastMessage = { type: 'activity' } | { type: 'logout' }

export function IdleTimeoutProvider({ children }: { children: ReactNode }) {
  const [warningOpen, setWarningOpen] = useState(false)
  const [secondsLeft, setSecondsLeft] = useState(WARNING_BEFORE_MS / 1000)
  const warningTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const logoutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const warningOpenRef = useRef(false)
  const channel = useRef<BroadcastChannel | null>(null)

  useEffect(() => {
    warningOpenRef.current = warningOpen
  }, [warningOpen])

  const clearTimers = useCallback(() => {
    if (warningTimer.current) clearTimeout(warningTimer.current)
    if (logoutTimer.current) clearTimeout(logoutTimer.current)
    if (countdownInterval.current) clearInterval(countdownInterval.current)
  }, [])

  const forceLogout = useCallback(() => {
    channel.current?.postMessage({ type: 'logout' } satisfies BroadcastMessage)
    idleLogoutAction().catch(() => {
      window.location.assign('/login?reason=idle')
    })
  }, [])

  const scheduleTimers = useCallback(() => {
    clearTimers()
    warningTimer.current = setTimeout(() => {
      setSecondsLeft(WARNING_BEFORE_MS / 1000)
      setWarningOpen(true)
      countdownInterval.current = setInterval(() => {
        setSecondsLeft((prev) => Math.max(prev - 1, 0))
      }, 1000)
    }, IDLE_TIMEOUT_MS - WARNING_BEFORE_MS)

    logoutTimer.current = setTimeout(forceLogout, IDLE_TIMEOUT_MS)
  }, [clearTimers, forceLogout])

  const dismissWarning = useCallback(() => {
    if (warningOpenRef.current) setWarningOpen(false)
    scheduleTimers()
  }, [scheduleTimers])

  const handleActivity = useCallback(() => {
    dismissWarning()
    channel.current?.postMessage({ type: 'activity' } satisfies BroadcastMessage)
  }, [dismissWarning])

  useEffect(() => {
    scheduleTimers()

    const bc = 'BroadcastChannel' in window ? new BroadcastChannel(BROADCAST_CHANNEL_NAME) : null
    channel.current = bc
    if (bc) {
      bc.onmessage = (event: MessageEvent<BroadcastMessage>) => {
        if (event.data.type === 'activity') {
          dismissWarning()
        } else if (event.data.type === 'logout') {
          window.location.assign('/login?reason=idle')
        }
      }
    }

    ACTIVITY_LISTENERS.forEach(([event, options]) =>
      window.addEventListener(event, handleActivity, options)
    )
    return () => {
      clearTimers()
      bc?.close()
      channel.current = null
      ACTIVITY_LISTENERS.forEach(([event, options]) =>
        window.removeEventListener(event, handleActivity, options)
      )
    }
  }, [handleActivity, scheduleTimers, clearTimers, dismissWarning])

  return (
    <>
      {children}
      <Dialog open={warningOpen} onOpenChange={(open) => !open && dismissWarning()}>
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Still there?</DialogTitle>
            <DialogDescription>
              You&apos;ve been inactive for a while. For your security, you&apos;ll be signed out in{' '}
              {secondsLeft}s.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <form action={logoutAction}>
              <Button type="submit" variant="outline">
                Sign out now
              </Button>
            </form>
            <Button type="button" onClick={dismissWarning}>
              Stay signed in
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
