// FR-12 caption trap (docs/PCM_DSS_Developer_Handoff §5.1): Title is populated
// on ~99% of posts, Description on ~52%, and neither reliably holds the real
// caption alone — whichever column has more text wins. Reading Title only
// loses text on roughly half the posts.
export function resolveCaption(
  title: string | null | undefined,
  description: string | null | undefined
): string | null {
  const t = title ?? ''
  const d = description ?? ''
  if (t.length === 0 && d.length === 0) return null
  return t.length >= d.length ? t : d
}
