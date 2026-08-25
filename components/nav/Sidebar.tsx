'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import Link, { useLinkStatus } from 'next/link'
import Image from 'next/image'
import { motion, useReducedMotion } from 'motion/react'
import TopBar from './TopBar'
import ChatBot from '@/components/analytics/ChatBot'
import { AnimatedNavIcon, type NavIconHandle, type NavIconKey } from './nav-icons'

const RAIL_WIDTH = 80
const EXPANDED_WIDTH = 240
// Same duration + easing on both the rail's width tween and every label's fade
// (previously 0.35s vs 0.2s with different curves), so text and icons settle
// in lockstep with the rail instead of finishing early and looking jagged.
// The curve matches the app's other "fluid" motion (e.g. ChatBot's icon rotation).
const SIDEBAR_TRANSITION = { duration: 0.35, ease: [0.22, 1, 0.36, 1] as const }
const TEXT_TRANSITION = SIDEBAR_TRANSITION
const REDUCED_TRANSITION = { duration: 0.01 }
// v2: default flipped to expanded — versioned so anyone with a stale
// "collapsed" value from before that change doesn't get stuck on it.
const SIDEBAR_EXPANDED_KEY = 'pcm-dss-sidebar-expanded-v2'

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

// Separates icon groups in the collapsed rail, where the section headings are
// hidden and the groups would otherwise run together. The inverse of FadeText:
// it shows precisely when the labels don't.
function FadeDivider({ show }: { show: boolean }) {
  const reduceMotion = useReducedMotion()
  return (
    <motion.div
      aria-hidden
      animate={{ opacity: show ? 1 : 0, display: show ? 'block' : 'none' }}
      transition={reduceMotion ? REDUCED_TRANSITION : TEXT_TRANSITION}
      className="mx-3 my-2 border-t border-sidebar-border"
    />
  )
}

export interface NavItem {
  label: string
  href: string
  icon: NavIconKey
  section?: string
}

// Reads the pending state of the nearest ancestor <Link> (React 19 / Next 15+
// API) — must render as a descendant of <Link>, not beside it. Gives the
// clicked nav item its own instant "working on it" pulse on top of the
// global top progress bar, since a rail item can be visually far from the
// page content that's actually loading.
function NavLinkPendingDot() {
  const { pending } = useLinkStatus()
  if (!pending) return null
  return (
    <span
      aria-hidden
      className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-crimson-500 animate-pulse"
    />
  )
}

// Hover/focus on the whole row drives the icon animation, not just the 20px
// glyph — icon components are refs, so this needs its own component (a plain
// render function can't hold a ref) rather than living inline in Sidebar.
function NavLink({ item, active, showText }: { item: NavItem; active: boolean; showText: boolean }) {
  const iconRef = useRef<NavIconHandle>(null)
  const reduceMotion = useReducedMotion()

  function play() {
    if (reduceMotion) return
    iconRef.current?.startAnimation()
  }
  function reset() {
    iconRef.current?.stopAnimation()
  }

  return (
    <Link
      href={item.href}
      title={!showText ? item.label : undefined}
      aria-label={!showText ? item.label : undefined}
      onMouseEnter={play}
      onMouseLeave={reset}
      onFocus={play}
      onBlur={reset}
      className={`group relative flex items-center gap-3 rounded-lg text-sm font-medium transition-colors px-3 py-1.5 overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-sidebar ${
        active ? 'text-sidebar-foreground bg-sidebar-accent' : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      } ${!showText ? 'justify-center' : ''}`}
    >
      <span
        className={`absolute -left-3 top-1 bottom-1 w-0.5 rounded-r-full bg-crimson-500 ${active ? '' : 'hidden'}`}
        aria-hidden
      />
      <span className={`w-5 h-5 flex-shrink-0 ${active ? 'text-crimson-500' : 'group-hover:text-crimson-500'}`}>
        <AnimatedNavIcon ref={iconRef} name={item.icon} size={20} />
      </span>
      <FadeText show={showText} className="whitespace-nowrap">
        {item.label}
      </FadeText>
      <NavLinkPendingDot />
    </Link>
  )
}

interface SidebarProps {
  navItems: NavItem[]
  email: string
  roleLabel: string
  children: React.ReactNode
  // Six_Edits_and_Chat_Feature_Decision.md §1 — the chat widget surfaces the
  // same regression coefficients AnalysisView's hideAdEfficiency gate hides
  // from Marketing Team, so it needs the same gate rather than a role check
  // buried inside ChatBot itself. Defaults true (Owner and Marketing
  // Manager); Marketing Team's layout passes false.
  showChat?: boolean
}

