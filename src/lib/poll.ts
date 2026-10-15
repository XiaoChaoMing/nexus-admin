/** Admin lists that other admins or users can change are asked again every 30 s (NXL-F NF-Q9). */
export const POLL_INTERVAL_MS = 30_000

/** safety-svc answers 202 and the owning service applies the action within ~2 s (TSD GĐ5 S5–S7). */
export const SETTLE_DELAYS_MS = [1_500, 4_000] as const
