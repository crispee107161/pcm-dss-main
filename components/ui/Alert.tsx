type Variant = 'error' | 'success' | 'warning' | 'info'

const variantClasses: Record<Variant, string> = {
  error:   'bg-red-50 border-red-200 text-red-700',
  success: 'bg-green-50 border-green-200 text-green-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-700',
  info:    'bg-slate-50 border-slate-200 text-slate-700',
}

const darkVariantClasses: Record<Variant, string> = {
  error:   'bg-red-950/50 border-red-900 text-red-400',
  success: 'bg-green-950/50 border-green-900 text-green-400',
  warning: 'bg-amber-950/50 border-amber-900 text-amber-400',
  info:    'bg-zinc-800 border-zinc-700 text-zinc-300',
}

const icons: Record<Variant, React.ReactNode> = {
  error: (
    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  success: (
    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  warning: (
    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  info: (
    <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
}

interface AlertProps {
  variant?: Variant
  message: string
  /** Use dark background (for use inside dark cards or sidebar) */
  dark?: boolean
  className?: string
}

export function Alert({ variant = 'info', message, dark = false, className = '' }: AlertProps) {
  const classes = dark ? darkVariantClasses[variant] : variantClasses[variant]

  return (
    <div className={`flex items-start gap-2.5 px-3 py-2.5 rounded-lg border text-sm ${classes} ${className}`}>
      {icons[variant]}
      <p>{message}</p>
    </div>
  )
}
