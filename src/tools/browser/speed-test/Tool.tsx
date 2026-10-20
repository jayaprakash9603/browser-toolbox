import {
  ActivityIcon,
  ArrowDownIcon,
  ArrowUpIcon,
  CheckIcon,
  GlobeIcon,
  InfoIcon,
  RotateCcwIcon,
  ServerIcon,
  SquareIcon,
  TriangleAlertIcon,
  WavesIcon,
  WifiIcon,
  type LucideIcon,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { formatMbps, speedRating, type SpeedPhase, type SpeedServer } from '@/core/speedtest'
import { SpeedGauge } from '@/features/speedtest/components/SpeedGauge'
import { SPEED_DOWN, SPEED_UP, phaseColor } from '@/features/speedtest/style'
import { useSpeedHistory, useSpeedTest, type SpeedTestState } from '@/features/speedtest/useSpeedTest'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import { useBrowserTool } from '../_shared'
import { Fact } from '../internet-monitor/ui'
import { HistoryPanel } from './HistoryPanel'
import { ThroughputChart } from './ThroughputChart'

const STEPS = ['latency', 'download', 'upload'] as const
const STEP_LABEL = { latency: 'speedtest.step.ping', download: 'speedtest.step.download', upload: 'speedtest.step.upload' }
const RATING_COLOR = { slow: 'var(--netmon-offline)', ok: 'var(--netmon-lan)', good: 'var(--netmon-online)', great: 'var(--netmon-online)' }

export default function SpeedTestTool() {
  const { t } = useTranslation()
  const tool = useBrowserTool('browser.speed-test')
  const { state, start, cancel, running } = useSpeedTest()
  const { history, clear } = useSpeedHistory()
  const finished = state.phase === 'done' || state.phase === 'error'

  return (
    <ToolPage
      tool={tool}
      actions={
        running ? (
          <Button variant="outline" size="sm" className="gap-1" onClick={cancel}>
            <SquareIcon className="size-3.5" aria-hidden />
            {t('speedtest.cancel')}
          </Button>
        ) : finished ? (
          <Button variant="outline" size="sm" className="gap-1" onClick={() => void start()}>
            <RotateCcwIcon className="size-3.5" aria-hidden />
            {t('speedtest.again')}
          </Button>
        ) : null
      }
    >
      <div className="flex flex-col gap-3">
        <SpeedHero state={state} onStart={() => void start()} />
        <ThroughputChart series={state.series} live={running} />
        <HistoryPanel history={history} onClear={() => void clear()} />
        <p className="flex gap-1.5 px-1 text-[11px] leading-relaxed text-muted-foreground">
          <InfoIcon className="mt-0.5 size-3 shrink-0" aria-hidden />
          {t('speedtest.note')}
        </p>
      </div>
    </ToolPage>
  )
}

function SpeedHero({ state, onStart }: { state: SpeedTestState; onStart: () => void }) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const color = phaseColor(state.phase)
  const rating = state.phase === 'done' ? speedRating(state.downloadMbps) : null
  const finished = state.phase === 'done' || state.phase === 'error'

  return (
    <section className="relative overflow-hidden rounded-2xl border bg-card p-4 shadow-xs">
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        animate={{
          background: `radial-gradient(90% 70% at 50% 45%, color-mix(in srgb, ${color} ${state.phase === 'idle' ? 8 : 16}%, transparent), transparent 70%)`,
        }}
        transition={{ duration: reduceMotion ? 0 : 0.6 }}
      />

      <div className="relative grid grid-cols-2 gap-2 @[520px]:grid-cols-4">
        <MetricTile
          icon={ActivityIcon}
          label={t('speedtest.metric.ping')}
          value={state.pingMs === null ? '—' : Math.round(state.pingMs).toString()}
          unit={t('speedtest.ms')}
          active={state.phase === 'latency'}
          color="var(--netmon-latency)"
        />
        <MetricTile
          icon={WavesIcon}
          label={t('speedtest.metric.jitter')}
          value={state.jitterMs === null ? '—' : state.jitterMs.toFixed(1)}
          unit={t('speedtest.ms')}
          active={state.phase === 'latency'}
          color="var(--netmon-latency)"
        />
        <MetricTile
          icon={ArrowDownIcon}
          label={t('speedtest.metric.download')}
          value={
            state.phase === 'download' ? formatMbps(state.liveMbps) : formatMbps(state.downloadMbps)
          }
          unit={t('speedtest.unit')}
          active={state.phase === 'download'}
          color={SPEED_DOWN}
        />
        <MetricTile
          icon={ArrowUpIcon}
          label={t('speedtest.metric.upload')}
          value={state.phase === 'upload' ? formatMbps(state.liveMbps) : formatMbps(state.uploadMbps)}
          unit={t('speedtest.unit')}
          active={state.phase === 'upload'}
          color={SPEED_UP}
        />
      </div>

      <div className="relative mt-2">
        <SpeedGauge
          phase={state.phase}
          mbps={state.liveMbps}
          pingMs={state.pingMs}
          onStart={onStart}
          startLabel={finished ? t('speedtest.again') : t('speedtest.start')}
        />
      </div>

      <div className="relative -mt-8 flex flex-col items-center gap-2">
        <AnimatePresence mode="wait" initial={false}>
          <motion.p
            key={state.phase}
            initial={reduceMotion ? false : { opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, transition: { duration: 0.1 } }}
            className="flex items-center gap-1.5 text-sm font-semibold"
            style={{ color: state.phase === 'error' ? 'var(--destructive)' : state.phase === 'idle' ? undefined : color }}
            aria-live="polite"
          >
            {state.phase === 'error' && <TriangleAlertIcon className="size-4" aria-hidden />}
            {state.phase === 'done' && <CheckIcon className="size-4" aria-hidden />}
            {t(`speedtest.phase.${state.phase}`)}
          </motion.p>
        </AnimatePresence>
        {state.phase === 'error' && (
          <p className="max-w-80 text-center text-xs text-muted-foreground">{t('speedtest.error.body')}</p>
        )}
        {rating && (
          <motion.span
            initial={reduceMotion ? false : { opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-full border px-2.5 py-0.5 text-xs font-medium"
            style={{
              color: RATING_COLOR[rating],
              borderColor: `color-mix(in srgb, ${RATING_COLOR[rating]} 40%, transparent)`,
              background: `color-mix(in srgb, ${RATING_COLOR[rating]} 10%, transparent)`,
            }}
          >
            {t(`speedtest.rating.${rating}`)}
          </motion.span>
        )}
        <PhaseStepper phase={state.phase} progress={state.progress} />
      </div>

      <ServerFacts server={state.server} />
    </section>
  )
}

function MetricTile({
  icon: Icon,
  label,
  value,
  unit,
  active,
  color,
}: {
  icon: LucideIcon
  label: string
  value: string
  unit: string
  active: boolean
  color: string
}) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-xl border bg-background/60 px-2.5 py-2 transition-[border-color,box-shadow] duration-300',
        active && 'shadow-sm',
      )}
      style={active ? { borderColor: color, boxShadow: `0 0 0 3px color-mix(in srgb, ${color} 18%, transparent)` } : undefined}
    >
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Icon className="size-3" style={{ color }} aria-hidden />
        {label}
      </p>
      <p className="mt-0.5 flex items-baseline gap-1">
        <span className="font-mono text-lg leading-tight font-semibold tabular-nums">{value}</span>
        <span className="text-[11px] text-muted-foreground">{unit}</span>
      </p>
    </div>
  )
}

