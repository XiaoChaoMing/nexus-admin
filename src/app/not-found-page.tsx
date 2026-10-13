import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { CenteredLayout } from '@/features/session/components/centered-layout'
import { HOME } from '@/features/session/lib/return-to'

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <CenteredLayout>
      <p className="font-heading text-headline-lg text-primary">{t('notFound.code')}</p>
      <h1 className="mt-2 text-headline-md text-foreground">{t('notFound.title')}</h1>
      <p className="mt-2 text-body-md text-muted-foreground">{t('notFound.body')}</p>
      <Button asChild className="mt-6 w-full">
        <Link to={HOME}>{t('actions.backHome')}</Link>
      </Button>
    </CenteredLayout>
  )
}
