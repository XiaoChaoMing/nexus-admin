import { useTranslation } from 'react-i18next'
import { BadgeCheckIcon, CircleDashedIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function VerifiedBadge({ verified }: { verified: boolean }) {
  const { t } = useTranslation('applications')

  return verified ? (
    <Badge variant="outline" className="border-success/50 text-success">
      <BadgeCheckIcon aria-hidden />
      {t('verified')}
    </Badge>
  ) : (
    <Badge variant="secondary">
      <CircleDashedIcon aria-hidden />
      {t('unverified')}
    </Badge>
  )
}
