export const HOME = '/creator-applications'

/** Where to go after login: only internal paths ("/x", never "//host" or "/login"). */
export function safeReturnTo(state: unknown): string {
  const from = (state as { from?: unknown } | null)?.from
  if (typeof from !== 'string' || !from.startsWith('/') || from.startsWith('//') || from.startsWith('/login')) return HOME

  return from
}
