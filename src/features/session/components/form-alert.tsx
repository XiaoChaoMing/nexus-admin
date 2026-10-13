import { CircleAlertIcon } from 'lucide-react'

export function FormAlert({ message }: { message: string | null | undefined }) {
  if (!message) return null

  return (
    <div role="alert" className="mb-4 flex gap-2 rounded-control border border-destructive/60 bg-destructive/10 px-3 py-2.5 text-body-md text-foreground">
      <CircleAlertIcon className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
      {message}
    </div>
  )
}
