import { useTranslation } from 'react-i18next'
import { LogOutIcon } from 'lucide-react'
import { LanguageMenu } from '@/app/shell/language-menu'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { useSignOut } from '@/features/session/hooks/use-sign-out'
import { useSessionStore } from '@/features/session/session-store'

export function TopBar() {
  const { t } = useTranslation()
  const user = useSessionStore((s) => s.me?.user)
  const { signOut, pending } = useSignOut()

  return (
    <header className="sticky top-0 z-20 flex h-15 items-center gap-3 border-b bg-surface px-6">
      <div className="ml-auto flex items-center gap-3">
        <LanguageMenu />
        <Separator orientation="vertical" className="h-6!" />
        {user && (
          <div className="flex min-w-0 flex-col items-end leading-tight" aria-label={t('topBar.signedInAs', { name: user.displayName })}>
            <span className="max-w-48 truncate text-label-md text-foreground" data-testid="admin-name">
              {user.displayName}
            </span>
            <span className="text-label-sm text-subtle-foreground">{t('topBar.role')}</span>
          </div>
        )}
        <Button variant="outline" size="sm" onClick={() => void signOut()} loading={pending}>
          {!pending && <LogOutIcon aria-hidden />}
          {t('topBar.logout')}
        </Button>
      </div>
    </header>
  )
}
