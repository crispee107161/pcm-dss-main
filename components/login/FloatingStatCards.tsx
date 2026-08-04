'use client'

import { useEffect, useRef } from 'react'

interface StatCard {
  dotColor: string
  tint: string
  label: string
  value: string
  floatClass: string
  offsetClass: string
}

const STATS: StatCard[] = [
  {
    dotColor: 'bg-primary',
    tint: 'color-mix(in srgb, var(--primary) 15%, transparent)',
    label: 'Total Ad Reach',
    value: '847,293 people',
    floatClass: 'fa',
    offsetClass: '',
  },
  {
    dotColor: 'bg-[var(--status-positive)]',
    tint: 'color-mix(in srgb, var(--status-positive) 12%, transparent)',
    label: 'Inquiries Tracked',
    value: '1,284 inquiries',
    floatClass: 'fb',
    offsetClass: 'ml-10',
  },
  {
    dotColor: 'bg-[var(--status-warning)]',
    tint: 'color-mix(in srgb, var(--status-warning) 12%, transparent)',
    label: 'Model Accuracy',
    value: 'R² = 89.4%',
    floatClass: 'fc',
    offsetClass: 'ml-5',
  },
]

const MAX_TILT_DEG = 6

/**
 * Three glass stat cards with an infinite float loop (CSS) plus a pointer-driven
 * 3D tilt (JS). These have to live on separate elements: CSS animations win over
 * inline styles in the cascade, so tilt applied to the same element the float
 * animation owns would be silently overridden. The outer element keeps `.fa/.fb/.fc`
 * (translateY + rotate loop); the inner element receives the tilt transform.
 */
export function FloatingStatCards() {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const cardRefs = useRef<Array<HTMLDivElement | null>>([])
  const rafRef = useRef<number | null>(null)
  const pointerRef = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const reduceMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let listenersAttached = false

    const applyTilt = () => {
      rafRef.current = null
      const pointer = pointerRef.current

      cardRefs.current.forEach((card) => {
        if (!card) return

        if (!pointer) {
          card.style.transform = 'rotateX(0deg) rotateY(0deg)'
          return
        }

        const rect = card.getBoundingClientRect()
        const centerX = rect.left + rect.width / 2
        const centerY = rect.top + rect.height / 2
        const offsetX = (pointer.x - centerX) / (rect.width / 2)
        const offsetY = (pointer.y - centerY) / (rect.height / 2)
        const clampedX = Math.max(-1, Math.min(1, offsetX))
        const clampedY = Math.max(-1, Math.min(1, offsetY))

        const rotateY = clampedX * MAX_TILT_DEG
        const rotateX = -clampedY * MAX_TILT_DEG

        card.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
      })
    }

    const scheduleTilt = () => {
      if (rafRef.current !== null) return
      rafRef.current = requestAnimationFrame(applyTilt)
    }

    const handleMouseMove = (event: MouseEvent) => {
      pointerRef.current = { x: event.clientX, y: event.clientY }
      scheduleTilt()
    }

    const handleMouseLeave = () => {
      pointerRef.current = null
      scheduleTilt()
    }

    const attachListeners = () => {
      if (listenersAttached) return
      container.addEventListener('mousemove', handleMouseMove)
      container.addEventListener('mouseleave', handleMouseLeave)
      listenersAttached = true
    }

    const detachListeners = () => {
      if (!listenersAttached) return
      container.removeEventListener('mousemove', handleMouseMove)
      container.removeEventListener('mouseleave', handleMouseLeave)
      listenersAttached = false
      pointerRef.current = null
      applyTilt()
    }

    const syncToPreference = () => {
      if (reduceMotionQuery.matches) {
        detachListeners()
      } else {
        attachListeners()
      }
    }

    syncToPreference()
    reduceMotionQuery.addEventListener('change', syncToPreference)

    return () => {
      reduceMotionQuery.removeEventListener('change', syncToPreference)
      detachListeners()
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [])

  return (
    <div ref={containerRef} className="space-y-3">
      <style>{`
        @keyframes float-a {
          0%, 100% { transform: translateY(0px) rotate(-1deg); }
          50%       { transform: translateY(-14px) rotate(1deg); }
        }
        @keyframes float-b {
          0%, 100% { transform: translateY(0px) rotate(0.5deg); }
          50%       { transform: translateY(-9px) rotate(-1.5deg); }
        }
        @keyframes float-c {
          0%, 100% { transform: translateY(0px) rotate(1deg); }
          50%       { transform: translateY(-18px) rotate(-0.5deg); }
        }
        .fa { animation: float-a 7s ease-in-out infinite; }
        .fb { animation: float-b 9s ease-in-out infinite 1.5s; }
        .fc { animation: float-c 8s ease-in-out infinite 3s; }
        .stat-tilt {
          transform-style: preserve-3d;
          transition: transform 0.25s cubic-bezier(0.22,1,0.36,1);
          will-change: transform;
        }
      `}</style>

      {STATS.map((stat, index) => (
        <div
          key={stat.label}
          className={`${stat.floatClass} w-fit ${stat.offsetClass}`}
          style={{ perspective: 800 }}
        >
          <div
            ref={(el) => {
              cardRefs.current[index] = el
            }}
            className="stat-tilt flex items-center gap-3.5 rounded-xl px-4 py-3"
            style={{
              background: 'color-mix(in srgb, var(--card) 70%, transparent)',
              border: '1px solid var(--border)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: stat.tint }}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${stat.dotColor}`} />
            </div>
            <div>
              <p className="text-muted-foreground text-[11px]">{stat.label}</p>
              <p className="text-foreground font-bold text-sm">{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
