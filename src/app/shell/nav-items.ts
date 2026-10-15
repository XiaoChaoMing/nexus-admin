import type { LucideIcon } from 'lucide-react'
import { FileCheck2Icon, FlagIcon, RadioTowerIcon, ScrollTextIcon, TvIcon, UsersIcon } from 'lucide-react'

export type NavItem = {
  to: string
  /** common:nav.* key */
  label: 'nav.creatorApplications' | 'nav.reports' | 'nav.users' | 'nav.channels' | 'nav.streams' | 'nav.auditLog'
  icon: LucideIcon
  /** Shows the number of OPEN reports beside the label (polled every 30 s). */
  openReportsBadge?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/creator-applications', label: 'nav.creatorApplications', icon: FileCheck2Icon },
  { to: '/reports', label: 'nav.reports', icon: FlagIcon, openReportsBadge: true },
  { to: '/users', label: 'nav.users', icon: UsersIcon },
  { to: '/channels', label: 'nav.channels', icon: TvIcon },
  { to: '/streams', label: 'nav.streams', icon: RadioTowerIcon },
  { to: '/audit-log', label: 'nav.auditLog', icon: ScrollTextIcon },
]
