import type { CategoryLabel } from '@/app/generated/prisma/client'

// CODEBOOK_content_categories.md §3/§5 — the lowercase snake_case label set
// coders type into the coding sheet, matching compute_kappa.py's VALID list
// exactly. `unclear` maps to the CategoryLabel.UNCLEAR enum value (a
// legitimate 5th label, distinct from the system's own UNCLASSIFIED).
export const GROUND_TRUTH_LABEL_MAP: Record<string, CategoryLabel> = {
  product_showcase: 'PRODUCT_SHOWCASE',
  promotional_offer: 'PROMOTIONAL_OFFER',
  testimonial: 'TESTIMONIAL',
  entertainment: 'ENTERTAINMENT',
  unclear: 'UNCLEAR',
}

export function parseGroundTruthLabel(raw: string): CategoryLabel | null {
  return GROUND_TRUTH_LABEL_MAP[raw.trim().toLowerCase()] ?? null
}
