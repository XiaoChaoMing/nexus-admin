import { z } from 'zod'
import { codePointLength } from '@/lib/text'

/** Every admin action and report conclusion needs a reason of 10–500 characters after trim (ADMIN_REASON_MIN/MAX). */
export const ADMIN_REASON_MIN = 10
export const ADMIN_REASON_MAX = 500

// Messages are i18n keys; the dialog translates them (useMessage).
export const adminReasonSchema = z.object({
  reason: z
    .string()
    .refine((v) => codePointLength(v) >= ADMIN_REASON_MIN, 'common:reason.tooShort')
    .refine((v) => codePointLength(v) <= ADMIN_REASON_MAX, 'common:reason.tooLong')
    .transform((v) => v.trim()),
})

export type AdminReasonForm = z.input<typeof adminReasonSchema>
