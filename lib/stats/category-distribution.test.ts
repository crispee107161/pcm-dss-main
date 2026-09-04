import { describe, it, expect } from 'vitest'
import { computeCategoryDistribution, type PostForCategoryDistribution } from './category-distribution'

function post(overrides: Partial<PostForCategoryDistribution>): PostForCategoryDistribution {
  return { category_final: 'PRODUCT_SHOWCASE', views: 100, organic_engagement_rate: 0.05, ...overrides }
}

describe('computeCategoryDistribution', () => {
  it('groups by category_final and reports n per category', () => {
    const posts: PostForCategoryDistribution[] = [
      post({ category_final: 'PRODUCT_SHOWCASE' }),
      post({ category_final: 'PRODUCT_SHOWCASE' }),
      post({ category_final: 'ENTERTAINMENT' }),
    ]

    const rows = computeCategoryDistribution(posts)

    const showcase = rows.find(r => r.category === 'PRODUCT_SHOWCASE')!
    const entertainment = rows.find(r => r.category === 'ENTERTAINMENT')!
    expect(showcase.n).toBe(2)
    expect(entertainment.n).toBe(1)
  })

  it('buckets a null category_final as UNCLASSIFIED rather than dropping the post', () => {
    const posts: PostForCategoryDistribution[] = [post({ category_final: null })]

    const rows = computeCategoryDistribution(posts)

    expect(rows).toHaveLength(1)
    expect(rows[0].category).toBe('UNCLASSIFIED')
    expect(rows[0].n).toBe(1)
  })

  it('excludes null Views from the views median/quartiles without dropping the post from n', () => {
    const posts: PostForCategoryDistribution[] = [
      post({ views: 100 }),
      post({ views: null }),
      post({ views: 300 }),
    ]

    const rows = computeCategoryDistribution(posts)

    expect(rows[0].n).toBe(3)
    expect(rows[0].views.median).toBe(200)
  })

  it('reports views as null (not 0) when every post in the category has blank Views', () => {
    const posts: PostForCategoryDistribution[] = [post({ views: null }), post({ views: null })]

    const rows = computeCategoryDistribution(posts)

    expect(rows[0].views.median).toBeNull()
  })

  it('groups UNCLEAR as its own row, distinct from UNCLASSIFIED', () => {
    const posts: PostForCategoryDistribution[] = [
      post({ category_final: 'UNCLEAR' }),
      post({ category_final: 'UNCLEAR' }),
      post({ category_final: null }),
    ]

    const rows = computeCategoryDistribution(posts)

    const unclear = rows.find(r => r.category === 'UNCLEAR')!
    const unclassified = rows.find(r => r.category === 'UNCLASSIFIED')!
    expect(unclear.n).toBe(2)
    expect(unclassified.n).toBe(1)
  })

  it('sorts categories by n descending', () => {
    const posts: PostForCategoryDistribution[] = [
      post({ category_final: 'ENTERTAINMENT' }),
      post({ category_final: 'PRODUCT_SHOWCASE' }),
      post({ category_final: 'PRODUCT_SHOWCASE' }),
      post({ category_final: 'PRODUCT_SHOWCASE' }),
    ]

    const rows = computeCategoryDistribution(posts)

    expect(rows[0].category).toBe('PRODUCT_SHOWCASE')
  })
})
