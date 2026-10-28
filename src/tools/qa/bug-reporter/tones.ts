import type { Severity } from './report'

interface Tone {
  dot: string
  soft: string
  text: string
  border: string
}

export const SEVERITY_TONE: Record<Severity, Tone> = {
  blocker: {
    dot: 'bg-red-600',
    soft: 'bg-red-500/12',
    text: 'text-red-700 dark:text-red-300',
    border: 'border-red-500/45',
  },
  critical: {
    dot: 'bg-orange-500',
    soft: 'bg-orange-500/12',
    text: 'text-orange-700 dark:text-orange-300',
    border: 'border-orange-500/45',
  },
  major: {
    dot: 'bg-amber-500',
    soft: 'bg-amber-500/14',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-500/45',
  },
  minor: {
    dot: 'bg-sky-500',
    soft: 'bg-sky-500/12',
    text: 'text-sky-700 dark:text-sky-300',
    border: 'border-sky-500/45',
  },
  trivial: {
    dot: 'bg-slate-400',
    soft: 'bg-slate-500/12',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-500/40',
  },
}
