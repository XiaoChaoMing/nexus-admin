import { useId, type ComponentProps, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

const control =
  'h-9 rounded-lg border border-input bg-surface px-3 text-body-md text-foreground outline-none focus-visible:border-primary aria-invalid:border-destructive'

/** Admin/Filter Bar: a wrapping row of labelled controls and a "Xóa bộ lọc" action. */
export function FilterBar({ label, children, className }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div role="group" aria-label={label} className={cn('flex flex-wrap items-end gap-3', className)}>
      {children}
    </div>
  )
}

type Option<V extends string> = { value: V; label: string }

/** Labelled native select (keyboard and screen-reader friendly). */
export function FilterSelect<V extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string
  value: V
  options: Option<V>[]
  onChange: (value: V) => void
  className?: string
}) {
  const id = useId()

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-label-sm text-muted-foreground">
        {label}
      </label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value as V)} className={cn(control, 'pr-8')}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  )
}

/** Labelled text / date input of a filter bar. */
export function FilterInput({
  label,
  className,
  invalid,
  ...props
}: ComponentProps<'input'> & { label: string; invalid?: boolean }) {
  const id = useId()

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <label htmlFor={id} className="text-label-sm text-muted-foreground">
        {label}
      </label>
      <input id={id} aria-invalid={invalid || undefined} className={cn(control, '[color-scheme:dark]')} {...props} />
    </div>
  )
}
