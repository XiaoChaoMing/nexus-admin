import { useEffect, type ReactNode } from 'react'
import { FileSearchIcon } from 'lucide-react'

/** Sets the tab title ("Báo cáo vi phạm · NexusLive Admin"). */
function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · NexusLive Admin`
  }, [title])
}

type AdminPageProps = { title: string; subtitle: string; actions?: ReactNode; children: ReactNode }

/** Page frame: max 1600px, 24px gutters, headline-lg title and a muted subtitle. */
export function AdminPage({ title, subtitle, actions, children }: AdminPageProps) {
  useDocumentTitle(title)

  return (
    <div className="mx-auto flex max-w-[1600px] flex-col gap-5 px-6 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-headline-lg text-foreground">{title}</h1>
          <p className="mt-1 text-body-md text-muted-foreground">{subtitle}</p>
        </div>
        {actions}
      </header>
      {children}
    </div>
  )
}

type MasterDetailProps = {
  table: ReactNode
  /** The panel when a row is selected, null otherwise. */
  detail: ReactNode | null
  placeholder: string
  onClose: () => void
}

/**
 * Table + 420px panel on desktop; below 1280px the panel is a drawer over the table with a 60% scrim, and Escape
 * closes it (unless a dialog is open, which handles Escape itself).
 */
export function MasterDetail({ table, detail, placeholder, onClose }: MasterDetailProps) {
  const open = detail !== null

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !document.querySelector('[role="alertdialog"]')) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
      {table}
      {open ? (
        <>
          <div className="fixed inset-0 z-30 bg-black/60 xl:hidden" aria-hidden onClick={onClose} />
          {detail}
        </>
      ) : (
        <div className="hidden flex-col items-center gap-3 rounded-panel border border-dashed border-border px-6 py-16 text-center text-body-md text-muted-foreground xl:flex">
          <FileSearchIcon className="size-8 text-subtle-foreground" aria-hidden />
          {placeholder}
        </div>
      )}
    </div>
  )
}
