'use client'

import { useState, useEffect, useRef } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, useReducedMotion } from 'framer-motion'
import { logoutAction } from '@/actions/auth'
import { changePasswordAction } from '@/actions/profile'
import TopBar from './TopBar'
import ChatBot from '@/components/analytics/ChatBot'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

const RAIL_WIDTH = 80
const EXPANDED_WIDTH = 240
const SIDEBAR_TRANSITION = { duration: 0.35, ease: [0.4, 0, 0.2, 1] as const }
const TEXT_TRANSITION = { duration: 0.2, ease: 'easeInOut' as const }
const REDUCED_TRANSITION = { duration: 0.01 }
const HOVER_OPEN_DELAY = 150
const HOVER_CLOSE_DELAY = 300

function PinIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 4.5h6M9.5 4.5l.5 6-2.5 3v2h9v-2l-2.5-3 .5-6M12 16v4.5" />
    </svg>
  )
}

// Fades and collapses text in lockstep with the sidebar's width animation
// instead of snapping via a `md:hidden` class, which can't be animated.
function FadeText({
  show,
  as = 'span',
  className,
  children,
}: {
  show: boolean
  as?: 'span' | 'div' | 'p'
  className?: string
  children: React.ReactNode
}) {
  const reduceMotion = useReducedMotion()
  const displayValue = as === 'span' ? 'inline-block' : 'block'
  const animate = { opacity: show ? 1 : 0, display: show ? displayValue : 'none' }
  const transition = reduceMotion ? REDUCED_TRANSITION : TEXT_TRANSITION
  if (as === 'div') return <motion.div animate={animate} transition={transition} className={className}>{children}</motion.div>
  if (as === 'p') return <motion.p animate={animate} transition={transition} className={className}>{children}</motion.p>
  return <motion.span animate={animate} transition={transition} className={className}>{children}</motion.span>
}

export interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
  section?: string
}

interface SidebarProps {
  navItems: NavItem[]
  email: string
  roleLabel: string
  roleBadgeClass: string
  children: React.ReactNode
}

