type Color = 'red' | 'green' | 'amber' | 'slate' | 'blue' | 'purple' | 'zinc'
type Size  = 'sm' | 'md'

const colorClasses: Record<Color, string> = {
  red:    'bg-red-100 text-red-700 border border-red-200',
  green:  'bg-green-100 text-green-700 border border-green-200',
  amber:  'bg-amber-100 text-amber-700 border border-amber-200',
  slate:  'bg-slate-100 text-slate-600 border border-slate-200',
  blue:   'bg-blue-100 text-blue-700 border border-blue-200',
  purple: 'bg-purple-100 text-purple-700 border border-purple-200',
  zinc:   'bg-zinc-800 text-zinc-300 border border-zinc-700',
}

const sizeClasses: Record<Size, string> = {
  sm: 'px-1.5 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
}

interface BadgeProps {
  children: React.ReactNode
  color?: Color
  size?: Size
  className?: string
}

export function Badge({ children, color = 'slate', size = 'sm', className = '' }: BadgeProps) {
  return (
    <span className={`inline-flex items-center font-medium rounded-full ${colorClasses[color]} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  )
}

/** Dot indicator optionally prepended to a Badge */
export function StatusDot({ color = 'green' }: { color?: 'green' | 'red' | 'amber' | 'slate' }) {
  const dotColor = {
    green: 'bg-green-500',
    red:   'bg-red-500',
    amber: 'bg-amber-500',
    slate: 'bg-slate-400',
  }[color]

  return <span className={`w-1.5 h-1.5 rounded-full ${dotColor} inline-block mr-1`} />
}
