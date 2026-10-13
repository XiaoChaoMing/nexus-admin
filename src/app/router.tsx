import { createBrowserRouter, Navigate } from 'react-router'
import { AdminShell } from '@/app/admin-shell'
import { NotFoundPage } from '@/app/not-found-page'
import { CreatorApplicationsPage } from '@/features/applications/components/creator-applications-page'
import { LoginPage } from '@/features/session/components/login-page'
import { GuestOnly, RequireAdmin } from '@/features/session/components/route-guards'
import { HOME } from '@/features/session/lib/return-to'

export const router = createBrowserRouter([
  {
    element: <GuestOnly />,
    children: [{ path: '/login', element: <LoginPage /> }],
  },
  {
    element: <RequireAdmin />,
    children: [
      {
        element: <AdminShell />,
        children: [
          { index: true, element: <Navigate to={HOME} replace /> },
          { path: '/creator-applications', element: <CreatorApplicationsPage /> },
          { path: '/creator-applications/:id', element: <CreatorApplicationsPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
