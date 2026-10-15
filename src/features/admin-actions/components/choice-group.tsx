import { useId } from 'react'
import { cn } from '@/lib/utils'

export type Choice<V> = { value: V; label: string; hint?: string }

type ChoiceGroupProps<V> = {
  legend: string
  value: V
  choices: Choice<V>[]
  onChange: (value: V) => void
  /** Pills in a row (durations) instead of a stacked list (actions). */
  inline?: boolean
  disabled?: boolean
}

/** Native radio group (keyboard: arrows move, Space selects), styled as Obsidian Pulse options. */
export function ChoiceGroup<V extends string | number | null>({ legend, value, choices, onChange, inline = false, disabled }: ChoiceGroupProps<V>) {
  const name = useId()

  return (
    <fieldset className="flex flex-col gap-2" disabled={disabled}>
      <legend className="mb-2 text-label-md text-foreground">{legend}</legend>
      <div className={cn(inline ? 'flex flex-wrap gap-2' : 'flex flex-col gap-1.5')}>
        {choices.map((c) => {
          const checked = c.value === value
          return (
            <label
              key={String(c.value)}
              className={cn(
                'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2 text-body-md transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-ring',
                checked ? 'border-primary bg-card text-foreground' : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <input
                type="radio"
                name={name}
                checked={checked}
                onChange={() => onChange(c.value)}
                className="mt-0.5 size-4 shrink-0 accent-(--primary) outline-none"
              />
              <span className="flex flex-col">
                <span className={cn(checked && 'font-semibold')}>{c.label}</span>
                {c.hint && <span className="text-body-sm text-subtle-foreground">{c.hint}</span>}
              </span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
