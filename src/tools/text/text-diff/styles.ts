import type { RowKind } from '@/core/engines/diff'

export const ROW_TINT: Record<RowKind, string> = {
  same: '',
  minor: 'bg-sky-500/[0.07] text-sky-900 dark:text-sky-100',
  changed: 'bg-red-500/[0.08]',
  left: 'bg-violet-500/[0.11]',
  right: 'bg-violet-500/[0.11]',
}

export const LINE_NUMBER_TINT: Record<RowKind, string> = {
  same: 'text-muted-foreground/60',
  minor: 'text-sky-600/80 dark:text-sky-400/80',
  changed: 'text-red-600/80 dark:text-red-400/80',
  left: 'text-violet-600/80 dark:text-violet-400/80',
  right: 'text-violet-600/80 dark:text-violet-400/80',
}

export const RAIL_TINT: Record<RowKind, string> = {
  same: '',
  minor: 'bg-sky-500/70',
  changed: 'bg-red-500/80',
  left: 'bg-violet-500/80',
  right: 'bg-violet-500/80',
}

/** Swatch colors shared by the legend, overview map and status counts. */
export const SWATCH = {
  changed: 'bg-red-500',
  orphan: 'bg-violet-500',
  minor: 'bg-sky-500',
} as const

export const MISSING_LINE =
  'bg-[repeating-linear-gradient(135deg,transparent_0_5px,color-mix(in_oklab,var(--color-border)_80%,transparent)_5px_6px)]'

export const SEGMENT_TINT = {
  diff: 'rounded-[2px] bg-red-500/25 text-red-950 dark:bg-red-500/35 dark:text-red-50',
  minor: 'rounded-[2px] bg-sky-500/20 dark:bg-sky-400/25',
} as const
