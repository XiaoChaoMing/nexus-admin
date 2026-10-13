import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import './index.css'
import '@/i18n'
import { AppProviders } from '@/app/providers'
import { router } from '@/app/router'
import { initSession } from '@/features/session/lib/session'

const root = createRoot(document.getElementById('root')!)

// Restore the session (refresh cookie → /v1/me) before the first route renders, so guards see the real state.
void initSession().finally(() => {
  root.render(
    <StrictMode>
      <AppProviders>
        <RouterProvider router={router} />
      </AppProviders>
    </StrictMode>,
  )
})
