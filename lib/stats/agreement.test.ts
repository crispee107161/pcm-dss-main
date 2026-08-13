import { describe, it, expect } from 'vitest'
import { computeAgreement, kappaMagnitude, type AgreementRow } from './agreement'

function row(predicted: AgreementRow['predicted'], actual: AgreementRow['actual']): AgreementRow {
  return { predicted, actual }
}

describe('computeAgreement', () => {
  it('reports kappa=1 and 100% agreement on perfect agreement', () => {
    const rows: AgreementRow[] = [
      row('PRODUCT_SHOWCASE', 'PRODUCT_SHOWCASE'),
      row('PRODUCT_SHOWCASE', 'PRODUCT_SHOWCASE'),
      row('ENTERTAINMENT', 'ENTERTAINMENT'),
    ]

    const result = computeAgreement(rows)

    expect(result.n).toBe(3)
    expect(result.percentAgreement).toBe(1)
    expect(result.kappa).toBe(1)
  })

  it('reports kappa near 0 when predictions and actuals are independent', () => {
    // Balanced 2x2 confusion: half agree, half don't, matching what chance
    // would predict given equal marginals — kappa should land near 0.
    const rows: AgreementRow[] = [
      row('PRODUCT_SHOWCASE', 'PRODUCT_SHOWCASE'),
      row('PRODUCT_SHOWCASE', 'ENTERTAINMENT'),
      row('ENTERTAINMENT', 'PRODUCT_SHOWCASE'),
      row('ENTERTAINMENT', 'ENTERTAINMENT'),
    ]

    const result = computeAgreement(rows)

    expect(result.percentAgreement).toBe(0.5)
    expect(result.kappa).toBeCloseTo(0, 5)
  })

  it('treats UNCLASSIFIED as a genuine fifth label, not a dropped row', () => {
    const rows: AgreementRow[] = [
      row('UNCLASSIFIED', 'PRODUCT_SHOWCASE'),
      row('PRODUCT_SHOWCASE', 'PRODUCT_SHOWCASE'),
    ]

    const result = computeAgreement(rows)

    expect(result.n).toBe(2)
    const cell = result.confusionMatrix.find(c => c.predicted === 'UNCLASSIFIED' && c.actual === 'PRODUCT_SHOWCASE')
    expect(cell?.count).toBe(1)
  })

  it('returns a zeroed result for an empty sample rather than dividing by zero', () => {
    const result = computeAgreement([])

    expect(result.n).toBe(0)
    expect(result.kappa).toBe(0)
    expect(result.percentAgreement).toBe(0)
  })

  it('produces a 6x6 confusion matrix covering every label pair, including zero-count cells', () => {
    const rows: AgreementRow[] = [row('PRODUCT_SHOWCASE', 'PRODUCT_SHOWCASE')]

    const result = computeAgreement(rows)

    expect(result.confusionMatrix).toHaveLength(36)
    expect(result.confusionMatrix.filter(c => c.count === 0)).toHaveLength(35)
  })
})

describe('kappaMagnitude', () => {
  it('bands values per Landis & Koch (1977)', () => {
    expect(kappaMagnitude(-0.1)).toBe('poor')
    expect(kappaMagnitude(0.1)).toBe('slight')
    expect(kappaMagnitude(0.3)).toBe('fair')
    expect(kappaMagnitude(0.5)).toBe('moderate')
    expect(kappaMagnitude(0.7)).toBe('substantial')
    expect(kappaMagnitude(0.9)).toBe('almost perfect')
  })
})
