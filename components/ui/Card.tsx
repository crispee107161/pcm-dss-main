import type { HTMLAttributes } from 'react'

type Variant = 'default' | 'dark'
type Padding = 'sm' | 'md' | 'lg' | 'none'

const variantClasses: Record<Variant, string> = {
  default: 'bg-white border border-slate-200 shadow-sm',
  dark:    'bg-zinc-950 border border-zinc-800',
}

const paddingClasses: Record<Padding, string> = {
  none: '',
  sm:   'p-4',
  md:   'p-6',
  lg:   'p-8',
}

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: Variant
  padding?: Padding
  /** Optional heading rendered inside the card */
  title?: string
}

export function Card({
  variant = 'default',
  padding = 'md',
  title,
  className = '',
  children,
  ...props
}: CardProps) {
  return (
    <div
      {...props}
      className={`rounded-2xl ${variantClasses[variant]} ${paddingClasses[padding]} ${className}`}
    >
      {title && (
        <h2 className={`text-lg font-semibold mb-4 ${variant === 'dark' ? 'text-white' : 'text-slate-800'}`}>
          {title}
        </h2>
      )}
      {children}
    </div>
  )
}

/** Thin horizontal rule for use inside a Card */
export function CardDivider({ className = '' }: { className?: string }) {
  return <hr className={`border-slate-100 ${className}`} />
}
