import { useEffect, useId, useRef, type ReactNode } from 'react'
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
import { codePointLength } from '@/lib/text'
import { cn } from '@/lib/utils'
import { ADMIN_REASON_MAX, ADMIN_REASON_MIN, adminReasonSchema, type AdminReasonForm } from '@/features/admin-actions/schemas/reason-schema'

type AdminActionDialogProps = {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  /** Crimson confirm (lock, suspend, take down); restore / unlock / resolve without action use the primary button. */
  danger?: boolean
  /** 560px instead of 512px, for the report resolution with its action choices. */
  wide?: boolean
  loading: boolean
  /** Server-side error kept in the dialog (reason length, validation). */
  error: string | null
  /** Label of the reason field; "Lý do" by default ("Ghi chú kết luận" when resolving a report). */
  reasonLabel?: string
  /** Controls above the reason (duration, action choice). */
  children?: ReactNode
  /** Controls under the reason (close the other reports too). */
  footer?: ReactNode
  onConfirm: (reason: string) => void
  onClose: () => void
}

/** Modal/Admin Action (brief GĐ5 A0): Confirm Danger + a mandatory reason of 10–500 characters with a live counter. */
export function AdminActionDialog({
  open,
  title,
  description,
  confirmLabel,
  danger = true,
  wide = false,
  loading,
  error,
  reasonLabel,
  children,
  footer,
  onConfirm,
  onClose,
}: AdminActionDialogProps) {
  const { t } = useTranslation()
  const msg = useMessage()
  const id = useId()
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<AdminReasonForm>({ resolver: zodResolver(adminReasonSchema), defaultValues: { reason: '' }, mode: 'onTouched' })

  useEffect(() => {
    if (open) reset({ reason: '' })
  }, [open, reset])

  const length = codePointLength(useWatch({ control, name: 'reason' }) ?? '')
  const fieldError = msg(errors.reason?.message) ?? error
  const { ref, ...field } = register('reason')
  const submit = handleSubmit((values) => onConfirm(adminReasonSchema.parse(values).reason))

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && !loading && onClose()}>
      <AlertDialogContent
        className={cn(wide && 'sm:max-w-[560px]', 'max-h-[calc(100dvh-2rem)] overflow-y-auto')}
        onOpenAutoFocus={(e) => {
          // Controls first when there are choices to make, otherwise straight into the reason.
          if (children) return
          e.preventDefault()
          textareaRef.current?.focus()
        }}
      >
        <form onSubmit={submit} noValidate className="grid gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle>{title}</AlertDialogTitle>
            <AlertDialogDescription>{description}</AlertDialogDescription>
          </AlertDialogHeader>
          {children}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`${id}-reason`}>{reasonLabel ?? t('reason.label')}</Label>
            <Textarea
              id={`${id}-reason`}
              rows={4}
              maxLength={ADMIN_REASON_MAX + 50}
              aria-invalid={fieldError ? true : undefined}
              aria-describedby={`${id}-hint ${id}-counter${fieldError ? ` ${id}-error` : ''}`}
              className="max-h-48"
              ref={(el) => {
                ref(el)
                textareaRef.current = el
              }}
              {...field}
            />
            <div className="flex items-start justify-between gap-3 text-label-sm">
              <span id={`${id}-hint`} className="text-subtle-foreground">
                {t('reason.hint')}
              </span>
              <span
                id={`${id}-counter`}
                className={cn(
                  'tabular-nums',
                  length > ADMIN_REASON_MAX || (length > 0 && length < ADMIN_REASON_MIN) ? 'text-destructive' : 'text-subtle-foreground',
                )}
              >
                {t('reason.counter', { length, max: ADMIN_REASON_MAX })}
              </span>
            </div>
            {fieldError && (
              <p id={`${id}-error`} role="alert" className="text-label-sm text-destructive">
                {fieldError}
              </p>
            )}
          </div>
          {footer}
          <AlertDialogFooter>
            <AlertDialogCancel variant="ghost" disabled={loading}>
              {t('actions.cancel')}
            </AlertDialogCancel>
            <Button type="submit" variant={danger ? 'destructive' : 'default'} loading={loading}>
              {confirmLabel}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
