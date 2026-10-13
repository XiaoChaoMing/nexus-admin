import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { Brand } from './brand'
import { NAV_ITEMS, type NavItem } from './nav-items'

const itemClass =
  'flex h-10 items-center gap-3 rounded-control px-3 text-label-md text-muted-foreground transition-colors max-xl:justify-center max-xl:px-0'

function SidebarItem({ item }: { item: NavItem }) {
  const { t } = useTranslation()
  const Icon = item.icon
  const label = t(item.label)

  const content = item.disabled ? (
    // Not a link yet: focusable so keyboard users still get the tooltip, announced as disabled.
    <span role="link" aria-disabled="true" tabIndex={0} aria-label={`${label} (${t('nav.comingSoon')})`} className={cn(itemClass, 'cursor-not-allowed opacity-60')}>
      <Icon className="size-5 shrink-0" aria-hidden />
      <span className="flex-1 truncate max-xl:hidden">{label}</span>
      <Badge variant="secondary" className="max-xl:hidden" aria-hidden>
        {t('nav.phase5')}
      </Badge>
    </span>
  ) : (
    <NavLink
      to={item.to}
      aria-label={label}
      className={cn(
        itemClass,
        'hover:bg-accent hover:text-foreground',
        'aria-[current=page]:bg-card aria-[current=page]:text-foreground aria-[current=page]:[&_svg]:text-primary',
      )}
    >
      <Icon className="size-5 shrink-0" aria-hidden />
      <span className="truncate max-xl:hidden">{label}</span>
    </NavLink>
  )

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent side="right">{item.disabled ? `${label} · ${t('nav.comingSoon')}` : label}</TooltipContent>
    </Tooltip>
  )
}

/** Fixed left rail: 240px on desktop (≥1280), icons only on tablet. */
export function Sidebar() {
  const { t } = useTranslation()

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-16 flex-col border-r bg-surface xl:w-60">
      <div className="flex h-15 items-center border-b px-4 max-xl:justify-center max-xl:px-0">
        <Brand className="max-xl:hidden" />
        <Brand compact className="xl:hidden" />
      </div>
      <nav aria-label={t('nav.main')} className="flex flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => (
          <SidebarItem key={item.to} item={item} />
        ))}
      </nav>
    </aside>
  )
}
