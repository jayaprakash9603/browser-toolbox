/** Formats a whole-second elapsed time as `45s` or `2m 05s`. */
export function formatElapsedSeconds(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  return `${minutes}m ${String(seconds % 60).padStart(2, '0')}s`
}
