import type { CategoryLabel } from '@/app/generated/prisma/client'

// The Category/Keyword tables remain the keyword lexicon store (prisma/seed.ts
// depends on them), but post categorisation itself now lives on
// FacebookPost.category_final (a CategoryLabel enum, FR-15) rather than a
// category_id FK. These maps bridge the two until ALG-04's lexicon rewrite
// (mvp.md §7 step 9) replaces category_id-keyed matching outright.
export const CATEGORY_NAME_TO_LABEL: Record<string, CategoryLabel> = {
  'Product Showcase': 'PRODUCT_SHOWCASE',
  'Promotional Offer': 'PROMOTIONAL_OFFER',
  Testimonial: 'TESTIMONIAL',
  Entertainment: 'ENTERTAINMENT',
}

export const CATEGORY_LABEL_DISPLAY: Record<CategoryLabel, string> = {
  PRODUCT_SHOWCASE: 'Product Showcase',
  PROMOTIONAL_OFFER: 'Promotional Offer',
  TESTIMONIAL: 'Testimonial',
  ENTERTAINMENT: 'Entertainment',
  UNCLASSIFIED: 'Unclassified',
  // Ground-truth-only: a human coder's genuine "cannot decide" verdict
  // (CODEBOOK_content_categories.md §5). Never produced by ALG-04/ALG-05.
  UNCLEAR: 'Unclear',
}
