'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { NavItem } from './Sidebar'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Menu01Icon } from '@animateicons/react/huge'

interface TopBarProps {
  navItems: NavItem[]
  email: string
  roleLabel: string
  onMobileMenuOpen: () => void
}

export default function TopBar({ navItems, email, roleLabel, onMobileMenuOpen }: TopBarProps) {
  const pathname = usePathname()

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
      className="h-14 flex items-center justify-between px-4 sticky top-0 z-40 print:hidden flex-shrink-0"
      style={{
        background: 'rgba(11,11,11,0.9)',
        backdropFilter: 'blur(8px)',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      {/* Left */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Mobile hamburger */}
        <button
          onClick={onMobileMenuOpen}
          aria-label="Open menu"
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-[background-color,color] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-1 flex-shrink-0"
        >
          <Menu01Icon size={16} />
        </button>

        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 text-sm min-w-0">
          <Link
            href={homeItem?.href ?? '#'}
            className="text-gray-400 hover:text-red-600 transition-colors flex-shrink-0"
            aria-label="Dashboard home"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </Link>

          <Link
            href={homeItem?.href ?? '#'}
            className="text-gray-400 hover:text-gray-600 font-medium transition-[color] whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 rounded"
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
        <div className="text-right hidden sm:block">
          <p className="text-xs font-semibold text-gray-700 leading-none">{roleLabel}</p>
          <p className="text-[11px] text-gray-400 mt-0.5 truncate max-w-[180px]">{email}</p>
        </div>
        <Avatar className="w-8 h-8 flex-shrink-0 ring-2 ring-red-200 rounded-full">
          <AvatarFallback className="bg-red-600 text-white text-xs font-bold">{initial}</AvatarFallback>
        </Avatar>
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
