import type { InputHTMLAttributes } from 'react'

type Variant = 'light' | 'dark'

const inputClasses: Record<Variant, string> = {
  light: 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:ring-red-500 focus:border-red-500',
  dark:  'bg-zinc-800 border-zinc-700 text-white placeholder-zinc-500 focus:ring-red-600 focus:border-red-600',
}

const labelClasses: Record<Variant, string> = {
  light: 'text-slate-700',
  dark:  'text-zinc-300',
}

const errorClasses: Record<Variant, string> = {
  light: 'text-red-600',
  dark:  'text-red-400',
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  variant?: Variant
  label?: string
  error?: string
  hint?: string
}

export function Input({
  variant = 'light',
  label,
  error,
  hint,
  id,
  className = '',
  ...props
}: InputProps) {
  const inputId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  return (
    <div className="flex flex-col gap-1">
      {label && (
        <label htmlFor={inputId} className={`text-sm font-medium ${labelClasses[variant]}`}>
          {label}
        </label>
      )}
      <input
        id={inputId}
        {...props}
        className={`w-full px-3 py-2 rounded-lg border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-0 disabled:opacity-50 disabled:cursor-not-allowed ${inputClasses[variant]} ${error ? 'border-red-500' : ''} ${className}`}
      />
      {error && <p className={`text-xs ${errorClasses[variant]}`}>{error}</p>}
      {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  )
}
