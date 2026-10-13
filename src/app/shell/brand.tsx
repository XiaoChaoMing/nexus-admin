import { useTranslation } from 'react-i18next'
import { ShieldCheckIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/** "NexusLive Admin" wordmark; `compact` keeps only the mark (narrow sidebar). */
export function Brand({ compact = false, className }: { compact?: boolean; className?: string }) {
  const { t } = useTranslation()

  return (
    <span className={cn('flex items-center gap-2 font-heading text-headline-sm text-foreground', className)}>
      <span className="grid size-7 shrink-0 place-items-center rounded-control bg-primary text-primary-foreground" aria-hidden>
        <ShieldCheckIcon className="size-4" />
      </span>
      <span className={cn(compact && 'sr-only')}>
        {t('brand')} <span className="text-primary">{t('brandAdmin')}</span>
      </span>
    </span>
  )
}
