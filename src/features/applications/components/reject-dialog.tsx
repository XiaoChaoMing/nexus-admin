import { useEffect, useId, useRef } from 'react'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useMessage } from '@/i18n/messages'
import { cn } from '@/lib/utils'
import { REASON_MAX, REASON_MIN, reasonLength, rejectSchema, type RejectForm } from '@/features/applications/schemas/reject-schema'

type RejectDialogProps = {
  open: boolean
  username: string
  loading: boolean
  /** Server-side error shown inside the dialog (e.g. VALIDATION_FAILED). */
  error: string | null
  onConfirm: (reason: string) => void
  onClose: () => void
}

/** Confirmation with a mandatory reason (BR-D13, 10–500 characters, live counter). */
export function RejectDialog({ open, username, loading, error, onConfirm, onClose }: RejectDialogProps) {
  const { t } = useTranslation(['applications', 'common'])
  const msg = useMessage()
  const id = useId()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<RejectForm>({ resolver: zodResolver(rejectSchema), defaultValues: { reason: '' }, mode: 'onTouched' })

  useEffect(() => {
    if (open) reset({ reason: '' })
  }, [open, reset])

  const length = reasonLength(useWatch({ control, name: 'reason' }) ?? '')
  const fieldError = msg(errors.reason?.message) ?? error
  const { ref, ...field } = register('reason')

  const submit = handleSubmit((values) => onConfirm(rejectSchema.parse(values).reason))

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <AlertDialogContent
        onOpenAutoFocus={(e) => {
          // Start in the reason field instead of the Cancel button.
          e.preventDefault()
          textareaRef.current?.focus()
        }}
      >
        <form onSubmit={submit} noValidate className="grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{t('reject.title', { username })}</AlertDialogTitle>
            <AlertDialogDescription>{t('reject.body')}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-reason`}>{t('reject.reasonLabel')}</Label>
            <Textarea
              id={`${id}-reason`}
              rows={5}
              maxLength={REASON_MAX + 50}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={`${id}-hint ${id}-counter${fieldError ? ` ${id}-error` : ''}`}
              className="max-h-60"
              ref={(el) => {
                ref(el)
                textareaRef.current = el
              }}
              {...field}
            />
            <div className="flex items-start justify-between gap-3 text-label-sm">
              <span id={`${id}-hint`} className="text-subtle-foreground">
                {t('reject.reasonHint')}
              </span>
              <span
                id={`${id}-counter`}
                className={cn('tabular-nums', length > REASON_MAX || (length > 0 && length < REASON_MIN) ? 'text-destructive' : 'text-subtle-foreground')}
              >
                {t('reject.counter', { length, max: REASON_MAX })}
              </span>
            </div>
            {fieldError && (
              <p id={`${id}-error`} role="alert" className="text-label-sm text-destructive">
                {fieldError}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel variant="ghost" disabled={loading}>
              {t('common:actions.cancel')}
            </AlertDialogCancel>
            <Button type="submit" variant="destructive" loading={loading}>
              {t('reject.confirm')}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
