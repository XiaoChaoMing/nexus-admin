import { Navigate, Outlet, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { LogOutIcon, ShieldAlertIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { CenteredLayout } from '@/features/session/components/centered-layout'
import { useErrorMessage } from '@/features/session/hooks/use-error-message'
import { useSignOut } from '@/features/session/hooks/use-sign-out'
import { sessionGate } from '@/features/session/lib/gate'
import { initSession } from '@/features/session/lib/session'
import { useSessionStore } from '@/features/session/session-store'
import { safeReturnTo } from '@/features/session/lib/return-to'

function FullScreenSpinner() {
  return (
    <div className="grid min-h-dvh place-items-center bg-background">
      <Spinner className="size-6 text-primary" />
    </div>
  )
}

/** "Tài khoản không có quyền quản trị": signed in, but `/v1/me` has no ADMIN role. */
export function NoPermissionScreen() {
  const { t } = useTranslation('auth')
  const user = useSessionStore((s) => s.me?.user)
  const { signOut, pending } = useSignOut()

  return (
    <CenteredLayout>
      <div className="flex flex-col items-center gap-3 text-center" role="alert">
        <span className="grid size-12 place-items-center rounded-xl bg-destructive/10 text-destructive" aria-hidden>
          <ShieldAlertIcon className="size-6" />
        </span>
        <h1 className="text-headline-md text-foreground">{t('forbidden.title')}</h1>
        <p className="text-body-md text-muted-foreground">{t('forbidden.body', { name: user ? `@${user.username}` : '' })}</p>
      </div>
      <Button className="mt-6 w-full" variant="secondary" onClick={() => void signOut()} loading={pending}>
        {!pending && <LogOutIcon aria-hidden />}
        {t('forbidden.logout')}
      </Button>
    </CenteredLayout>
  )
}

function BootErrorScreen() {
  const { t } = useTranslation()
  const error = useSessionStore((s) => s.error)
  const clear = useSessionStore((s) => s.clear)
  const errorMessage = useErrorMessage()

  return (
    <CenteredLayout>
      <div role="alert">
        <h1 className="text-headline-md text-foreground">{t('boot.errorTitle')}</h1>
        <p className="mt-2 text-body-md text-muted-foreground">{t('boot.errorBody')}</p>
        {error && <p className="mt-2 text-body-sm text-subtle-foreground">{errorMessage(error)}</p>}
      </div>
      <div className="mt-6 flex gap-2">
        <Button className="flex-1" onClick={() => void initSession()}>
          {t('actions.retry')}
        </Button>
        <Button className="flex-1" variant="outline" onClick={clear}>
          {t('boot.toLogin')}
        </Button>
      </div>
    </CenteredLayout>
  )
}

/** Protected area: only ADMIN sessions get through; identity enforces the same rule on every call. */
export function RequireAdmin() {
  const status = useSessionStore((s) => s.status)
  const me = useSessionStore((s) => s.me)
  const location = useLocation()

  switch (sessionGate(status, me)) {
    case 'loading':
      return <FullScreenSpinner />
    case 'login':
      return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />
    case 'error':
      return <BootErrorScreen />
    case 'forbidden':
      return <NoPermissionScreen />
    case 'admin':
      return <Outlet />
  }
}

/** /login is pointless once signed in; a successful sign-in also leaves through here. */
export function GuestOnly() {
  const status = useSessionStore((s) => s.status)
  const me = useSessionStore((s) => s.me)
  const location = useLocation()

  if (status === 'authenticated' && me) return <Navigate to={safeReturnTo(location.state)} replace />

  return <Outlet />
}
