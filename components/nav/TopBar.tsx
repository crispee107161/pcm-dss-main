'use client'

import { useEffect, useRef, useState } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { NavItem } from './Sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Menu01Icon } from '@animateicons/react/huge'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useBlur } from '@/contexts/BlurContext'
import ThemeToggle from '@/components/nav/ThemeToggle'
import { logoutAction } from '@/actions/auth'
import { changePasswordAction } from '@/actions/profile'

interface TopBarProps {
  navItems: NavItem[]
  email: string
  roleLabel: string
  expanded: boolean
  onToggleExpanded: () => void
  onMobileMenuOpen: () => void
}

export default function TopBar({ navItems, email, roleLabel, expanded, onToggleExpanded, onMobileMenuOpen }: TopBarProps) {
  const pathname = usePathname()
  const { blurred, toggleBlur } = useBlur()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [changePwOpen, setChangePwOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [pwState, pwAction, pwPending] = useActionState(changePasswordAction, null)

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

  // Close dropdown on Escape
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setDropdownOpen(false)
      setChangePwOpen(false)
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [])

  // Close dropdown when navigating
  useEffect(() => {
    setDropdownOpen(false)
    setChangePwOpen(false)
  }, [pathname])

  // Auto-close change-pw panel on success
  useEffect(() => {
    if (pwState?.success) {
      const t = setTimeout(() => setChangePwOpen(false), 1800)
      return () => clearTimeout(t)
    }
  }, [pwState])

  const resolved = navItems.map((item, i) => {
    if (item.section) return item
    for (let j = i - 1; j >= 0; j--) {
      if (navItems[j].section) return { ...item, section: navItems[j].section }
    }
    return item
  })

  const homeItem = navItems[0]

  const current = resolved.reduce<(typeof resolved)[0] | undefined>((best, item) => {
    if (pathname === item.href) return item
    if (best && best.href === pathname) return best
    if (
      pathname.startsWith(item.href + '/') &&
      item.href.split('/').length >= (best?.href.split('/').length ?? 0)
    )
      return item
    return best
  }, undefined)

  // Derive a label from the path when no nav item matches (e.g. new subpages)
  function pathLabel(path: string): string {
    const seg = path.split('/').filter(Boolean).pop() ?? ''
    return seg.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  }

  // Exclude /login from the fallback — Next.js App Router keeps the URL at /login
  // briefly after a server-action redirect, which would otherwise render "Login" in the breadcrumb.
  const currentLabel = current?.label ?? (
    pathname !== homeItem?.href && !pathname.startsWith('/login') ? pathLabel(pathname) : null
  )
  const isHome = !currentLabel || current?.href === homeItem?.href
  const initial = email.charAt(0).toUpperCase()

  return (
    <div
      // Follows the app theme like the sidebar rail — built on the same
      // sidebar surface tokens so both stay a matching light/dark chrome.
      className="h-14 flex items-center justify-between px-4 sticky top-0 z-40 print:hidden flex-shrink-0"
      style={{
        background: 'color-mix(in srgb, var(--sidebar) 90%, transparent)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid var(--sidebar-border)',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Sidebar collapse toggle — desktop only */}
        <button
          type="button"
          onClick={onToggleExpanded}
          title={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          aria-expanded={expanded}
          aria-label={expanded ? 'Collapse sidebar' : 'Expand sidebar'}
          className="hidden md:flex w-8 h-8 items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 flex-shrink-0"
        >
          {expanded ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
        </button>

        {/* Mobile hamburger */}
        <button
          onClick={onMobileMenuOpen}
          aria-label="Open menu"
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 flex-shrink-0"
        >
          <Menu01Icon size={16} />
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm min-w-0">
          <Link
            href={homeItem?.href ?? '#'}
            className="text-gray-400 hover:text-primary transition-colors flex-shrink-0"
            aria-label="Dashboard home"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>

          <Link
            href={homeItem?.href ?? '#'}
            className="text-gray-400 hover:text-gray-600 font-medium transition-[color] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded"
          >
            Home
          </Link>

          <Chevron />

          {!isHome ? (
            <span className="text-gray-800 font-bold truncate">{currentLabel}</span>
          ) : (
            <span className="text-gray-800 font-bold">Dashboard</span>
          )}
        </nav>
      </div>

      {/* Right */}
      <div className="flex items-center gap-3 flex-shrink-0 ml-4">
        <ThemeToggle />
        <button
          onClick={toggleBlur}
          aria-pressed={blurred}
          aria-label={blurred ? 'Show sensitive data' : 'Blur sensitive data'}
          title={blurred ? 'Show sensitive data' : 'Blur sensitive data'}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 flex-shrink-0"
        >
          {blurred ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          )}
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(v => !v)}
            aria-haspopup="menu"
            aria-label="Account menu"
            aria-expanded={dropdownOpen}
            className="flex items-center rounded-full p-0.5 hover:bg-gray-100 transition-[background-color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          >
            <Avatar className="w-8 h-8 flex-shrink-0 ring-2 rounded-full ring-crimson-200">
              <AvatarFallback className="bg-crimson-500 text-white text-xs font-bold">{initial}</AvatarFallback>
            </Avatar>
          </button>

          {dropdownOpen && (
            <div className="animate-fade-slide-up absolute z-10 top-full mt-2 right-0 w-64 bg-card border border-border rounded-xl overflow-hidden card-shadow-floating">
              {/* Identity */}
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border">
                <Avatar className="w-10 h-10 flex-shrink-0 ring-2 rounded-full ring-crimson-200">
                  <AvatarFallback className="bg-crimson-500 text-white text-sm font-bold">{initial}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{roleLabel}</p>
                  <p className="text-xs text-gray-400 truncate">{email}</p>
                </div>
              </div>

              <div className="p-1.5 space-y-0.5">
                {/* Change password toggle */}
                <button
                  onClick={() => setChangePwOpen(v => !v)}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors text-left"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Change Password
                  <svg
                    className={`w-3.5 h-3.5 text-gray-400 ml-auto transition-transform ${changePwOpen ? 'rotate-180' : ''}`}
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
                        <p className="text-red-600 dark:text-red-400 text-xs bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg px-2 py-1.5">{pwState.error}</p>
                      )}
                      {pwState?.success && (
                        <p className="text-green-600 dark:text-green-400 text-xs bg-green-50 dark:bg-green-950/50 border border-green-200 dark:border-green-900 rounded-lg px-2 py-1.5">{pwState.success}</p>
                      )}
                      <Input
                        name="current_password"
                        type="password"
                        placeholder="Current password"
                        required
                        className="w-full text-base sm:text-xs"
                      />
                      <Input
                        name="new_password"
                        type="password"
                        placeholder="New password"
                        required
                        className="w-full text-base sm:text-xs"
                      />
                      <Input
                        name="confirm_password"
                        type="password"
                        placeholder="Confirm new password"
                        required
                        className="w-full text-base sm:text-xs"
                      />
                      <button
                        type="submit"
                        disabled={pwPending}
                        className="w-full bg-primary hover:bg-primary/90 disabled:bg-primary/30 disabled:text-white/60 text-white text-xs rounded-lg py-1.5 font-medium transition-[background-color]"
                      >
                        {pwPending ? 'Updating...' : 'Update Password'}
                      </button>
                    </form>
                  </div>
                </div>
              </div>

              {/* Sign out */}
              <div className="p-1.5 pt-0 border-t border-border">
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-3 px-3 py-2 mt-1.5 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
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
        </div>
      </div>
    </div>
  )
}

function Chevron() {
  return (
    <svg className="w-3 h-3 text-gray-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}
