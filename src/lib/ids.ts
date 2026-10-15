const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID.test(value.trim())
}

/** Absolute URL of a path of the user web app (report targets link to `/live/{id}`, `/{handle}`). */
export function webAppUrl(path: string): string {
  const base = (import.meta.env.VITE_WEB_APP_URL as string | undefined) || 'http://localhost:5173'

  return new URL(path, base).toString()
}
