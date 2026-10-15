import { createBrowserRouter, Navigate } from 'react-router'
import { AdminShell } from '@/app/admin-shell'
import { NotFoundPage } from '@/app/not-found-page'
import { CreatorApplicationsPage } from '@/features/applications/components/creator-applications-page'
import { AuditLogPage } from '@/features/audit/components/audit-log-page'
import { ChannelsPage } from '@/features/channels/components/channels-page'
import { ReportsPage } from '@/features/reports/components/reports-page'
import { LoginPage } from '@/features/session/components/login-page'
import { GuestOnly, RequireAdmin } from '@/features/session/components/route-guards'
import { HOME } from '@/features/session/lib/return-to'
import { StreamsPage } from '@/features/streams/components/streams-page'
import { UsersPage } from '@/features/users/components/users-page'

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
          { path: '/reports', element: <ReportsPage /> },
          { path: '/reports/:id', element: <ReportsPage /> },
          { path: '/users', element: <UsersPage /> },
          { path: '/users/:id', element: <UsersPage /> },
          { path: '/channels', element: <ChannelsPage /> },
          { path: '/channels/:id', element: <ChannelsPage /> },
          { path: '/streams', element: <StreamsPage /> },
          { path: '/audit-log', element: <AuditLogPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
])
