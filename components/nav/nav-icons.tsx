'use client'

import { forwardRef, useImperativeHandle, useRef } from 'react'
import {
  HouseIcon, UploadIcon, FolderIcon, KeyIcon, ChartScatterIcon, LayersIcon,
  TrendingUpIcon, GlobeIcon, WalletIcon, LayoutGridIcon, UsersIcon,
  GitCompareIcon,
} from '@animateicons/react/lucide'
import { TagIcon } from '@/components/ui/tag-icon'
import { FileTextIcon } from '@/components/ui/file-text-icon'
import { FileClockIcon } from '@/components/ui/file-clock-icon'
import { ListOrderedIcon } from '@/components/ui/list-ordered-icon'

// Shared imperative handle shape — every animateicons/registry icon exposes
// this same { startAnimation, stopAnimation } pair, so one type covers all
// of them structurally regardless of which package a given icon came from.
export interface NavIconHandle {
  startAnimation: () => void
  stopAnimation: () => void
}

interface NavIconComponentProps {
  size?: number
  className?: string
}

// Registry: nav item icon key -> animated icon component. Keys are stable
// strings (not JSX) so they can cross the Server -> Client boundary from the
// role layouts (app/dashboard/{owner,marketing}/layout.tsx) into Sidebar.
const NAV_ICONS = {
  home: HouseIcon,
  upload: UploadIcon,
  folder: FolderIcon,
  tag: TagIcon,
  key: KeyIcon,
  chart: ChartScatterIcon,
  compare: GitCompareIcon,
  ranking: ListOrderedIcon,
  layers: LayersIcon,
  trendUp: TrendingUpIcon,
  metrics: GlobeIcon,
  report: FileTextIcon,
  auditLog: FileClockIcon,
  wallet: WalletIcon,
  category: LayoutGridIcon,
  users: UsersIcon,
} as const

export type NavIconKey = keyof typeof NAV_ICONS

interface AnimatedNavIconProps extends NavIconComponentProps {
  name: NavIconKey
}

// Attaching innerRef flips each icon's internal `isControlled` flag to true,
// which disables its own built-in hover animation and makes it defer
// entirely to these imperative methods — that's what lets NavLink drive the
// same animation from both mouse hover and keyboard focus without the icon
// double-firing on its own hover handlers.
export const AnimatedNavIcon = forwardRef<NavIconHandle, AnimatedNavIconProps>(
  ({ name, size = 20, className }, ref) => {
    const innerRef = useRef<NavIconHandle>(null)

    useImperativeHandle(ref, () => ({
      startAnimation: () => innerRef.current?.startAnimation(),
      stopAnimation: () => innerRef.current?.stopAnimation(),
    }), [])

    const Icon = NAV_ICONS[name]
    return <Icon ref={innerRef} size={size} className={className} />
  },
)

AnimatedNavIcon.displayName = 'AnimatedNavIcon'
