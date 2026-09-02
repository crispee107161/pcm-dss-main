// Resolves which Groq chat model to use, adapting to Groq deprecating/renaming
// models (see actions/{chat,classify-posts,keywords}.ts, all of
// which call resolveGroqModel instead of hardcoding a model id).
//
// This is a preference-ordered ALLOWLIST, not "whatever Groq has today": we ask
// Groq's /models endpoint what is currently live, then take the first entry from
// PREFERRED_MODELS that appears in that list. If the endpoint is unreachable or
// none of our preferred models are live, we fall back to the first entry in
// PREFERRED_MODELS rather than substituting an unvetted model — a bad Groq
// response should surface as the usual "model not found" error, not silently
// swap the app onto a slower/pricier/lower-quality model nobody chose.
//
// A successful resolution is cached for an hour; a fallback (network error, bad
// status, or neither preferred model live) is cached for only a minute, so a
// transient Groq blip can't pin the app to the fallback model for the full hour.
//
// Result is cached in-memory per process; state does not survive a restart or
// span multiple instances (same limitation as lib/rate-limit.ts).

const PREFERRED_MODELS = ['openai/gpt-oss-20b', 'openai/gpt-oss-120b'] as const

const FALLBACK_MODEL: string = PREFERRED_MODELS[0]
const SUCCESS_TTL_MS = 60 * 60 * 1000 // 1 hour
const FALLBACK_TTL_MS = 60 * 1000 // 1 minute
const FETCH_TIMEOUT_MS = 3000

let cached: { model: string; expiresAt: number } | null = null

async function fetchLiveModelIds(apiKey: string): Promise<Set<string>> {
  const res = await fetch('https://api.groq.com/openai/v1/models', {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  })
  if (!res.ok) throw new Error(`Groq models list request failed (${res.status})`)

  const json: unknown = await res.json()
  const entries = Array.isArray((json as { data?: unknown })?.data) ? (json as { data: unknown[] }).data : []
  const ids = entries
    .map(entry => (entry as { id?: unknown })?.id)
    .filter((id): id is string => typeof id === 'string')
  return new Set(ids)
}

export async function resolveGroqModel(apiKey: string): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.model

  try {
    const liveIds = await fetchLiveModelIds(apiKey)
    const resolved = PREFERRED_MODELS.find(id => liveIds.has(id))
    if (resolved) {
      cached = { model: resolved, expiresAt: Date.now() + SUCCESS_TTL_MS }
      return resolved
    }
    console.warn('resolveGroqModel: none of PREFERRED_MODELS are live on Groq; falling back to', FALLBACK_MODEL)
  } catch (error) {
    console.warn('resolveGroqModel: /models lookup failed, falling back to', FALLBACK_MODEL, error)
  }

  cached = { model: FALLBACK_MODEL, expiresAt: Date.now() + FALLBACK_TTL_MS }
  return FALLBACK_MODEL
}
