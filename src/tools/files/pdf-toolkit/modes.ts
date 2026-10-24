export const THUMB_GRID = 'grid grid-cols-2 gap-3 @[420px]:grid-cols-3 @[640px]:grid-cols-4 @[880px]:grid-cols-5 @[1100px]:grid-cols-6'

/** One tray shape for every thumbnail, so portrait, landscape and turned pages keep the grid aligned. */
export const THUMB_TRAY = 'relative flex aspect-[4/5] items-center justify-center rounded-lg bg-muted/50 p-2'

/** Fits a page with this width-to-height ratio inside `THUMB_TRAY`. */
export function trayFit(ratio: number): string {
  return ratio <= 4 / 5 ? 'h-full w-auto max-w-full' : 'h-auto w-full max-h-full'
}
