import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useParams, useSearchParams } from 'react-router'
import { FileSearchIcon } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ApplicationDetail } from '@/features/applications/components/application-detail'
import { ApplicationsTable } from '@/features/applications/components/applications-table'
import { useApplicationList } from '@/features/applications/hooks/use-applications'
import { parseStatusFilter, STATUS_FILTERS, type StatusFilter } from '@/features/applications/types'
import { useErrorMessage } from '@/features/session/hooks/use-error-message'

/**
 * /creator-applications[/:id]?status=… — the selected id and the filter live in the URL,
 * so a detail is linkable and Back closes it.
 */
export function CreatorApplicationsPage() {
  const { t } = useTranslation('applications')
  const { id } = useParams()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const errorMessage = useErrorMessage()
  const status = parseStatusFilter(params.get('status'))
  const list = useApplicationList(status)
  const items = list.data?.pages.flatMap((p) => p.items) ?? []

  const go = (nextId: string | undefined, nextStatus: StatusFilter = status) => {
    const search = nextStatus === 'PENDING' ? '' : `?status=${nextStatus}`
    navigate(`/creator-applications${nextId ? `/${encodeURIComponent(nextId)}` : ''}${search}`)
  }

  useEffect(() => {
    document.title = `${t('title')} · NexusLive Admin`
  }, [t])

  // Tablet: the detail is a drawer over the table; Escape closes it like a dialog.
  useEffect(() => {
    if (!id) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[role="alertdialog"]')) go(undefined)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-6 py-6">
      <header>
        <h1 className="text-headline-lg text-foreground">{t('title')}</h1>
        <p className="mt-1 text-body-md text-muted-foreground">{t('subtitle')}</p>
      </header>

      <Tabs value={status} onValueChange={(v) => go(undefined, v as StatusFilter)}>
        <TabsList aria-label={t('filter.label')}>
          {STATUS_FILTERS.map((s) => (
            <TabsTrigger key={s} value={s}>
              {t(`filter.${s}`)}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={status} className="pt-3">
          <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
            <ApplicationsTable
              items={items}
              status={status}
              selectedId={id}
              loading={list.isPending}
              error={list.error ? errorMessage(list.error) || t('table.loadError') : null}
              hasMore={list.hasNextPage}
              loadingMore={list.isFetchingNextPage}
              onSelect={(next) => go(next)}
              onLoadMore={() => void list.fetchNextPage()}
              onRetry={() => void list.refetch()}
            />
            {id ? (
              <>
                {/* Tablet: the detail is a drawer; the scrim closes it. */}
                <div className="fixed inset-0 z-30 bg-black/60 xl:hidden" aria-hidden onClick={() => go(undefined)} />
                <ApplicationDetail key={id} id={id} onClose={() => go(undefined)} />
              </>
            ) : (
              <div className="hidden flex-col items-center gap-3 rounded-panel border border-dashed border-border px-6 py-16 text-center text-body-md text-muted-foreground xl:flex">
                <FileSearchIcon className="size-8 text-subtle-foreground" aria-hidden />
                {t('detail.placeholder')}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
