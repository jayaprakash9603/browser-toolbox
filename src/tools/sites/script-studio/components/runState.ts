import { AlertCircleIcon, CheckCircle2Icon, CircleOffIcon, PauseCircleIcon, RotateCwIcon, ShieldAlertIcon, type LucideIcon } from 'lucide-react'

import type { ScriptRecord, ScriptRun } from '@/core/script-studio'

export type RunState = 'error' | 'ran' | 'reload' | 'off' | 'paused' | 'setup'

export const RUN_STATE_ORDER: Record<RunState, number> = { error: 0, ran: 1, reload: 2, setup: 3, paused: 4, off: 5 }

export const RUN_STATE_STYLE: Record<RunState, { icon: LucideIcon; tone: string; dot: string; bar: string }> = {
  ran: {
    icon: CheckCircle2Icon,
    tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    dot: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
  },
  error: {
    icon: AlertCircleIcon,
    tone: 'bg-destructive/10 text-destructive',
    dot: 'text-destructive',
    bar: 'bg-destructive',
  },
  reload: {
    icon: RotateCwIcon,
    tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    dot: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500',
  },
  setup: {
    icon: ShieldAlertIcon,
    tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    dot: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500',
  },
  paused: {
    icon: PauseCircleIcon,
    tone: 'bg-muted text-muted-foreground',
    dot: 'text-muted-foreground',
    bar: 'bg-muted-foreground/40',
  },
  off: {
    icon: CircleOffIcon,
    tone: 'bg-muted text-muted-foreground',
    dot: 'text-muted-foreground',
    bar: 'bg-muted-foreground/25',
  },
}

/**
 * A recorded run wins over the current toggle: a script switched off after it ran is still active in the
 * page until reload, and the user needs to see that.
 */
export function deriveRunState(
  record: ScriptRecord,
  run: ScriptRun | undefined,
  globalEnabled: boolean,
  operational: boolean,
): RunState {
  if (run) return run.status === 'error' ? 'error' : 'ran'
  if (!globalEnabled) return 'paused'
  if (!record.enabled) return 'off'
  if (!operational) return 'setup'
  return 'reload'
}

/** True when the page differs from what the current settings would produce until it is reloaded. */
export function needsReload(record: ScriptRecord, run: ScriptRun | undefined, state: RunState, globalEnabled: boolean): boolean {
  if (state === 'reload') return true
  return Boolean(run) && (!record.enabled || !globalEnabled)
}

export function formatAgo(ts: number, now: number, locale?: string): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto', style: 'short' })
  const sec = Math.round((ts - now) / 1000)
  if (Math.abs(sec) < 45) return rtf.format(0, 'second')
  const min = Math.round(sec / 60)
  if (Math.abs(min) < 60) return rtf.format(min, 'minute')
  const hr = Math.round(min / 60)
  if (Math.abs(hr) < 24) return rtf.format(hr, 'hour')
  return rtf.format(Math.round(hr / 24), 'day')
}

export function formatDuration(ms: number): string {
  if (ms < 1) return '<1 ms'
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`
}
