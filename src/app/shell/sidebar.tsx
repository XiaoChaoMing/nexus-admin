import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { useOpenReportCount } from '@/features/reports/hooks/use-reports'
import { Brand } from './brand'
import { NAV_ITEMS, type NavItem } from './nav-items'

const itemClass =
  'relative flex h-10 items-center gap-3 rounded-control px-3 text-label-md text-muted-foreground transition-colors max-xl:justify-center max-xl:px-0'

/** "99+" keeps the badge narrow. */
function countLabel(count: number) {
  return count > 99 ? '99+' : String(count)
}

function SidebarItem({ item, openReports }: { item: NavItem; openReports: number }) {
  const { t } = useTranslation()
  const Icon = item.icon
  const label = t(item.label)
  const count = item.openReportsBadge ? openReports : 0
  const accessibleName = count ? `${label} (${t('nav.openReports', { count })})` : label

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <NavLink
          to={item.to}
          aria-label={accessibleName}
          className={cn(
            itemClass,
            'hover:bg-accent hover:text-foreground',
            'aria-[current=page]:bg-card aria-[current=page]:text-foreground aria-[current=page]:[&_svg]:text-primary',
          )}
        >
          <Icon className="size-5 shrink-0" aria-hidden />
          <span className="flex-1 truncate max-xl:hidden">{label}</span>
          {count > 0 && (
            <Badge
              variant="warning"
              aria-hidden
              data-testid="open-reports-badge"
              className="tabular-nums max-xl:absolute max-xl:-top-1 max-xl:-right-1 max-xl:px-1 max-xl:py-0 max-xl:text-[10px]"
            >
              {countLabel(count)}
            </Badge>
          )}
        </NavLink>
      </TooltipTrigger>
      <TooltipContent side="right">{accessibleName}</TooltipContent>
    </Tooltip>
  )
}

/** Fixed left rail: 240px on desktop (≥1280), icons only on tablet. */
export function Sidebar() {
  const { t } = useTranslation()
  const { data } = useOpenReportCount()

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-16 flex-col border-r bg-surface xl:w-60">
      <div className="flex h-15 items-center border-b px-4 max-xl:justify-center max-xl:px-0">
        <Brand className="max-xl:hidden" />
        <Brand compact className="xl:hidden" />
      </div>
      <nav aria-label={t('nav.main')} className="flex flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => (
          <SidebarItem key={item.to} item={item} openReports={data?.open ?? 0} />
        ))}
      </nav>
    </aside>
  )
}
