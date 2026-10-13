import type { ReactNode } from 'react'
import { LanguageMenu } from '@/app/shell/language-menu'
import { Brand } from '@/app/shell/brand'

/** Full-screen card used by login, the no-permission screen, boot errors and 404. */
export function CenteredLayout({ children }: { children: ReactNode }) {
  return (
    <main id="main" className="relative grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="absolute top-3 right-3">
        <LanguageMenu />
      </div>
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Brand />
        </div>
        <section className="rounded-panel border border-border bg-card p-6 sm:p-8">{children}</section>
      </div>
    </main>
  )
}
