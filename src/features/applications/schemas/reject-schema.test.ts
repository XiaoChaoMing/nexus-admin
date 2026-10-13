import { describe, expect, it } from 'vitest'
import { REASON_MAX, REASON_MIN, reasonLength, rejectSchema } from '@/features/applications/schemas/reject-schema'

const issue = (reason: string) => {
  const r = rejectSchema.safeParse({ reason })
  return r.success ? null : r.error.issues[0].message
}

describe('rejectSchema (BR-D13)', () => {
  it('accepts 10 to 500 characters and trims the result', () => {
    expect(rejectSchema.parse({ reason: '  Thiếu giấy tờ  ' })).toEqual({ reason: 'Thiếu giấy tờ' })
    expect(issue('a'.repeat(REASON_MIN))).toBeNull()
    expect(issue('a'.repeat(REASON_MAX))).toBeNull()
  })

  it('rejects too short reasons, whitespace not counted', () => {
    expect(issue('a'.repeat(REASON_MIN - 1))).toBe('applications:reject.tooShort')
    expect(issue(`   ${'a'.repeat(5)}        `)).toBe('applications:reject.tooShort')
    expect(issue('')).toBe('applications:reject.tooShort')
  })

  it('rejects too long reasons', () => {
    expect(issue('a'.repeat(REASON_MAX + 1))).toBe('applications:reject.tooLong')
  })

  it('counts code points like the server (Vietnamese and emoji are one character each)', () => {
    expect(reasonLength('Tiếng Việt')).toBe(10)
    expect(reasonLength('🎮🎮')).toBe(2)
    expect(issue('🎮'.repeat(REASON_MAX))).toBeNull()
  })
})
