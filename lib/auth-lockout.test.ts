import { describe, it, expect } from 'vitest'
import { isWithinLockoutWindow, isTempPasswordExpired } from './auth-lockout'

describe('isWithinLockoutWindow', () => {
  const windowMs = 15 * 60 * 1000
  const now = new Date('2026-09-02T12:00:00Z')

  it('returns false when there is no prior failure', () => {
    expect(isWithinLockoutWindow(null, now, windowMs)).toBe(false)
  })

  it('returns true for a failure just inside the window', () => {
    const lastFailed = new Date(now.getTime() - (windowMs - 1))
    expect(isWithinLockoutWindow(lastFailed, now, windowMs)).toBe(true)
  })

  it('returns false for a failure exactly at the window boundary', () => {
    const lastFailed = new Date(now.getTime() - windowMs)
    expect(isWithinLockoutWindow(lastFailed, now, windowMs)).toBe(false)
  })

  it('returns false for a failure just outside the window', () => {
    const lastFailed = new Date(now.getTime() - (windowMs + 1))
    expect(isWithinLockoutWindow(lastFailed, now, windowMs)).toBe(false)
  })
})

describe('isTempPasswordExpired', () => {
  const now = new Date('2026-09-02T12:00:00Z')

  it('returns false when must_change_password is not set, even with a past expiry', () => {
    const past = new Date(now.getTime() - 1000)
    expect(isTempPasswordExpired(false, past, now)).toBe(false)
  })

  it('returns false when there is no expiry set', () => {
    expect(isTempPasswordExpired(true, null, now)).toBe(false)
  })

  it('returns false exactly at the expiry timestamp', () => {
    expect(isTempPasswordExpired(true, now, now)).toBe(false)
  })

  it('returns true just after expiry', () => {
    const justPast = new Date(now.getTime() - 1)
    expect(isTempPasswordExpired(true, justPast, now)).toBe(true)
  })

  it('returns false for an expiry still in the future', () => {
    const future = new Date(now.getTime() + 1000)
    expect(isTempPasswordExpired(true, future, now)).toBe(false)
  })
})
