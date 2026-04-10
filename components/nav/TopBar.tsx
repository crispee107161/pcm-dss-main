'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { NavItem } from './Sidebar'

interface TopBarProps {
  navItems: NavItem[]
  email: string
  roleLabel: string
  collapsed: boolean
  onToggle: () => void
}

export default function TopBar({ navItems, email, roleLabel, collapsed, onToggle }: TopBarProps) {
  const pathname = usePathname()

  // Resolve section for each item (items inherit section from previous)
  const resolved = navItems.map((item, i) => {
    if (item.section) return item
    for (let j = i - 1; j >= 0; j--) {
      if (navItems[j].section) return { ...item, section: navItems[j].section }
    }
    return item
  })

  const homeItem = navItems[0]

  // Find best matching nav item for current path
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

  const isHome = current?.href === homeItem?.href
  const initial = email.charAt(0).toUpperCase()

  return (
    <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 sticky top-0 z-40 print:hidden flex-shrink-0">
      {/* Left: toggle + breadcrumb */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Sidebar toggle */}
        <button
          onClick={onToggle}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors flex-shrink-0"
        >
          {collapsed ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <rect x="3" y="3" width="18" height="18" rx="2" strokeWidth={1.5} />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 3v18" />
            </svg>
          )}
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm min-w-0">
          {/* Home icon */}
          <Link
            href={homeItem?.href ?? '#'}
            className="text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
            aria-label="Dashboard home"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>

          <Chevron />

          {/* App name — links home, hidden when already on home */}
          {!isHome ? (
            <>
              <Link
                href={homeItem?.href ?? '#'}
                className="text-slate-500 hover:text-slate-700 font-medium transition-colors whitespace-nowrap"
              >
                PC Merchandise DSS
              </Link>
              <Chevron />
              <span className="text-slate-800 font-semibold truncate">{current?.label ?? 'Dashboard'}</span>
            </>
          ) : (
            <span className="text-slate-800 font-semibold">Dashboard</span>
          )}
        </nav>
      </div>

      {/* Right: user pill */}
      <div className="flex items-center gap-2.5 flex-shrink-0 ml-4">
        <div className="text-right hidden sm:block">
          <p className="text-xs font-medium text-slate-700 leading-none">{roleLabel}</p>
          <p className="text-xs text-slate-400 mt-0.5 truncate max-w-[180px]">{email}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
          {initial}
        </div>
      </div>
    </div>
  )
}

function Chevron() {
  return (
    <svg className="w-3 h-3 text-slate-300 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}
