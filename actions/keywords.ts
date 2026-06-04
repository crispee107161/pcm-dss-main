'use server'

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'

export interface KeywordSuggestion {
  categoryId: number
  categoryName: string
  keywords: string[]
}

export async function addKeyword(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    throw new Error('Unauthorized')
  }

  const word = (formData.get('word') as string)?.trim()
  const categoryId = parseInt(formData.get('categoryId') as string, 10)

  if (!word || isNaN(categoryId)) {
    throw new Error('Word and category are required')
  }
  if (word.length > 100) {
    throw new Error('Keyword must be 100 characters or fewer')
  }

  const category = await prisma.category.findUnique({ where: { id: categoryId } })
  if (!category) {
    throw new Error('Invalid category')
  }

  await prisma.keyword.create({
    data: {
      word,
      category_id: categoryId,
    },
  })

  revalidatePath('/dashboard/marketing/keywords')
}

export async function suggestKeywords(): Promise<KeywordSuggestion[]> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') throw new Error('Unauthorized')

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY not configured')

  const [categories, categorizedPosts, categorizedAds] = await Promise.all([
    prisma.category.findMany({ include: { keywords: true }, orderBy: { name: 'asc' } }),
    prisma.facebookPost.findMany({
      where: { category_id: { not: null } },
      select: { title: true, category_id: true },
    }),
    prisma.ad.findMany({
      where: { category_id: { not: null } },
      select: { ad_name: true, category_id: true },
    }),
  ])

  if (categorizedPosts.length + categorizedAds.length < 3) {
    throw new Error('Not enough categorized content yet. Categorize at least a few posts or ads first.')
  }

  // Group up to 20 titles per category
  const byCategory: Record<number, string[]> = {}
  for (const p of categorizedPosts) {
    if (!p.category_id || !p.title) continue
    byCategory[p.category_id] ??= []
    if (byCategory[p.category_id].length < 20) byCategory[p.category_id].push(p.title)
  }
  for (const a of categorizedAds) {
    if (!a.category_id) continue
    byCategory[a.category_id] ??= []
    if (byCategory[a.category_id].length < 20) byCategory[a.category_id].push(a.ad_name)
  }

  const activeCategories = categories.filter(c => byCategory[c.id]?.length > 0)
  if (activeCategories.length === 0) throw new Error('No categorized content found.')

  const categoryBlocks = activeCategories.map(cat => {
    const existingKws = cat.keywords.map(k => k.word).join(', ') || 'none'
    const titles = (byCategory[cat.id] ?? []).map(t => `  - ${t}`).join('\n')
    return `Category: "${cat.name}" (id: ${cat.id})\nExisting keywords (do NOT suggest these): ${existingKws}\nSample titles:\n${titles}`
  }).join('\n\n')

  const prompt = `You are a keyword extraction assistant for PC Merchandise, a Filipino computer accessories business that uses Facebook ads.

Analyze these content titles grouped by category and suggest keywords for each.

${categoryBlocks}

For each category, suggest 5-8 short keywords (1-3 words) that would reliably identify NEW, unseen content as belonging to that category.

Rules:
- 1-3 words max per keyword
- Specific enough to distinguish this category from others
- Grounded in the sample titles
- Skip generic words (sale, new, our, get, the, for, best, etc.)
- Do NOT suggest already-existing keywords listed above

Return ONLY valid JSON, no explanation:
{"suggestions":[{"categoryId":1,"keywords":["word1","word2"]},{"categoryId":2,"keywords":["word1","word2"]}]}`

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 600,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    }),
  })

  const data = await res.json()
  if (data.error) throw new Error(data.error.message ?? 'Groq API error')

  const text = data.choices?.[0]?.message?.content
  if (!text) throw new Error('No response from AI')

  let parsed: { suggestions: Array<{ categoryId: number; keywords: string[] }> }
  try { parsed = JSON.parse(text) } catch { throw new Error('Invalid response from AI') }

  return parsed.suggestions
    .map(s => {
      const cat = categories.find(c => c.id === s.categoryId)
      if (!cat) return null
      const existing = new Set(cat.keywords.map(k => k.word.toLowerCase()))
      const filtered = (s.keywords ?? [])
        .map(k => k.trim().toLowerCase())
        .filter(k => k.length > 1 && !existing.has(k))
      return filtered.length > 0 ? { categoryId: cat.id, categoryName: cat.name, keywords: filtered } : null
    })
    .filter((s): s is KeywordSuggestion => s !== null)
}

export async function addKeywordsBulk(items: { word: string; categoryId: number }[]): Promise<void> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') throw new Error('Unauthorized')
  if (items.length === 0) return
  if (items.length > 100) throw new Error('Too many keywords in a single bulk insert (max 100).')

  const sanitized = items
    .map(i => ({ word: i.word.trim(), category_id: i.categoryId }))
    .filter(i => i.word.length > 1 && i.word.length <= 100)

  if (sanitized.length === 0) return

  await prisma.keyword.createMany({
    data: sanitized,
    skipDuplicates: true,
  })

  revalidatePath('/dashboard/marketing/keywords')
}

export async function deleteKeyword(formData: FormData): Promise<void> {
  const session = await auth()
  if (!session?.user || session.user.role !== 'MARKETING_MANAGER') {
    throw new Error('Unauthorized')
  }

  const id = parseInt(formData.get('id') as string, 10)

  if (isNaN(id)) {
    throw new Error('Invalid keyword ID')
  }

  await prisma.keyword.delete({
    where: { id },
  })

  revalidatePath('/dashboard/marketing/keywords')
}
