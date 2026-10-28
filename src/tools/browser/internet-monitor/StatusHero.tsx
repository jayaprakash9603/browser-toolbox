import { CheckIcon, ClipboardCopyIcon, CopyIcon, GaugeIcon, GlobeIcon, RadarIcon, TimerIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  formatClockDuration,
  formatLatency,
  latencyGrade,
  latencyHealth,
  type NetLive,
  type NetMonitorSettings,
  type NetSample,
} from '@/core/netmon'
import { StatusDot, StatusIconTile } from '@/features/netmon/components/StatusBadge'
import { latencyGradeColor, statusColor } from '@/features/netmon/statusStyle'
import { useNow } from '@/features/netmon/hooks'
import { useLiveStatusLabel } from '@/features/netmon/useLiveStatusLabel'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import { Sparkline } from './Sparkline'
import { Fact } from './ui'

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

export function StatusHero({
  live,
  settings,
  samples,
}: {
  live: NetLive | null
  settings: NetMonitorSettings
  samples: NetSample[]
}) {
  const { t } = useTranslation()
  const now = useNow()
  const reduceMotion = useReducedMotion()
  const label = useLiveStatusLabel(live)
  const [copied, setCopied] = useState<'ip' | 'snap' | null>(null)
  const status = live?.status ?? null
  const color = statusColor(status)
  const health = useMemo(() => latencyHealth(samples.slice(-120)), [samples])
  const grade = latencyGrade(live?.latency ?? health.avg)
  const warn =
    settings.latencyWarnMs > 0 && live?.latency != null && live.latency >= settings.latencyWarnMs

  const markCopied = (kind: 'ip' | 'snap') => {
    setCopied(kind)
    window.setTimeout(() => setCopied(null), 1400)
  }

  const copySnapshot = () => {
    const lines = [
      `${t('tools.browser.internet-monitor.name')} — ${label}`,
      `${t('netmon.hero.latency')}: ${formatLatency(live?.latency ?? null)} (${t(`netmon.grade.${grade}`)})`,
      `${t('netmon.hero.ip')}: ${settings.showIp ? (live?.ip ?? '—') : t('netmon.hero.hidden')}`,
      `${t('netmon.hero.target')}: ${hostOf(settings.pingUrl)}`,
      `${t('netmon.settings.interval')}: ${t('netmon.hero.every', { count: settings.intervalSec })}`,
      `${t('netmon.realtime.p95')}: ${formatLatency(health.p95)} · ${t('netmon.realtime.jitter')}: ${formatLatency(health.jitter)}`,
    ]
    void navigator.clipboard.writeText(lines.join('\n')).then(() => markCopied('snap'))
  }

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-card p-4 shadow-xs">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        animate={{
          background: `radial-gradient(120% 90% at 0% 0%, color-mix(in srgb, ${color} 18%, transparent), transparent 62%)`,
        }}
        transition={{ duration: reduceMotion ? 0 : 0.5 }}
      />
      <div className="relative flex items-center gap-3">
        <StatusIconTile status={status} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusDot status={status} pulse={status === 'online' || status === 'offline'} />
            <motion.p
              key={label}
              initial={reduceMotion ? false : { opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="truncate text-lg leading-tight font-semibold"
              style={{ color }}
              aria-live="polite"
            >
              {label}
            </motion.p>
            <span
              className="rounded-full border px-2 py-0.5 text-[10px] font-medium"
              style={{
                color: latencyGradeColor(grade),
                borderColor: `color-mix(in srgb, ${latencyGradeColor(grade)} 35%, transparent)`,
                backgroundColor: `color-mix(in srgb, ${latencyGradeColor(grade)} 12%, transparent)`,
              }}
            >
              {t(`netmon.grade.${grade}`)}
            </span>
            {warn && (
              <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:text-amber-200">
                {t('netmon.hero.highLatency', { ms: settings.latencyWarnMs })}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {live ? t('netmon.hero.for', { duration: formatClockDuration(now - live.since) }) : '\u00a0'}
          </p>
        </div>
        <div className="hidden shrink-0 flex-col items-end gap-1 @[480px]:flex">
          <Sparkline samples={samples} />
          <Button
            type="button"
            variant="ghost"
            size="xs"
            className="gap-1 text-[11px]"
            onClick={copySnapshot}
            aria-label={t('netmon.hero.copySnapshot')}
          >
            {copied === 'snap' ? <CheckIcon className="size-3.5" /> : <ClipboardCopyIcon className="size-3.5" />}
            {copied === 'snap' ? t('netmon.hero.copied') : t('netmon.hero.copySnapshot')}
          </Button>
        </div>
      </div>
      <dl className="relative mt-3 grid grid-cols-2 gap-2 @[520px]:grid-cols-4">
        <Fact icon={GaugeIcon} label={t('netmon.hero.latency')}>
          <span className={cn(warn && 'text-amber-700 dark:text-amber-300')}>
            {formatLatency(live?.latency ?? null)}
          </span>
        </Fact>
        <Fact icon={GlobeIcon} label={t('netmon.hero.ip')}>
          <span className="min-w-0 flex-1 truncate" title={live?.ip ?? undefined}>
            {settings.showIp ? (live?.ip ?? '—') : t('netmon.hero.hidden')}
          </span>
          {settings.showIp && live?.ip && (
            <button
              type="button"
              aria-label={t('netmon.copyIp')}
              className="-m-1 cursor-pointer rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              onClick={() => {
                void navigator.clipboard.writeText(live.ip!).then(() => markCopied('ip'))
              }}
            >
              {copied === 'ip' ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
            </button>
          )}
        </Fact>
        <Fact icon={RadarIcon} label={t('netmon.hero.target')}>
          <span className="truncate font-sans font-medium" title={settings.pingUrl}>
            {hostOf(settings.pingUrl)}
          </span>
        </Fact>
        <Fact icon={TimerIcon} label={t('netmon.settings.interval')}>
          {t('netmon.hero.every', { count: settings.intervalSec })}
        </Fact>
      </dl>
    </section>
  )
}
