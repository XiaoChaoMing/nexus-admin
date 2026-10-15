import { z } from 'zod'
import { codePointLength } from '@/lib/text'

// BR-D13: a rejection needs a reason of 10–500 characters, shown to the applicant.
export const REASON_MIN = 10
export const REASON_MAX = 500

/** Characters as identity counts them (Unicode code points of the trimmed text, like Go's utf8.RuneCountInString). */
export const reasonLength = codePointLength

// Messages are i18n keys; the dialog translates them (see useMessage).
export const rejectSchema = z.object({
  reason: z
    .string()
    .refine((v) => reasonLength(v) >= REASON_MIN, 'applications:reject.tooShort')
    .refine((v) => reasonLength(v) <= REASON_MAX, 'applications:reject.tooLong')
    .transform((v) => v.trim()),
})

export type RejectForm = z.input<typeof rejectSchema>
