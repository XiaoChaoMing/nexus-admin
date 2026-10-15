import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { XIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

type DetailPanelProps = {
  /** Accessible name of the region ("Chi tiết báo cáo"). */
  label: string
  heading: ReactNode
  testId: string
  onClose: () => void
  children: ReactNode
}

/** Right-hand panel (420px on desktop, a drawer over the table below 1280px). */
export function DetailPanel({ label, heading, testId, onClose, children }: DetailPanelProps) {
  const { t } = useTranslation()

  return (
    <aside
      aria-label={label}
      data-testid={testId}
      className="flex min-w-0 flex-col rounded-panel border border-border bg-surface max-xl:fixed max-xl:inset-y-0 max-xl:right-0 max-xl:z-40 max-xl:w-[min(460px,100%)] max-xl:overflow-y-auto max-xl:rounded-none max-xl:border-y-0 max-xl:border-r-0"
    >
      <header className="flex items-center justify-between gap-2 border-b px-5 py-3">
        <h2 className="min-w-0 truncate text-headline-sm text-foreground">{heading}</h2>
        <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label={t('detail.close')}>
          <XIcon />
        </Button>
      </header>
      <div className="flex flex-col gap-5 p-5">{children}</div>
    </aside>
  )
}

export function Section({ title, children, testId }: { title: string; children: ReactNode; testId?: string }) {
  return (
    <section data-testid={testId} className="flex flex-col gap-1">
      <h3 className="mb-1 text-label-sm tracking-wide text-subtle-foreground uppercase">{title}</h3>
      {children}
    </section>
  )
}

/** Label 144px / value grid row; wrap a group of them in <dl>. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 py-1.5">
      <dt className="text-body-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-body-md break-words text-foreground">{children}</dd>
    </div>
  )
}

export function DetailSkeleton({ lines = 8 }: { lines?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-busy>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className="h-5 w-full" />
      ))}
    </div>
  )
}

export function DetailError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useTranslation()

  return (
    <div role="alert" className="flex flex-col items-start gap-3">
      <p className="text-body-md text-muted-foreground">{message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          {t('actions.retry')}
        </Button>
      )}
    </div>
  )
}
