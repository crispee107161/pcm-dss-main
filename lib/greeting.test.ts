import { describe, it, expect } from 'vitest'
import { greetingName } from './greeting'

describe('greetingName', () => {
  it('returns the first token of a multi-word personal name', () => {
    expect(greetingName('John Bernard Olermo', 'owner@pcmerchandise.com')).toBe('John')
  })

  it('falls back to the email local-part when name is null', () => {
    expect(greetingName(null, 'owner@pcmerchandise.com')).toBe('owner')
  })

  it('falls back to the email local-part when name is empty/whitespace', () => {
    expect(greetingName('   ', 'marketing@pcmerchandise.com')).toBe('marketing')
  })

  it('falls back to "there" when neither name nor email is available', () => {
    expect(greetingName(null, null)).toBe('there')
  })

  it('returns a single-word name unchanged', () => {
    // The seeded team@ account stores "Team", not "Marketing Team" —
    // first-token shortening of a two-word role label would otherwise
    // greet a shared account as "Good afternoon, Marketing"
    // (docs/raven/Account_Display_Names.md §4).
    expect(greetingName('Team', 'team@pcmerchandise.com')).toBe('Team')
  })
})
