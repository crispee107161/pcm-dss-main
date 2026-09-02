import { describe, it, expect } from 'vitest'
import { neutralizeFormula } from './csv'

describe('neutralizeFormula', () => {
  it.each([
    ['=SUM(A1:A9)', "'=SUM(A1:A9)"],
    ['+1234', "'+1234"],
    ['-cmd|calc', "'-cmd|calc"],
    ['@example.com', "'@example.com"],
    ['\tTabbed', "'\tTabbed"],
    ['\rCarriage', "'\rCarriage"],
  ])('prefixes a leading %j with a single quote', (input, expected) => {
    expect(neutralizeFormula(input)).toBe(expected)
  })

  it('leaves a plain string untouched', () => {
    expect(neutralizeFormula('Regular Ad Set Name')).toBe('Regular Ad Set Name')
  })

  it('leaves a negative number untouched (not a string)', () => {
    expect(neutralizeFormula(-42)).toBe(-42)
  })

  it('leaves a string containing but not starting with a dangerous character untouched', () => {
    expect(neutralizeFormula('Sale - 20% off')).toBe('Sale - 20% off')
  })

  it('passes through null and undefined', () => {
    expect(neutralizeFormula(null)).toBe(null)
    expect(neutralizeFormula(undefined)).toBe(undefined)
  })
})
