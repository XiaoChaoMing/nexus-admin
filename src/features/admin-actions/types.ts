/** Who did something, as safety-svc names people (`Ref`). */
export type PersonRef = { id: string; username: string }

/** `202 {actionId}` of every safety-svc admin action (TSD GĐ5 §5.4). */
export type ActionAccepted = { actionId: string }

/** Lock durations offered by the spec (24 h · 7 days · 30 days); null locks until an admin unlocks. */
export const LOCK_DURATIONS = [24, 168, 720, null] as const
export type LockDuration = (typeof LOCK_DURATIONS)[number]

/** Chat timeout presets for report resolution, in seconds (1 minute … 1 day; the server allows up to 14 days). */
export const TIMEOUT_DURATIONS = [60, 600, 3_600, 86_400] as const
export type TimeoutDuration = (typeof TIMEOUT_DURATIONS)[number]

/** `GET /v1/streams/{id}` fields the admin console needs (stream-svc). */
export type StreamRef = {
  id: string
  channelId: string
  title: string
  status: string
}
