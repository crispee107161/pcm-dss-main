const TIMEZONE = 'Asia/Manila'

export function getGreeting(date: Date = new Date()): string {
  const hour = Number(
    new Intl.DateTimeFormat('en-US', { hour: 'numeric', hour12: false, timeZone: TIMEZONE }).format(date)
  )

  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}
