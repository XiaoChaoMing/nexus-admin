import { useTranslation } from 'react-i18next'
import { FlagIcon, MessageSquareTextIcon, RadioTowerIcon, TvIcon, UserIcon, type LucideIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AdminReport, ReportStatus, TargetType } from '@/features/reports/types'

/** Badge/Report Status: Mới (warning) · Đang xử lý (cyan) · Đã xử lý (success) · Đã bỏ qua (neutral); always with text. */
const STATUS_VARIANT: Record<ReportStatus, 'warning' | 'cyan' | 'success' | 'secondary'> = {
  OPEN: 'warning',
  IN_REVIEW: 'cyan',
  RESOLVED: 'success',
  DISMISSED: 'secondary',
}

export function ReportStatusBadge({ status }: { status: ReportStatus }) {
  const { t } = useTranslation('reports')

  return (
    <Badge variant={STATUS_VARIANT[status]} data-status={status}>
      {t(`status.${status}`)}
    </Badge>
  )
}

const TARGET_ICON: Record<TargetType, LucideIcon> = {
  MESSAGE: MessageSquareTextIcon,
  USER: UserIcon,
  STREAM: RadioTowerIcon,
  CHANNEL: TvIcon,
}

/** Icon of the target type + its label (message excerpt, @username, stream title, channel name). */
export function ReportTarget({ report, className }: { report: Pick<AdminReport, 'targetType' | 'target'>; className?: string }) {
  const { t } = useTranslation('reports')
  const Icon = TARGET_ICON[report.targetType] ?? FlagIcon

  return (
    <span className={cn('flex min-w-0 items-center gap-2', className)}>
      <Icon className="size-4 shrink-0 text-muted-foreground" aria-label={t(`targetType.${report.targetType}`)} />
      <span className="min-w-0 truncate">{report.target.label}</span>
    </span>
  )
}
