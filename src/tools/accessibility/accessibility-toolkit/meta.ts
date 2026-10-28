import {
  BracesIcon,
  CaptionsIcon,
  CircleCheckIcon,
  CircleXIcon,
  ContrastIcon,
  FileTextIcon,
  ImageIcon,
  InfoIcon,
  KeyboardIcon,
  LinkIcon,
  ListTreeIcon,
  TextCursorInputIcon,
  TriangleAlertIcon,
  type LucideIcon,
} from 'lucide-react'

import type { A11yCategory, A11yGrade, A11yReport, A11ySeverity } from '@/core/engines/a11y'

export const CATEGORY_ICON: Record<A11yCategory, LucideIcon> = {
  images: ImageIcon,
  links: LinkIcon,
  forms: TextCursorInputIcon,
  structure: ListTreeIcon,
  visual: ContrastIcon,
  keyboard: KeyboardIcon,
  aria: BracesIcon,
  media: CaptionsIcon,
  document: FileTextIcon,
}

export const SEVERITY_ICON: Record<A11ySeverity, LucideIcon> = {
  error: CircleXIcon,
  warning: TriangleAlertIcon,
  notice: InfoIcon,
}

export const PASS_ICON = CircleCheckIcon

interface Tone {
  text: string
  soft: string
  border: string
  bar: string
}

export const SEVERITY_TONE: Record<A11ySeverity | 'pass', Tone> = {
  error: {
    text: 'text-rose-600 dark:text-rose-400',
    soft: 'bg-rose-500/10',
    border: 'border-l-rose-500',
    bar: 'bg-rose-500',
  },
  warning: {
    text: 'text-amber-600 dark:text-amber-400',
    soft: 'bg-amber-500/10',
    border: 'border-l-amber-500',
    bar: 'bg-amber-500',
  },
  notice: {
    text: 'text-sky-600 dark:text-sky-400',
    soft: 'bg-sky-500/10',
    border: 'border-l-sky-500',
    bar: 'bg-sky-500',
  },
  pass: {
    text: 'text-emerald-600 dark:text-emerald-400',
    soft: 'bg-emerald-500/10',
    border: 'border-l-emerald-500',
    bar: 'bg-emerald-500',
  },
}

export const GRADE_STYLE: Record<A11yGrade, { from: string; to: string; glow: string; chip: string }> = {
  great: { from: '#10b981', to: '#22c55e', glow: 'bg-emerald-400/40', chip: 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300' },
  good: { from: '#14b8a6', to: '#84cc16', glow: 'bg-teal-400/35', chip: 'bg-teal-500/12 text-teal-700 dark:text-teal-300' },
  fair: { from: '#f59e0b', to: '#f97316', glow: 'bg-amber-400/35', chip: 'bg-amber-500/12 text-amber-700 dark:text-amber-300' },
  poor: { from: '#f43f5e', to: '#ef4444', glow: 'bg-rose-400/35', chip: 'bg-rose-500/12 text-rose-700 dark:text-rose-300' },
}

/** Worst severity among a category's failing rules, for the tile accent. */
export function categoryTone(summary: A11yReport['categories'][number]): A11ySeverity | 'pass' | 'na' {
  if (summary.errors) return 'error'
  if (summary.warnings) return 'warning'
  if (summary.notices) return 'notice'
  return summary.passed ? 'pass' : 'na'
}
