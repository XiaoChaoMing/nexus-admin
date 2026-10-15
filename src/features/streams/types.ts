/** `GET /v1/streams?status=live` item (stream-svc): LIVE and INTERRUPTED broadcasts, 18+ included. */
export type LiveStream = {
  id: string
  channelId: string
  title: string
  isMature: boolean
  status: 'LIVE' | 'INTERRUPTED' | 'ENDED'
  startedAt: string | null
  thumbnailUrl: string
  channel?: { id: string; handle: string; displayName: string; avatarUrl: string | null } | null
  viewerCount?: number | null
  category?: { id: string } | null
}

export type LiveStreamPage = { items: LiveStream[]; nextCursor: string | null }

/** `GET /v1/categories` (channel-svc): only what the table shows. */
export type Category = { id: string; slug: string; name: string }