function PhaseStepper({ phase, progress }: { phase: SpeedPhase; progress: number }) {
  const { t } = useTranslation()
  const current = STEPS.indexOf(phase as (typeof STEPS)[number])
  const done = phase === 'done'

  return (
    <ol className="mt-1 grid w-full max-w-sm grid-cols-3 gap-2" aria-label={t('speedtest.phase.idle')}>
      {STEPS.map((step, i) => {
        const fill = done || (current > i && current !== -1) ? 1 : current === i ? progress : 0
        const stepColor = step === 'latency' ? 'var(--netmon-latency)' : phaseColor(step)
        return (
          <li key={step} className="flex flex-col gap-1" aria-current={current === i ? 'step' : undefined}>
            <span className="h-1.5 overflow-hidden rounded-full bg-muted">
              <span
                className="block h-full origin-left rounded-full transition-transform duration-200 ease-linear"
                style={{ background: stepColor, transform: `scaleX(${fill})` }}
              />
            </span>
            <span
              className={cn(
                'text-center text-[11px] font-medium',
                current === i || fill === 1 ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {t(STEP_LABEL[step])}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

function ServerFacts({ server }: { server: SpeedServer | null }) {
  const { t } = useTranslation()
  const location = server ? [server.city, server.country].filter(Boolean).join(', ') : ''
  return (
    <dl className="relative mt-4 grid grid-cols-1 gap-2 @[520px]:grid-cols-3">
      <Fact icon={ServerIcon} label={t('speedtest.server.label')}>
        <span className="truncate font-sans font-medium" title={location || undefined}>
          {server
            ? `${t('speedtest.server.cloudflare')}${server.colo ? ` ${server.colo}` : ''}${location ? ` · ${location}` : ''}`
            : `${t('speedtest.server.cloudflare')} · ${t('speedtest.server.pending')}`}
        </span>
      </Fact>
      <Fact icon={WifiIcon} label={t('speedtest.server.provider')}>
        <span className="truncate font-sans font-medium" title={server?.isp}>
          {server?.isp ?? '—'}
        </span>
      </Fact>
      <Fact icon={GlobeIcon} label={t('speedtest.server.ip')}>
        <span className="truncate" title={server?.ip}>
          {server?.ip ?? '—'}
        </span>
      </Fact>
    </dl>
  )
}
