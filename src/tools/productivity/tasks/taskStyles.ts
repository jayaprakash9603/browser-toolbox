import type { ProjectColor, TaskPriority } from '@/core/tasks/model'
import type { ParsedKind } from '@/core/tasks/parse'

import type { DueTone } from './logic'

interface PriorityStyle {
  /** Checkbox outline. */
  ring: string
  /** Checkbox fill when done. */
  fill: string
  /** Tinted inside of an open checkbox. */
  soft: string
  text: string
}

export const PRIORITY_STYLES: Record<TaskPriority, PriorityStyle> = {
  1: {
    ring: 'border-red-500 dark:border-red-400',
    fill: 'bg-red-500 dark:bg-red-400',
    soft: 'bg-red-500/10',
    text: 'text-red-600 dark:text-red-400',
  },
  2: {
    ring: 'border-orange-500 dark:border-orange-400',
    fill: 'bg-orange-500 dark:bg-orange-400',
    soft: 'bg-orange-500/10',
    text: 'text-orange-600 dark:text-orange-400',
  },
  3: {
    ring: 'border-blue-500 dark:border-blue-400',
    fill: 'bg-blue-500 dark:bg-blue-400',
    soft: 'bg-blue-500/10',
    text: 'text-blue-600 dark:text-blue-400',
  },
  4: {
    ring: 'border-muted-foreground/45',
    fill: 'bg-muted-foreground',
    soft: 'bg-transparent',
    text: 'text-muted-foreground',
  },
}

export const PROJECT_COLOR_STYLES: Record<ProjectColor, { dot: string; text: string; soft: string }> = {
  red: { dot: 'bg-red-500', text: 'text-red-600 dark:text-red-400', soft: 'bg-red-500/10' },
  orange: { dot: 'bg-orange-500', text: 'text-orange-600 dark:text-orange-400', soft: 'bg-orange-500/10' },
  amber: { dot: 'bg-amber-500', text: 'text-amber-600 dark:text-amber-400', soft: 'bg-amber-500/10' },
  green: { dot: 'bg-emerald-500', text: 'text-emerald-600 dark:text-emerald-400', soft: 'bg-emerald-500/10' },
  teal: { dot: 'bg-teal-500', text: 'text-teal-600 dark:text-teal-400', soft: 'bg-teal-500/10' },
  sky: { dot: 'bg-sky-500', text: 'text-sky-600 dark:text-sky-400', soft: 'bg-sky-500/10' },
  blue: { dot: 'bg-blue-500', text: 'text-blue-600 dark:text-blue-400', soft: 'bg-blue-500/10' },
  violet: { dot: 'bg-violet-500', text: 'text-violet-600 dark:text-violet-400', soft: 'bg-violet-500/10' },
  pink: { dot: 'bg-pink-500', text: 'text-pink-600 dark:text-pink-400', soft: 'bg-pink-500/10' },
  gray: { dot: 'bg-zinc-400', text: 'text-zinc-600 dark:text-zinc-400', soft: 'bg-zinc-500/10' },
}

export const DUE_TONE_STYLES: Record<DueTone, string> = {
  overdue: 'text-red-600 dark:text-red-400',
  today: 'text-emerald-600 dark:text-emerald-400',
  tomorrow: 'text-amber-600 dark:text-amber-400',
  week: 'text-violet-600 dark:text-violet-400',
  later: 'text-muted-foreground',
}

/** Inline highlight behind recognised words in the quick-add field. */
export const TOKEN_STYLES: Record<ParsedKind, string> = {
  date: 'bg-emerald-500/15 ring-emerald-500/25',
  priority: 'bg-red-500/15 ring-red-500/25',
  project: 'bg-primary/15 ring-primary/25',
  label: 'bg-violet-500/15 ring-violet-500/25',
}

export const LABEL_TEXT = 'text-violet-600 dark:text-violet-400'

/** Colors for the celebration burst; text color drives `currentColor`. */
export const CONFETTI_COLORS = [
  'text-red-500',
  'text-orange-400',
  'text-amber-400',
  'text-emerald-500',
  'text-sky-500',
  'text-violet-500',
  'text-pink-500',
  'text-primary',
]
