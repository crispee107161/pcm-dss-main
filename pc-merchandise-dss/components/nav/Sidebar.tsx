'use client'

import { useState, useEffect, useRef } from 'react'
import { useActionState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { logoutAction } from '@/actions/auth'
import { changePasswordAction } from '@/actions/profile'
import TopBar from './TopBar'

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
  const [collapsed, setCollapsed] = useState(false)
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
    if (!collapsed && item.section && item.section !== currentSection) {
      currentSection = item.section
      rendered.push(
        <p key={`section-${item.section}`} className="px-3 pt-4 pb-1 text-xs font-semibold text-zinc-500 uppercase tracking-widest">
          {item.section}
        </p>
      )
    }
    const active = isActive(item.href)
    rendered.push(
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        className={`flex items-center gap-3 rounded-lg text-sm font-medium transition-colors ${
          collapsed ? 'justify-center px-2 py-2' : 'px-3 py-1.5'
        } ${
          active
            ? 'bg-red-600 text-white'
            : 'text-zinc-400 hover:bg-zinc-900 hover:text-white'
        }`}
      >
        <span className="w-4 h-4 flex-shrink-0">{item.icon}</span>
        {!collapsed && item.label}
      </Link>
    )
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 bg-black text-white flex flex-col print:hidden transition-all duration-200 ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        {/* Logo */}
        <div
          className={`py-3.5 border-b border-zinc-800 flex items-center flex-shrink-0 ${
            collapsed ? 'justify-center px-2' : 'px-4 gap-2.5'
          }`}
        >
          <img src="/pcm-logo.png" alt="PC Merchandise" className="w-7 h-7 object-contain flex-shrink-0" />
          {!collapsed && (
            <div className="min-w-0">
              <span className="font-bold text-white text-sm leading-none">PC Merchandise</span>
              <span className="text-zinc-500 text-xs ml-1">DSS</span>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className={`flex-1 overflow-y-auto py-3 space-y-0.5 ${collapsed ? 'px-2' : 'px-3'}`}>
          {rendered}
        </nav>

        {/* User area with dropdown */}
        <div className="border-t border-zinc-800 relative flex-shrink-0" ref={dropdownRef}>
          {/* Dropdown card */}
          {dropdownOpen && (
            <div
              className={`absolute z-10 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden ${
                collapsed
                  ? 'bottom-2 left-full ml-2 w-64'
                  : 'bottom-full mb-2 left-2 right-2'
              }`}
            >
              {/* Identity */}
              <div className="px-4 py-3 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-red-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                    {initial}
                  </div>
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
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                  Change Password
                  <svg
                    className={`w-3.5 h-3.5 text-zinc-500 ml-auto transition-transform ${changePwOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Change password form */}
                {changePwOpen && (
                  <form action={pwAction} className="px-3 pb-2 pt-1 space-y-2">
                    {pwState?.error && (
                      <p className="text-red-400 text-xs bg-red-950/50 border border-red-900 rounded-lg px-2 py-1.5">{pwState.error}</p>
                    )}
                    {pwState?.success && (
                      <p className="text-green-400 text-xs bg-green-950/50 border border-green-900 rounded-lg px-2 py-1.5">{pwState.success}</p>
                    )}
                    <input
                      name="current_password"
                      type="password"
                      placeholder="Current password"
                      required
                      className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                    <input
                      name="new_password"
                      type="password"
                      placeholder="New password"
                      required
                      className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                    <input
                      name="confirm_password"
                      type="password"
                      placeholder="Confirm new password"
                      required
                      className="w-full px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-white text-xs placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-red-600"
                    />
                    <button
                      type="submit"
                      disabled={pwPending}
                      className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-900 disabled:text-red-400 text-white text-xs rounded-lg py-1.5 font-medium transition-colors"
                    >
                      {pwPending ? 'Updating...' : 'Update Password'}
                    </button>
                  </form>
                )}

                {/* Sign out */}
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
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
            className={`w-full flex items-center transition-colors hover:bg-zinc-900 ${
              collapsed ? 'justify-center p-3' : 'gap-3 px-4 py-3'
            }`}
          >
            <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initial}
            </div>
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1 text-left">
                  <p className="text-zinc-300 text-xs truncate">{email}</p>
                  <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium mt-0.5 ${roleBadgeClass}`}>
                    {roleLabel}
                  </span>
                </div>
                <svg
                  className={`w-3.5 h-3.5 text-zinc-500 flex-shrink-0 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div
        className={`flex-1 min-h-screen print:ml-0 flex flex-col transition-all duration-200 ${
          collapsed ? 'ml-16' : 'ml-60'
        }`}
      >
        <TopBar
          navItems={navItems}
          email={email}
          roleLabel={roleLabel}
          collapsed={collapsed}
          onToggle={() => setCollapsed(v => !v)}
        />
        <div className="flex-1">
          {children}
        </div>
      </div>
    </div>
  )
}
