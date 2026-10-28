import type { ComponentType } from 'react'
import {
  CheckCircle2Icon,
  CornerDownRightIcon,
  Link2OffIcon,
  LockIcon,
  ServerCrashIcon,
  TimerOffIcon,
  WifiOffIcon,
} from 'lucide-react'

import type { HealthGrade, LinkHealth, Speed } from '@/core/engines/linkChecker/report'

type IconType = ComponentType<{ className?: string; 'aria-hidden'?: boolean }>

interface Tone {
  icon: IconType
  /** Readable text colour on the soft background (4.5:1 in both themes). */
  text: string
  soft: string
  solid: string
  stroke: string
}

export const HEALTH_META: Record<LinkHealth, Tone> = {
  broken: {
    icon: Link2OffIcon,
    text: 'text-red-700 dark:text-red-400',
    soft: 'bg-red-500/12',
    solid: 'bg-red-500',
    stroke: 'stroke-red-500',
  },
  server: {
    icon: ServerCrashIcon,
    text: 'text-orange-700 dark:text-orange-400',
    soft: 'bg-orange-500/12',
    solid: 'bg-orange-500',
    stroke: 'stroke-orange-500',
  },
  timeout: {
    icon: TimerOffIcon,
    text: 'text-amber-700 dark:text-amber-400',
    soft: 'bg-amber-500/14',
    solid: 'bg-amber-500',
    stroke: 'stroke-amber-500',
  },
  network: {
    icon: WifiOffIcon,
    text: 'text-violet-700 dark:text-violet-400',
    soft: 'bg-violet-500/12',
    solid: 'bg-violet-500',
    stroke: 'stroke-violet-500',
  },
  blocked: {
    icon: LockIcon,
    text: 'text-slate-700 dark:text-slate-300',
    soft: 'bg-slate-500/12',
    solid: 'bg-slate-400',
    stroke: 'stroke-slate-400',
  },
  redirect: {
    icon: CornerDownRightIcon,
    text: 'text-sky-700 dark:text-sky-400',
    soft: 'bg-sky-500/12',
    solid: 'bg-sky-500',
    stroke: 'stroke-sky-500',
  },
  ok: {
    icon: CheckCircle2Icon,
    text: 'text-emerald-700 dark:text-emerald-400',
    soft: 'bg-emerald-500/12',
    solid: 'bg-emerald-500',
    stroke: 'stroke-emerald-500',
  },
}

export const GRADE_META: Record<HealthGrade | 'unknown', { text: string; stroke: string; glow: string }> = {
  healthy: { text: 'text-emerald-700 dark:text-emerald-400', stroke: 'stroke-emerald-500', glow: 'bg-emerald-500/15' },
  fair: { text: 'text-amber-700 dark:text-amber-400', stroke: 'stroke-amber-500', glow: 'bg-amber-500/15' },
  poor: { text: 'text-red-700 dark:text-red-400', stroke: 'stroke-red-500', glow: 'bg-red-500/15' },
  unknown: { text: 'text-muted-foreground', stroke: 'stroke-muted-foreground/40', glow: 'bg-muted' },
}

export const SPEED_TEXT: Record<Speed, string> = {
  fast: 'text-emerald-700 dark:text-emerald-400',
  moderate: 'text-amber-700 dark:text-amber-400',
  slow: 'text-red-700 dark:text-red-400',
}

/** `820 ms`, `14.2s` or `2m 05s`. */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)} ms`
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds.toFixed(1)}s`
  const whole = Math.round(seconds)
  return `${Math.floor(whole / 60)}m ${String(whole % 60).padStart(2, '0')}s`
}

export function displayUrl(href: string): { host: string; path: string } {
  try {
    const url = new URL(href)
    const path = `${url.pathname === '/' && !url.search ? '' : url.pathname}${url.search}${url.hash}`
    let decoded = path
    try {
      decoded = decodeURI(path)
    } catch {
      // Keep malformed escapes as written.
    }
    return { host: url.host.replace(/^www\./, ''), path: decoded }
  } catch {
    return { host: '', path: href }
  }
}
