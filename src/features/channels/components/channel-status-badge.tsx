import { useTranslation } from 'react-i18next'
import { Badge } from '@/components/ui/badge'
import type { ChannelStatus } from '@/features/channels/types'

/** Kênh: Hoạt động (green) · Tạm ngưng (red), always with text. */
export function ChannelStatusBadge({ status }: { status: ChannelStatus }) {
  const { t } = useTranslation('channels')

  return status === 'ACTIVE' ? (
    <Badge variant="outline" className="border-success/50 text-success" data-status="ACTIVE">
      {t('status.ACTIVE')}
    </Badge>
  ) : (
    <Badge variant="outline" className="border-destructive/60 text-destructive" data-status="SUSPENDED">
      {t('status.SUSPENDED')}
    </Badge>
  )
}

/** Avatar or the first letter of the name on the card tone. */
export function ChannelAvatar({ name, url, size = 'size-8' }: { name: string; url: string | null; size?: string }) {
  return url ? (
    <img src={url} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
  ) : (
    <span className={`${size} grid shrink-0 place-items-center rounded-full bg-card text-label-md text-muted-foreground`} aria-hidden>
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}
