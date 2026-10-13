import type { LucideIcon } from 'lucide-react'
import { FileCheck2Icon, FlagIcon, RadioTowerIcon, ScrollTextIcon, TvIcon, UsersIcon } from 'lucide-react'

export type NavItem = {
  to: string
  /** common:nav.* key */
  label: 'nav.creatorApplications' | 'nav.reports' | 'nav.users' | 'nav.channels' | 'nav.streams' | 'nav.auditLog'
  icon: LucideIcon
  /** Planned for GĐ5; shown disabled so admins see what is coming. */
  disabled?: boolean
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/creator-applications', label: 'nav.creatorApplications', icon: FileCheck2Icon },
  { to: '/reports', label: 'nav.reports', icon: FlagIcon, disabled: true },
  { to: '/users', label: 'nav.users', icon: UsersIcon, disabled: true },
  { to: '/channels', label: 'nav.channels', icon: TvIcon, disabled: true },
  { to: '/streams', label: 'nav.streams', icon: RadioTowerIcon, disabled: true },
  { to: '/audit-log', label: 'nav.auditLog', icon: ScrollTextIcon, disabled: true },
]
