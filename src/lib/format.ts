import { currentLocale } from '@/i18n'

export function formatDateTime(iso: string | null, locale = currentLocale()): string {
  if (!iso) return ''

  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

/**
 * A calendar date (`YYYY-MM-DD`, no time zone). Formatted in UTC so the day never shifts with the
 * browser's offset (new Date('2000-01-31') is midnight UTC, i.e. 30 Jan in America/*).
 */
export function formatCalendarDate(date: string | null, locale = currentLocale()): string {
  if (!date) return ''
  const ms = Date.parse(`${date}T00:00:00Z`)
  if (Number.isNaN(ms)) return date

  return new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(ms))
}

/** Whole years between a `YYYY-MM-DD` birth date and `today` (local calendar); null when unparsable. */
export function ageOn(birthDate: string | null, today = new Date()): number | null {
  const m = birthDate ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate) : null
  if (!m) return null

  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])]
  let age = today.getFullYear() - y
  const month = today.getMonth() + 1
  if (month < mo || (month === mo && today.getDate() < d)) age -= 1

  return age < 0 ? null : age
}
