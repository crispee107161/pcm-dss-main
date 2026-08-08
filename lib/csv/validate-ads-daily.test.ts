import { describe, it, expect } from 'vitest'
import { validateAdsDailyRows } from './validate-ads-daily'

function baseRow(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    'Ad name': 'Test Ad',
    'Ad set name': 'Set A',
    Day: '2026-01-01',
    'Delivery status': 'active',
    'Delivery level': 'ad',
    Reach: '100',
    Impressions: '200',
    Frequency: '2',
    'Attribution setting': '7-day click or 1-day view',
    'Result type': 'Messaging conversations started',
    Results: '3',
    'Amount spent (PHP)': '150',
    'Cost per result': '50',
    Starts: '2025-12-01',
    Ends: '2026-02-01',
    'Reporting starts': '2026-01-01',
    'Reporting ends': '2026-01-01',
    ...overrides,
  }
}

describe('validateAdsDailyRows', () => {
  it('keeps rows whose Result type is the messaging objective', () => {
    const { records, summary } = validateAdsDailyRows([baseRow()])
    expect(records).toHaveLength(1)
    expect(summary.totalRows).toBe(1)
    expect(summary.keptRows).toBe(1)
    expect(summary.droppedByResultType).toEqual({})
  })

  it('drops Reach, Post engagements, and ThruPlay rows without throwing', () => {
    const { records, summary } = validateAdsDailyRows([
      baseRow({ 'Result type': 'Reach', Results: '999' }),
      baseRow({ 'Result type': 'Post engagements', Results: '50' }),
      baseRow({ 'Result type': 'ThruPlay', Results: '10' }),
      baseRow(),
    ])
    expect(records).toHaveLength(1)
    expect(summary.droppedByResultType).toEqual({
      Reach: 1,
      'Post engagements': 1,
      ThruPlay: 1,
    })
  })

  it('never lets a non-messaging row inflate results/spend, even when dropped counts are large', () => {
    const { records } = validateAdsDailyRows([
      baseRow({ 'Result type': 'Reach', Results: '15800000' }),
    ])
    expect(records).toHaveLength(0)
  })

  it('maps Day to both reporting_starts and reporting_ends', () => {
    const [record] = validateAdsDailyRows([baseRow({ Day: '2026-03-15' })]).records
    expect(record.reporting_starts.toISOString()).toBe('2026-03-15T00:00:00.000Z')
    expect(record.reporting_ends.toISOString()).toBe('2026-03-15T00:00:00.000Z')
  })

  it('mirrors Results into total_messaging_contacts for kept messaging rows', () => {
    const [record] = validateAdsDailyRows([baseRow({ Results: '7' })]).records
    expect(record.results).toBe(7)
    expect(record.total_messaging_contacts).toBe(7)
  })

  it('sets link_clicks and inquiries to null (not present in this export)', () => {
    const [record] = validateAdsDailyRows([baseRow()]).records
    expect(record.link_clicks).toBeNull()
    expect(record.inquiries).toBeNull()
  })

  it('throws on missing Impressions for a kept row', () => {
    expect(() => validateAdsDailyRows([baseRow({ Impressions: '' })])).toThrow(
      /Row 1: Missing required field: Impressions/
    )
  })

  it('throws on missing Amount spent (PHP) for a kept row', () => {
    expect(() => validateAdsDailyRows([baseRow({ 'Amount spent (PHP)': '' })])).toThrow(
      /Row 1: Missing required field: Amount spent \(PHP\)/
    )
  })

  it('does not validate required numeric fields on dropped rows', () => {
    expect(() =>
      validateAdsDailyRows([baseRow({ 'Result type': 'Reach', Impressions: '', 'Amount spent (PHP)': '' })])
    ).not.toThrow()
  })

  it('parses comma-formatted numbers', () => {
    const [record] = validateAdsDailyRows([
      baseRow({ Impressions: '1,200', 'Amount spent (PHP)': '2,500.50' }),
    ]).records
    expect(record.impressions).toBe(1200)
    expect(record.amount_spent).toBe(2500.5)
  })

  it('reports the 1-indexed row number of the row that failed, not the filtered index', () => {
    expect(() =>
      validateAdsDailyRows([
        baseRow({ 'Result type': 'Reach' }),
        baseRow({ Impressions: '' }),
      ])
    ).toThrow(/Row 2:/)
  })

  describe('blank Result type rescue', () => {
    it('rescues a blank row as a zero-result day when its ad/ad-set runs the messaging objective elsewhere in the file', () => {
      const { records, summary } = validateAdsDailyRows([
        baseRow({ Day: '2026-01-01', 'Result type': 'Messaging conversations started', Results: '3' }),
        baseRow({ Day: '2026-01-02', 'Result type': '', Results: '', 'Cost per result': '' }),
      ])
      expect(records).toHaveLength(2)
      const rescued = records.find((r) => r.reporting_starts.toISOString().startsWith('2026-01-02'))
      expect(rescued).toMatchObject({ results: 0, total_messaging_contacts: 0, cost_per_result: null })
      expect(summary.rescuedBlankRows).toBe(1)
      expect(summary.droppedByResultType).toEqual({})
    })

    it('still drops a blank row whose ad/ad-set never runs the messaging objective in this file', () => {
      const { records, summary } = validateAdsDailyRows([
        baseRow({ 'Ad name': 'Reach Only Ad', 'Ad set name': 'Reach Set', 'Result type': '' }),
      ])
      expect(records).toHaveLength(0)
      expect(summary.droppedByResultType).toEqual({ '(blank)': 1 })
    })

    it('still requires Impressions/Amount spent on a rescued blank row', () => {
      expect(() =>
        validateAdsDailyRows([
          baseRow({ Day: '2026-01-01', 'Result type': 'Messaging conversations started' }),
          baseRow({ Day: '2026-01-02', 'Result type': '', Impressions: '' }),
        ])
      ).toThrow(/Row 2: Missing required field: Impressions/)
    })
  })

  describe('duplicate (ad, ad set, day) merging', () => {
    it('merges two messaging rows sharing the same ad/ad-set/day by summing spend, impressions, and results', () => {
      const { records, summary } = validateAdsDailyRows([
        baseRow({ Reach: '1214', Impressions: '1476', Results: '9', 'Amount spent (PHP)': '147.31' }),
        baseRow({ Reach: '139', Impressions: '149', Results: '1', 'Amount spent (PHP)': '20.40' }),
      ])
      expect(records).toHaveLength(1)
      const [record] = records
      expect(record.reach).toBe(1353)
      expect(record.impressions).toBe(1625)
      expect(record.results).toBe(10)
      expect(record.total_messaging_contacts).toBe(10)
      expect(record.amount_spent).toBeCloseTo(167.71)
      expect(record.cost_per_result).toBeCloseTo(16.771)
      expect(summary.mergedDuplicateRows).toBe(1)
    })

    it('does not merge rows for different days or different ad sets', () => {
      const { records } = validateAdsDailyRows([
        baseRow({ Day: '2026-01-01' }),
        baseRow({ Day: '2026-01-02' }),
        baseRow({ 'Ad set name': 'Set B' }),
      ])
      expect(records).toHaveLength(3)
    })

    it('leaves cost_per_result null when merged results total zero', () => {
      const [record] = validateAdsDailyRows([
        baseRow({ Results: '0', 'Cost per result': '' }),
        baseRow({ Results: '0', 'Cost per result': '' }),
      ]).records
      expect(record.results).toBe(0)
      expect(record.cost_per_result).toBeNull()
    })
  })
})
