import { AnimatePresence, motion, useReducedMotion, useSpring, useTransform } from 'motion/react'
import { useEffect, useId } from 'react'
import { useTranslation } from 'react-i18next'

import { GAUGE_TICKS, formatMbps, gaugeFraction, type SpeedPhase } from '@/core/speedtest'
import { cn } from '@/shared/utils/cn'

import { phaseColor } from '../style'

const SIZE = 300
const C = SIZE / 2
const R = 122
const STROKE = 18
const START = -135
const SWEEP = 270

function polar(deg: number, r: number) {
  const rad = (deg * Math.PI) / 180
  return { x: C + r * Math.sin(rad), y: C - r * Math.cos(rad) }
}

function arc(r: number, from = START, to = START + SWEEP) {
  const a = polar(from, r)
  const b = polar(to, r)
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${b.x} ${b.y}`
}

function needlePath(fraction: number) {
  const deg = START + SWEEP * fraction
  const tip = polar(deg, R - STROKE - 6)
  const l = polar(deg - 90, 5)
  const r = polar(deg + 90, 5)
  return `M ${l.x} ${l.y} L ${tip.x} ${tip.y} L ${r.x} ${r.y} Z`
}

export function SpeedGauge({
  phase,
  mbps,
  pingMs,
  onStart,
  startLabel,
  className,
}: {
  phase: SpeedPhase
  mbps: number
  pingMs: number | null
  onStart: () => void
  startLabel: string
  className?: string
}) {
  const { t } = useTranslation()
  const reduceMotion = useReducedMotion()
  const gradientId = `speed-gauge-${useId().replace(/:/g, '')}`
  const measuring = phase === 'download' || phase === 'upload'
  const running = measuring || phase === 'latency'
  const color = phaseColor(phase)

  const spring = useSpring(0, { stiffness: 70, damping: 18, mass: 0.6 })
  useEffect(() => {
    const target = measuring ? gaugeFraction(mbps) : 0
    if (reduceMotion) spring.jump(target)
    else spring.set(target)
  }, [measuring, mbps, reduceMotion, spring])

  const dashOffset = useTransform(spring, (f) => 1 - f)
  // A zero-length dash still paints a round cap, so the fill is hidden until it has length.
  const fillOpacity = useTransform(spring, (f) => (f > 0.003 ? 1 : 0))
  const needle = useTransform(spring, needlePath)

  return (
    <div className={cn('relative mx-auto aspect-square w-full max-w-[300px]', className)}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="size-full overflow-visible" aria-hidden>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor={color} stopOpacity={0.55} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>
        <path d={arc(R)} fill="none" stroke="var(--muted)" strokeWidth={STROKE} strokeLinecap="round" />
        <motion.path
          d={arc(R)}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={STROKE}
          strokeLinecap="round"
          pathLength={1}
          strokeDasharray="1 2"
          style={{ strokeDashoffset: dashOffset, opacity: fillOpacity, filter: `drop-shadow(0 0 6px color-mix(in srgb, ${color} 45%, transparent))` }}
        />
        {GAUGE_TICKS.map((tick, i) => {
          const deg = START + (SWEEP * i) / (GAUGE_TICKS.length - 1)
          const p = polar(deg, R - STROKE - 16)
          const a = polar(deg, R + STROKE / 2 + 3)
          const b = polar(deg, R + STROKE / 2 + 8)
          return (
            <g key={tick}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="var(--border)" strokeWidth={2} strokeLinecap="round" />
              <text
                x={p.x}
                y={p.y}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-muted-foreground font-mono text-[11px] font-medium tabular-nums"
              >
                {i === GAUGE_TICKS.length - 1 ? `${tick}+` : tick}
              </text>
            </g>
          )
        })}
        <AnimatePresence>
          {measuring && (
            <motion.g
              key="needle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.15 } }}
            >
              <motion.path d={needle} fill={color} />
              <circle cx={C} cy={C} r={9} fill="var(--card)" stroke={color} strokeWidth={3} />
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      <div className="pointer-events-none absolute inset-x-0 bottom-[12%] flex flex-col items-center">
        <AnimatePresence mode="wait" initial={false}>
          {running && (
            <motion.div
              key={phase}
              initial={reduceMotion ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4, transition: { duration: 0.12 } }}
              className="flex flex-col items-center"
              aria-live="polite"
            >
              <span className="font-mono text-4xl leading-none font-bold tabular-nums" style={{ color }}>
                {phase === 'latency' ? (pingMs === null ? '…' : Math.round(pingMs)) : formatMbps(mbps)}
              </span>
              <span className="mt-1 text-xs font-medium text-muted-foreground">
                {phase === 'latency' ? t('speedtest.ms') : t('speedtest.unit')}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {!running && (
          <motion.div
            key="go"
            className="absolute inset-0 flex items-center justify-center"
            initial={reduceMotion ? false : { opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.15 } }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
          >
            <button
              type="button"
              onClick={onStart}
              aria-label={startLabel}
              className="group relative flex size-32 cursor-pointer items-center justify-center rounded-full focus-visible:ring-4 focus-visible:ring-ring/50 focus-visible:outline-none"
            >
              {!reduceMotion && (
                <motion.span
                  aria-hidden
                  className="absolute inset-0 rounded-full border-2 border-[var(--speed-down)]"
                  animate={{ scale: [1, 1.18], opacity: [0.55, 0] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
                />
              )}
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-[conic-gradient(from_200deg,var(--speed-down),var(--speed-up),var(--speed-down))] p-[3px] transition-transform duration-200 group-hover:scale-105 group-active:scale-95"
              >
                <span className="block size-full rounded-full bg-card" />
              </span>
              <span className="relative text-3xl font-bold tracking-wider transition-transform duration-200 group-hover:scale-105">
                {t('speedtest.go')}
              </span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
