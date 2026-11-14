export const RECORDER_COUNTDOWN_SECONDS = 3
export const RECORDER_COUNTDOWN_MS = RECORDER_COUNTDOWN_SECONDS * 1000

/**
 * Time after the on-page 3-2-1 overlay is removed before MediaRecorder starts.
 * Needs a couple of compositor frames so the overlay is not in the first captured frames.
 */
export const RECORDER_COUNTDOWN_SETTLE_MS = 350

/** Delay from now until capture should start, overlay already scheduled to unmount at `countdownUntil`. */
export function recorderPreRollDelayMs(countdownUntil: number | undefined, now: number): number {
  if (!countdownUntil) return 0
  return Math.max(0, countdownUntil - now) + RECORDER_COUNTDOWN_SETTLE_MS
}
