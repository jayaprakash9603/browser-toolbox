import { ArrowUpRightIcon, CheckIcon, CopyIcon, GaugeIcon, GlobeIcon, type LucideIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Link } from '@/app/router'
import {
  downsampleSamples,
  formatAvailability,
  formatClockDuration,
  formatLatency,
  generalStats,
  outageSegments,
  type NetLive,
} from '@/core/netmon'
import { Button } from '@/shared/components/ui/button'

import { useNetEvents, useNetRealtime, useNow } from '../hooks'
import { netmonTabRoute, type NetmonTab } from '../routes'
import { useLiveStatusLabel } from '../useLiveStatusLabel'
import { LatencyChart } from './LatencyChart'
import { statusColor } from '../statusStyle'
import { StatusIconTile } from './StatusBadge'

const SPARK_SAMPLES = 60

export default function PopoverBody({ live, onNavigate }: { live: NetLive | null; onNavigate: () => void }) {
  const { t } = useTranslation()
  const now = useNow()
  const events = useNetEvents()
  const { samples } = useNetRealtime(live)
  const label = useLiveStatusLabel(live)
  const status = live?.status ?? null
  const color = statusColor(status)

  const today = useMemo(() => generalStats(events, now).today, [events, now])
  const spark = useMemo(() => {
    const recent = samples.slice(-SPARK_SAMPLES)
    const from = recent[0]?.at ?? now
    const to = recent.at(-1)?.at ?? now
    const points = downsampleSamples(recent, from, to, SPARK_SAMPLES)
    return { points, segments: outageSegments(points, to), from, to }
  }, [samples, now])

  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={{ show: { transition: { staggerChildren: 0.035, delayChildren: 0.04 } } }}
    >
      <Section
        className="p-3.5"
        style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${color} 16%, transparent), transparent 72%)` }}
      >
        <div className="flex items-center gap-3">
          <StatusIconTile status={status} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {t('netmon.popover.title')}
            </p>
            <p className="truncate text-[15px] leading-tight font-semibold" style={{ color }} aria-live="polite">
              {label}
            </p>
            {live && (
              <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                {t('netmon.hero.for', { duration: formatClockDuration(now - live.since) })}
              </p>
            )}
          </div>
        </div>
      </Section>

      <Section className="grid grid-cols-[2fr_3fr] gap-2 px-3.5">
        <Metric icon={GaugeIcon} label={t('netmon.hero.latency')} value={formatLatency(live?.latency ?? null)} />
        <IpMetric ip={live?.ip ?? null} />
      </Section>

      <Section className="px-3.5 pt-3">
        <p className="mb-1 text-[11px] text-muted-foreground">
          {t('netmon.popover.lastMinutes', { count: Math.min(SPARK_SAMPLES, samples.length) })}
        </p>
        <div className="rounded-lg border bg-muted/20 px-1 pt-1">
          {spark.points.length > 1 ? (
            <LatencyChart compact points={spark.points} segments={spark.segments} from={spark.from} to={spark.to} />
          ) : (
            <div className="flex h-14 items-center justify-center text-[11px] text-muted-foreground">
              {t('netmon.status.checking')}
            </div>
          )}
        </div>
      </Section>

      <Section className="px-3.5 pt-3">
        <p className="mb-1 text-[11px] text-muted-foreground">{t('netmon.popover.today')}</p>
        <div className="grid grid-cols-3 divide-x divide-border/70 rounded-xl border bg-muted/30 text-center">
          <Stat label={t('netmon.general.availability')} value={formatAvailability(today.availability)} />
          <Stat label={t('netmon.general.disconnects')} value={String(today.disconnects)} />
          <Stat label={t('netmon.general.downtime')} value={formatClockDuration(today.downtimeMs)} />
        </div>
      </Section>

      <Section className="flex items-center gap-1 p-3">
        {(['realtime', 'log', 'stats'] as NetmonTab[]).map((tab) => (
          <Button key={tab} asChild variant="ghost" size="sm" className="h-8 px-2 text-xs">
            <Link to={netmonTabRoute(tab)} onClick={onNavigate}>
              {t(`netmon.tab.${tab}`)}
            </Link>
          </Button>
        ))}
        <div className="flex-1" />
        <Button asChild size="sm" className="h-8 gap-1 px-2.5 text-xs">
          <Link to={netmonTabRoute('realtime')} onClick={onNavigate}>
            {t('netmon.popover.open')}
            <ArrowUpRightIcon className="size-3.5" aria-hidden />
          </Link>
        </Button>
      </Section>
    </motion.div>
  )
}

function Section({ className, style, children }: { className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <motion.div
      className={className}
      style={style}
      variants={{ hidden: { opacity: 0, y: 4 }, show: { opacity: 1, y: 0 } }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  )
}

function Metric({ icon: Icon, label, value, action }: { icon: LucideIcon; label: string; value: string; action?: ReactNode }) {
  return (
    <div className="min-w-0 rounded-xl border bg-card px-2.5 py-2">
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Icon className="size-3" aria-hidden />
        {label}
      </p>
      <div className="mt-0.5 flex items-center gap-1">
        <p className="min-w-0 flex-1 truncate font-mono text-[13px] font-semibold tabular-nums" title={value}>
          {value}
        </p>
        {action}
      </div>
    </div>
  )
}

function IpMetric({ ip }: { ip: string | null }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  return (
    <Metric
      icon={GlobeIcon}
      label={t('netmon.hero.ip')}
      value={ip ?? '—'}
      action={
        ip ? (
          <button
            type="button"
            className="-m-1 rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label={t('netmon.copyIp')}
            onClick={() => {
              void navigator.clipboard.writeText(ip).then(() => {
                setCopied(true)
                setTimeout(() => setCopied(false), 1200)
              })
            }}
          >
            {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
          </button>
        ) : null
      }
    />
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 px-1.5 py-2">
      <p className="truncate font-mono text-[13px] font-semibold tabular-nums">{value}</p>
      <p className="truncate text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}
