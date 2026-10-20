import { CheckIcon, CopyIcon, GaugeIcon, GlobeIcon, RadarIcon, TimerIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { formatClockDuration, formatLatency, type NetLive, type NetMonitorSettings } from '@/core/netmon'
import { StatusDot, StatusIconTile } from '@/features/netmon/components/StatusBadge'
import { statusColor } from '@/features/netmon/statusStyle'
import { useNow } from '@/features/netmon/hooks'
import { useLiveStatusLabel } from '@/features/netmon/useLiveStatusLabel'

import { Fact } from './ui'

function hostOf(url: string): string {
  try {
    return new URL(url).host
  } catch {
    return url
  }
}

export function StatusHero({ live, settings }: { live: NetLive | null; settings: NetMonitorSettings }) {
  const { t } = useTranslation()
  const now = useNow()
  const reduceMotion = useReducedMotion()
  const label = useLiveStatusLabel(live)
  const [copied, setCopied] = useState(false)
  const status = live?.status ?? null
  const color = statusColor(status)

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
          <div className="flex items-center gap-2">
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
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {live ? t('netmon.hero.for', { duration: formatClockDuration(now - live.since) }) : '\u00a0'}
          </p>
        </div>
      </div>
      <dl className="relative mt-3 grid grid-cols-2 gap-2 @[520px]:grid-cols-4">
        <Fact icon={GaugeIcon} label={t('netmon.hero.latency')}>
          {formatLatency(live?.latency ?? null)}
        </Fact>
        <Fact icon={GlobeIcon} label={t('netmon.hero.ip')}>
          <span className="min-w-0 flex-1 truncate" title={live?.ip ?? undefined}>
            {settings.showIp ? (live?.ip ?? '—') : t('netmon.hero.hidden')}
          </span>
          {settings.showIp && live?.ip && (
            <button
              type="button"
              aria-label={t('netmon.copyIp')}
              className="-m-1 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              onClick={() => {
                void navigator.clipboard.writeText(live.ip!).then(() => {
                  setCopied(true)
                  setTimeout(() => setCopied(false), 1200)
                })
              }}
            >
              {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
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