export default function Sidebar({ navItems, email, roleLabel, roleBadgeClass, children }: SidebarProps) {
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()
  // Defaults to the compact icon-rail width; hovering, focusing, or pinning expands it.
  const [pinned, setPinned] = useState(false)
  const [hovering, setHovering] = useState(false)
  const [focused, setFocused] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [changePwOpen, setChangePwOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const sidebarRef = useRef<HTMLDivElement>(null)
  const hoverOpenTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const collapsed = !(pinned || hovering || focused)

  const [pwState, pwAction, pwPending] = useActionState(changePasswordAction, null)

  function clearHoverTimers() {
    if (hoverOpenTimer.current) clearTimeout(hoverOpenTimer.current)
    if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current)
  }

  function handleMouseEnter() {
    clearHoverTimers()
    hoverOpenTimer.current = setTimeout(() => setHovering(true), HOVER_OPEN_DELAY)
  }

  function handleMouseLeave() {
    clearHoverTimers()
    hoverCloseTimer.current = setTimeout(() => {
      if (!dropdownOpen) setHovering(false)
    }, HOVER_CLOSE_DELAY)
  }

  function handleFocus() {
    setFocused(true)
  }

  function handleBlur(e: React.FocusEvent<HTMLDivElement>) {
    if (!sidebarRef.current?.contains(e.relatedTarget as Node)) {
      setFocused(false)
    }
  }

  useEffect(() => clearHoverTimers, [])

  // The rail only collapses on desktop — mobile always shows full labels in its drawer.
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    const update = () => setIsDesktop(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  const showText = !collapsed || !isDesktop

  // Close dropdown on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
        setChangePwOpen(false)
      }
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Close dropdown and mobile drawer on Escape
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setDropdownOpen(false)
      setChangePwOpen(false)
      setMobileOpen(false)
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [])

  // Close mobile drawer and dropdown when navigating
  useEffect(() => {
    setDropdownOpen(false)
    setChangePwOpen(false)
    setMobileOpen(false)
  }, [pathname])

  // Prevent body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  // Auto-close change-pw panel on success
  useEffect(() => {
    if (pwState?.success) {
      const t = setTimeout(() => setChangePwOpen(false), 1800)
      return () => clearTimeout(t)
    }
  }, [pwState])

  function isActive(href: string): boolean {
    if (pathname === href) return true
    const segments = href.split('/').filter(Boolean)
    if (segments.length >= 3) return pathname.startsWith(href + '/')
    return false
  }

  const initial = email.charAt(0).toUpperCase()

  // Build nav items
  const rendered: React.ReactNode[] = []
  let currentSection: string | undefined = undefined

  for (let i = 0; i < navItems.length; i++) {
    const item = navItems[i]
    if (item.section && item.section !== currentSection) {
      currentSection = item.section
      rendered.push(
        <FadeText
          key={`section-${item.section}`}
          as="p"
          show={showText}
          className="px-3 pt-4 pb-1 text-xs font-semibold text-gray-300 uppercase tracking-widest whitespace-nowrap"
        >
          {item.section}
        </FadeText>
      )
    }
    const active = isActive(item.href)
    rendered.push(
      <Link
        key={item.href}
        href={item.href}
        title={!showText ? item.label : undefined}
        className={`relative flex items-center gap-3 rounded-lg text-sm font-medium transition-colors px-3 py-1.5 overflow-hidden ${
          active ? 'text-white bg-gray-50' : 'text-gray-500 hover:bg-gray-25 hover:text-white'
        }`}
      >
        <span
          className={`absolute -left-3 top-1 bottom-1 w-0.5 rounded-r-full bg-red-500 ${active ? '' : 'hidden'}`}
          aria-hidden
        />
        <span className={`w-5 h-5 flex-shrink-0 ${active ? 'text-red-400' : ''}`}>
          {item.icon}
        </span>
        <FadeText show={showText} className="whitespace-nowrap">
          {item.label}
        </FadeText>
      </Link>
    )
  }

  return (
    <div className="flex min-h-screen bg-background">
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="animate-fade-in fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <motion.div
        ref={sidebarRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        animate={{ width: isDesktop ? (collapsed ? RAIL_WIDTH : EXPANDED_WIDTH) : 288 }}
        transition={reduceMotion ? REDUCED_TRANSITION : SIDEBAR_TRANSITION}
        className={`fixed inset-y-0 left-0 z-50 w-72 md:w-20 bg-background text-white flex flex-col border-r border-white/10 print:hidden transition-transform duration-300
          md:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        {/* h-14 matches TopBar's fixed height exactly, so the sidebar's
            right border and the TopBar's bottom border cross at the same corner. */}
        <div className="h-14 flex items-center flex-shrink-0 px-4 gap-2.5 overflow-hidden">
          <img src="/pcm-logo.png" alt="PC Merchandise" className="w-7 h-7 object-contain flex-shrink-0" />
          <FadeText show={showText} as="div" className="min-w-0 flex-1">
            <span className="font-bold text-white text-sm leading-none whitespace-nowrap">PC Merchandise</span>
            <span className="text-gray-300 text-xs ml-1">DSS</span>
          </FadeText>
          {showText && (
            <button
              type="button"
              onClick={() => setPinned(v => !v)}
              aria-pressed={pinned}
              aria-label={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}
              title={pinned ? 'Unpin sidebar' : 'Pin sidebar open'}
              className="hidden md:flex items-center justify-center w-6 h-6 rounded-md flex-shrink-0 text-gray-300 hover:text-white hover:bg-gray-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <PinIcon className={`w-3.5 h-3.5 ${pinned ? 'text-red-400' : ''}`} />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 space-y-0.5">
          {rendered}
        </nav>

        {/* User area with dropdown */}
        <div className="border-t border-white/10 relative flex-shrink-0" ref={dropdownRef}>
          {/* Dropdown card */}
          {dropdownOpen && (
            <div
              className={`animate-fade-slide-up absolute z-10 bg-gray-25 border border-white/10 rounded-xl overflow-hidden card-shadow-floating bottom-full mb-2 left-2 right-2 ${
                collapsed && isDesktop ? 'md:bottom-2 md:left-full md:right-auto md:ml-2 md:mb-0 md:w-64' : ''
              }`}
            >
              {/* Identity */}
              <div className="px-4 py-3 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <Avatar className="w-9 h-9 flex-shrink-0">
                    <AvatarFallback className="bg-red-600 text-white text-sm font-bold">{initial}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{email}</p>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium mt-0.5 ${roleBadgeClass}`}>
                      {roleLabel}
                    </span>
                  </div>
                </div>
              </div>

              {/* Menu items */}
              <div className="p-1.5 space-y-0.5">
                {/* Change password toggle */}
                <button
                  onClick={() => setChangePwOpen(v => !v)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-white transition-colors text-left"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Change Password
                  <svg
                    className={`w-3.5 h-3.5 text-gray-300 ml-auto transition-transform ${changePwOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Change password form — grid height transition */}
                <div className={`expand-grid${changePwOpen ? ' open' : ''}`}>
                  <div>
                    <form action={pwAction} className="px-3 pb-2 pt-1 space-y-2">
                      {pwState?.error && (
                        <p className="text-red-400 text-xs bg-red-950/50 border border-red-900 rounded-lg px-2 py-1.5">{pwState.error}</p>
                      )}
                      {pwState?.success && (
                        <p className="text-green-400 text-xs bg-green-950/50 border border-green-900 rounded-lg px-2 py-1.5">{pwState.success}</p>
                      )}
                      <Input
                        name="current_password"
                        type="password"
                        placeholder="Current password"
                        required
                        className="w-full bg-gray-50 border-gray-100 text-white text-xs placeholder:text-gray-300 focus-visible:ring-red-500 focus-visible:ring-offset-gray-25"
                      />
                      <Input
                        name="new_password"
                        type="password"
                        placeholder="New password"
                        required
                        className="w-full bg-gray-50 border-gray-100 text-white text-xs placeholder:text-gray-300 focus-visible:ring-red-500 focus-visible:ring-offset-gray-25"
                      />
                      <Input
                        name="confirm_password"
                        type="password"
                        placeholder="Confirm new password"
                        required
                        className="w-full bg-gray-50 border-gray-100 text-white text-xs placeholder:text-gray-300 focus-visible:ring-red-500 focus-visible:ring-offset-gray-25"
                      />
                      <button
                        type="submit"
                        disabled={pwPending}
                        className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-900 disabled:text-red-400 text-white text-xs rounded-lg py-1.5 font-medium transition-[background-color]"
                      >
                        {pwPending ? 'Updating...' : 'Update Password'}
                      </button>
                    </form>
                  </div>
                </div>

                {/* Sign out */}
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-500 hover:bg-gray-50 hover:text-white transition-colors"
                  >
                    <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* User button trigger */}
          <button
            onClick={() => setDropdownOpen(v => !v)}
            aria-haspopup="menu"
            aria-expanded={dropdownOpen}
            className="w-full flex items-center gap-3 px-4 py-3 overflow-hidden transition-[background-color] hover:bg-gray-25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500"
          >
            <Avatar className="w-8 h-8 flex-shrink-0">
              <AvatarFallback className="bg-red-600 text-white text-xs font-bold">{initial}</AvatarFallback>
            </Avatar>
            <FadeText show={showText} as="div" className="min-w-0 flex-1 text-left">
              <p className="text-gray-500 text-xs truncate">{email}</p>
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium mt-0.5 ${roleBadgeClass}`}>
                {roleLabel}
              </span>
            </FadeText>
            <FadeText show={showText} className="flex-shrink-0">
              <svg
                className={`w-3.5 h-3.5 text-gray-300 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            </FadeText>
          </button>
        </div>
      </motion.div>

      {/* Main content */}
      <motion.div
        animate={{ marginLeft: isDesktop ? (collapsed ? RAIL_WIDTH : EXPANDED_WIDTH) : 0 }}
        transition={reduceMotion ? REDUCED_TRANSITION : SIDEBAR_TRANSITION}
        className="flex-1 min-h-screen print:ml-0 flex flex-col overflow-x-hidden"
      >
        <TopBar
          navItems={navItems}
          email={email}
          roleLabel={roleLabel}
          onMobileMenuOpen={() => setMobileOpen(true)}
        />
        <div className="flex-1 pb-20 md:pb-0">
          {children}
        </div>
      </motion.div>

      <ChatBot />
    </div>
  )
}
