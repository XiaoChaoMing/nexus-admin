import { z } from 'zod'

// Messages are i18n keys; the form translates them (see useMessage). Mirrors identity's login validator.
export const loginSchema = z.object({
  login: z.string().trim().min(1, 'auth:validation.required').max(254, 'auth:validation.required'),
  password: z.string().min(1, 'auth:validation.required').max(72, 'auth:validation.passwordLength'),
})

export type LoginForm = z.infer<typeof loginSchema>
