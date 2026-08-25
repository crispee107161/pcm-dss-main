# Handoff: Login Page Fixes

## Overview
Three targeted fixes to the existing `/login` page, reviewed and prototyped in HTML. This is a small revision to code that already exists — implement directly in `app/login/page.tsx`, don't rebuild the page.

## Fidelity
High-fidelity. Exact colors/values below; drop into the existing Tailwind + CSS-variable setup already used in the file.

## Changes

### 1. Error banner — was tuned for dark theme, looks muddy on the light (default) theme

Current (`app/login/page.tsx` ~line 50-60):
```tsx
<div
  role="alert"
  className="mt-6 flex items-start gap-2.5 rounded-md px-4 py-3"
  style={{ background: 'color-mix(in srgb, var(--color-red-900) 60%, transparent)', border: '1px solid color-mix(in srgb, var(--color-red-700) 70%, transparent)' }}
>
  <svg aria-hidden="true" className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" ...>...</svg>
  <p className="text-red-400 text-sm">{state.error}</p>
</div>
```

Replace with a light-appropriate treatment, plus a "Contact your administrator" link for lockouts:
```tsx
<div
  role="alert"
  className="mt-6 flex flex-col gap-1.5 rounded-md px-4 py-3"
  style={{ background: 'color-mix(in srgb, var(--color-red-600) 8%, var(--card))', border: '1px solid color-mix(in srgb, var(--color-red-600) 25%, transparent)' }}
>
  <div className="flex items-start gap-2.5">
    <svg aria-hidden="true" className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: 'var(--destructive)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
    <p className="text-sm" style={{ color: 'var(--destructive)' }}>{state.error}</p>
  </div>
  <p className="ml-[26px] text-xs text-muted-foreground">
    Locked out? <a href="mailto:admin@pcmerchandise.com.ph" className="font-medium text-primary">Contact your administrator</a>.
  </p>
</div>
```
Uses existing tokens: `--color-red-600`, `--destructive`, `--card`, `--primary`, `--muted-foreground` — no new colors introduced. Update the mailto address to the real admin contact.

### 2. Contact-admin link in the footer note

Current (bottom of the page):
```tsx
<p className="text-muted-foreground text-xs text-center">
  Access restricted to authorized personnel only.
</p>
```

Replace with:
```tsx
<p className="text-muted-foreground text-xs text-center">
  Access restricted to authorized personnel only. Need an account?{' '}
  <a href="mailto:admin@pcmerchandise.com.ph" className="font-medium text-primary">
    Contact your administrator
  </a>.
</p>
```

### 3. Card elevation — card blends into the page background

Current (the card wrapper):
```tsx
<div className="rounded-xl border bg-card p-6 shadow-sm">
```

Replace `shadow-sm` with a stronger, layered shadow:
```tsx
<div
  className="rounded-xl border bg-card p-6"
  style={{ boxShadow: '0 0 0 1px rgba(11,11,11,0.05), 0px 4px 8px -2px rgba(11,11,11,0.07), 0px 12px 20px -6px rgba(11,11,11,0.10)' }}
>
```
(Equivalent to combining the existing `--shadow-md`/`--shadow-lg` tokens with a hairline ring — matches the `.shadow-border-*` recipe pattern already in `globals.css`, just tuned slightly stronger for this card. Feel free to swap in `shadow-border-md`/`lg` utility classes instead if you'd rather stay off inline styles.)

## Not changed
- No changes to layout, copy, spacing, or branding — kept as-is per review.
- No changes to `SessionNotice.tsx` (toast) — reviewed and left alone.

## Reference
Prototyped in this project as `Login Page (Current).dc.html` (states: default / error / toast via the tweaks panel) if you want to see the rendered result before implementing.
