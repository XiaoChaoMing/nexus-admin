import { useId, useState, type FormEvent } from 'react'
import { SearchIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type SearchFormProps = {
  label: string
  placeholder: string
  submitLabel: string
  value: string
  onSearch: (q: string) => void
}

/**
 * Admin/Lookup: a large search field submitted with Enter or the button (no suggestions while typing). `value` seeds
 * the field; key the form by it so Back / forward refills it.
 */
export function SearchForm({ label, placeholder, submitLabel, value, onSearch }: SearchFormProps) {
  const id = useId()
  const [draft, setDraft] = useState(value)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    onSearch(draft.trim())
  }

  return (
    <form role="search" onSubmit={submit} className="flex min-w-0 flex-1 flex-col gap-1">
      <label htmlFor={id} className="text-label-sm text-muted-foreground">
        {label}
      </label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle-foreground" aria-hidden />
          <Input id={id} type="search" value={draft} maxLength={60} placeholder={placeholder} className="pl-9" onChange={(e) => setDraft(e.target.value)} />
        </div>
        <Button type="submit" variant="secondary">
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