export default function Sidebar({ navItems, email, roleLabel, children, showChat = true }: SidebarProps) {
  const pathname = usePathname()
  const reduceMotion = useReducedMotion()
  // Defaults to expanded; the toggle row collapses it to the icon rail.
  const [expanded, setExpanded] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  const collapsed = !expanded

  useEffect(() => {
    const storedExpanded = localStorage.getItem(SIDEBAR_EXPANDED_KEY)
    setExpanded(storedExpanded === null ? true : storedExpanded === 'true')
  }, [])

  function toggleExpanded() {
    setExpanded((prev) => {
      const next = !prev
      localStorage.setItem(SIDEBAR_EXPANDED_KEY, String(next))
      return next
    })
  }

  // The rail only collapses on desktop — mobile always shows full labels in its drawer.
  useEffect(() => {
    const mql = window.matchMedia('(min-width: 768px)')
    const update = () => setIsDesktop(mql.matches)
    update()
    mql.addEventListener('change', update)
    return () => mql.removeEventListener('change', update)
  }, [])

  const showText = !collapsed || !isDesktop

  // Close mobile drawer on Escape
  useEffect(() => {
    function handle(e: KeyboardEvent) {
      if (e.key !== 'Escape') return
      setMobileOpen(false)
    }
    document.addEventListener('keydown', handle)
    return () => document.removeEventListener('keydown', handle)
  }, [])

  // Close mobile drawer when navigating
  useEffect(() => {
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

  function isActive(href: string): boolean {
    if (pathname === href) return true
    const segments = href.split('/').filter(Boolean)
    if (segments.length >= 3) return pathname.startsWith(href + '/')
    return false
  }

  // Group nav items under their section header.
  interface NavGroup { section?: string; items: NavItem[] }
  const groups: NavGroup[] = []
  for (const item of navItems) {
    if (item.section) {
      groups.push({ section: item.section, items: [item] })
    } else {
      groups[groups.length - 1]?.items.push(item)
    }
  }

  function renderNavItem(item: NavItem) {
    return (
      <NavLink
        key={item.href}
        item={item}
        active={isActive(item.href)}
        showText={showText}
      />
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
        animate={{ width: isDesktop ? (collapsed ? RAIL_WIDTH : EXPANDED_WIDTH) : 288 }}
        transition={reduceMotion ? REDUCED_TRANSITION : SIDEBAR_TRANSITION}
        // Nav rail follows the app theme, using the dedicated sidebar tokens
        // (bg-sidebar / text-sidebar-foreground / border-sidebar-border) so it
        // stays light in light mode and dark in dark mode, like the rest of the app.
        className={`fixed inset-y-0 left-0 z-50 w-72 md:w-20 bg-sidebar text-sidebar-foreground flex flex-col border-r border-sidebar-border print:hidden transition-transform duration-300
          md:translate-x-0
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        {/* h-14 matches TopBar's fixed height exactly, so the sidebar's
            right border and the TopBar's bottom border cross at the same corner. */}
        <div className={`h-14 flex items-center flex-shrink-0 px-4 gap-2.5 overflow-hidden ${!showText ? 'justify-center' : ''}`}>
          <Image src="/pcm-logo.png" alt="PC Merchandise" width={32} height={32} className="w-8 h-8 object-contain flex-shrink-0" />
          <FadeText show={showText} as="div" className="min-w-0 flex-1">
            <span className="font-bold text-sidebar-foreground text-sm leading-none whitespace-nowrap">PC Merchandise</span>
            <span className="text-muted-foreground text-xs ml-1">DSS</span>
          </FadeText>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-3 space-y-0.5">
          {groups.map((group, index) => {
            if (!group.section) {
              return <div key="ungrouped">{group.items.map(renderNavItem)}</div>
            }
            return (
              <div key={group.section}>
                {index > 0 && <FadeDivider show={!showText} />}
                <FadeText
                  as="p"
                  show={showText}
                  className="px-3 pt-4 pb-1 text-xs font-semibold text-muted-foreground uppercase tracking-widest whitespace-nowrap"
                >
                  {group.section}
                </FadeText>
                <div className="space-y-0.5">{group.items.map(renderNavItem)}</div>
              </div>
            )
          })}
        </nav>
      </motion.div>

      {/* Main content */}
      <motion.div
        animate={{ marginLeft: isDesktop ? (collapsed ? RAIL_WIDTH : EXPANDED_WIDTH) : 0 }}
        transition={reduceMotion ? REDUCED_TRANSITION : SIDEBAR_TRANSITION}
        // overflow-x-clip, not overflow-x-hidden: per the CSS overflow spec,
        // setting only one axis to 'hidden' forces the other to compute as
        // 'auto' too, silently turning this div into a scroll container of
        // its own. Since it's never actually the one that scrolls (the page
        // just grows and the viewport/html scrolls instead — min-h-screen
        // has no height cap), that phantom auto-overflow container becomes
        // TopBar's sticky positioning context instead of the real scrollport,
        // breaking `sticky top-0` (TopBar.tsx) with no visible symptom until
        // you actually scroll. 'clip' clips the same as 'hidden' without
        // that cross-axis side effect.
        className="flex-1 min-h-screen print:ml-0 flex flex-col overflow-x-clip"
      >
        <TopBar
          navItems={navItems}
          email={email}
          roleLabel={roleLabel}
          expanded={expanded}
          onToggleExpanded={toggleExpanded}
          onMobileMenuOpen={() => setMobileOpen(true)}
        />
        <div className="flex-1 pb-20 md:pb-0">
          {children}
        </div>
      </motion.div>

      {showChat && <ChatBot />}
    </div>
  )
}
