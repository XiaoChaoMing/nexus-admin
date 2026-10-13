import { describe, expect, it } from 'vitest'
import i18n from '@/i18n'
import { ageOn, formatCalendarDate } from '@/lib/format'

describe('ageOn', () => {
  const today = new Date(2026, 9, 13) // 13 Oct 2026, local time

  it('counts whole years, turning a year older on the birthday', () => {
    expect(ageOn('2008-10-13', today)).toBe(18)
    expect(ageOn('2008-10-14', today)).toBe(17)
    expect(ageOn('2008-09-30', today)).toBe(18)
    expect(ageOn('1990-12-31', today)).toBe(35)
  })

  it('rejects malformed or future dates', () => {
    expect(ageOn(null, today)).toBeNull()
    expect(ageOn('13/10/2008', today)).toBeNull()
    expect(ageOn('2030-01-01', today)).toBeNull()
  })
})

describe('formatCalendarDate', () => {
  it('never shifts the day with the time zone', () => {
    expect(formatCalendarDate('2000-01-31', 'en-US')).toBe('Jan 31, 2000')
    expect(formatCalendarDate('2000-01-01', 'vi-VN')).toContain('2000')
    expect(formatCalendarDate('2000-01-01', 'vi-VN')).toMatch(/^1 /)
  })

  it('passes through unparsable values and empties null', () => {
    expect(formatCalendarDate(null)).toBe('')
    expect(formatCalendarDate('not-a-date', 'en-US')).toBe('not-a-date')
  })
})

describe('age label', () => {
  it('is pluralised per language', async () => {
    await i18n.changeLanguage('vi')
    expect(i18n.t('applications:age', { count: 18 })).toBe('18 tuổi')
    await i18n.changeLanguage('en')
    expect(i18n.t('applications:age', { count: 1 })).toBe('1 year old')
    expect(i18n.t('applications:age', { count: 21 })).toBe('21 years old')
    await i18n.changeLanguage('vi')
  })
})
