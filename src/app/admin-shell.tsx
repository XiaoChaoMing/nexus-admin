import { useTranslation } from 'react-i18next'
import { Outlet } from 'react-router'
import { Sidebar } from '@/app/shell/sidebar'
import { TopBar } from '@/app/shell/top-bar'

export function AdminShell() {
  const { t } = useTranslation()

  return (
    <div className="min-h-dvh bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded-control focus:bg-card focus:px-3 focus:py-2"
      >
        {t('nav.skipToContent')}
      </a>
      <Sidebar />
      <div className="flex min-h-dvh flex-col pl-16 xl:pl-60">
        <TopBar />
        <main id="main" tabIndex={-1} className="min-w-0 flex-1 outline-none">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
