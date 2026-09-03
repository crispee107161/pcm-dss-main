const TIMEZONE = 'Asia/Manila'

// Greeting is shortened to a first name/token, not the full stored value —
// User Management and the audit log show the full name in full
// (docs/raven/Account_Display_Names.md §3). Falls back to the email
// local-part for any account created before the `name` field existed.
export function greetingName(name: string | null | undefined, email: string | null | undefined): string {
  const source = name?.trim() || email?.split('@')[0]
  return source?.split(' ')[0] || 'there'
}

export function getGreeting(date: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: TIMEZONE }).format(date)
  )

  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
