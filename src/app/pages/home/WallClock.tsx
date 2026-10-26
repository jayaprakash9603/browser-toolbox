import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useState, type CSSProperties } from 'react'

import { cn } from '@/shared/utils/cn'

interface Phase {
  /** Seconds already elapsed in each hand's cycle. */
  second: number
  minute: number
  hour: number
}

const PERIOD = { second: 60, minute: 3600, hour: 43200 } as const
type HandKind = keyof typeof PERIOD

function phaseAt(date: Date): Phase {
  const s = date.getSeconds() + date.getMilliseconds() / 1000
  const m = date.getMinutes() * 60 + s
  return { second: s, minute: m, hour: (date.getHours() % 12) * 3600 + m }
}

const angle = (phase: Phase, kind: HandKind) => (phase[kind] / PERIOD[kind]) * 360

const HAND_STYLE: Record<HandKind, string> = {
  hour: 'top-[27%] bottom-[45%] w-[3px] bg-foreground',
  minute: 'top-[14%] bottom-[45%] w-[2px] bg-foreground/85',
  second: 'top-[10%] bottom-[36%] w-px bg-[var(--hero-from)]',
}

const INTRO_DELAY: Record<HandKind, number> = { hour: 0.05, minute: 0.12, second: 0.2 }

const TICKS = Array.from({ length: 12 }, (_, i) => i)

function Hand({
  kind,
  phase,
  staticAngle,
  animated,
  intro,
}: {
  kind: HandKind
  phase: Phase
  staticAngle: number
  animated: boolean
  intro: boolean
}) {
  const spin: CSSProperties = animated
    ? { animationDuration: `${PERIOD[kind]}s`, animationDelay: `-${phase[kind]}s` }
    : { transform: `rotate(${staticAngle}deg)` }
  return (
    <motion.div
      aria-hidden
      className="absolute inset-0"
      // Hands start at 12 and spring into the current time; the CSS spin underneath keeps running.
      initial={intro ? { rotate: -angle(phase, kind) } : false}
      animate={{ rotate: 0 }}
      transition={{ type: 'spring', stiffness: 70, damping: 14, mass: 0.9, delay: INTRO_DELAY[kind] }}
    >
      <div className={cn('absolute inset-0', animated && 'clock-hand')} style={spin}>
        <span
          className={cn(
            'absolute left-1/2 -translate-x-1/2 rounded-full',
            HAND_STYLE[kind],
            kind === 'second' && 'shadow-[0_0_6px_var(--hero-from)]',
          )}
        />
      </div>
    </motion.div>
  )
}

/** Analog wall clock: compositor-driven hands with a sweeping seconds ring and a pulse each minute. */
export function WallClock({ now, className }: { now: Date; className?: string }) {
  const reduce = useReducedMotion()
  const animated = !reduce
  const [phase, setPhase] = useState(() => phaseAt(new Date()))
  const [sync, setSync] = useState(0)

  // Re-phase after the panel was hidden (sleep, background tab) so the hands never drift.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      setPhase(phaseAt(new Date()))
      setSync((n) => n + 1)
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [])

  const staticPhase = useMemo(() => phaseAt(now), [now])
  const minuteKey = `${now.getHours()}:${now.getMinutes()}`

  return (
    <motion.div
      aria-hidden
      className={cn('relative size-[46px] shrink-0 rounded-full', className)}
      whileHover={reduce ? undefined : { rotate: [0, -7, 5, -3, 1, 0], transition: { duration: 0.7, ease: 'easeOut' } }}
    >
      <AnimatePresence initial={false}>
        <motion.span
          key={minuteKey}
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-[var(--hero-from)]"
          initial={{ scale: 1, opacity: 0.6 }}
          animate={{ scale: 1.45, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.9, ease: [0.2, 0.8, 0.2, 1] }}
        />
      </AnimatePresence>

      <div
        className="absolute inset-0 rounded-full shadow-[inset_0_1px_3px_rgb(0_0_0/0.25),0_2px_8px_-2px_rgb(0_0_0/0.35)] ring-1 ring-border"
        style={{
          background:
            'radial-gradient(circle at 32% 26%, color-mix(in srgb, var(--hero-from) 18%, var(--background)) 0%, var(--background) 72%)',
        }}
      />

      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90">
        <defs>
          <linearGradient id="wall-clock-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: 'var(--hero-from)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--hero-to)' }} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r="47" fill="none" stroke="currentColor" strokeWidth="3" className="text-border/60" />
        <circle
          key={sync}
          cx="50"
          cy="50"
          r="47"
          fill="none"
          stroke="url(#wall-clock-ring)"
          strokeWidth="3"
          strokeLinecap="round"
          pathLength={100}
          strokeDasharray="100"
          className={cn(animated && 'clock-ring')}
          style={
            animated
              ? { animationDelay: `-${phase.second}s` }
              : { strokeDashoffset: 100 - (staticPhase.second / 60) * 100 }
          }
        />
      </svg>

      <svg viewBox="0 0 100 100" className="absolute inset-0 size-full">
        {TICKS.map((i) => {
          const major = i % 3 === 0
          return (
            <line
              key={i}
              x1="50"
              y1={major ? 9 : 11}
              x2="50"
              y2={major ? 19 : 16}
              stroke="currentColor"
              strokeWidth={major ? 3.2 : 1.8}
              strokeLinecap="round"
              transform={`rotate(${i * 30} 50 50)`}
              className={i === 0 ? 'text-[var(--hero-from)]' : major ? 'text-foreground/70' : 'text-muted-foreground/45'}
            />
          )
        })}
      </svg>

      <div key={sync} className="absolute inset-0">
        <Hand kind="hour" phase={phase} staticAngle={angle(staticPhase, 'hour')} animated={animated} intro={animated && sync === 0} />
        <Hand kind="minute" phase={phase} staticAngle={angle(staticPhase, 'minute')} animated={animated} intro={animated && sync === 0} />
        {animated && <Hand kind="second" phase={phase} staticAngle={0} animated intro={sync === 0} />}
      </div>

      <span className="absolute top-1/2 left-1/2 size-[6px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--hero-from)] ring-[1.5px] ring-background" />
    </motion.div>
  )
}

/** Digital readout where only the digits that changed roll over, odometer-style. */
export function RollingTime({ time, className }: { time: string; className?: string }) {
  const reduce = useReducedMotion()
  const chars = time.split('')
  return (
    <span className={cn('inline-flex', className)}>
      {chars.map((char, i) => {
        const slot = chars.length - i
        if (char === ':') {
          return (
            <span key={`slot-${slot}`} className="clock-colon px-px">
              :
            </span>
          )
        }
        return (
          <span key={`slot-${slot}`} className="relative inline-grid overflow-hidden">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={char}
                initial={reduce ? { opacity: 0 } : { y: '90%', opacity: 0, filter: 'blur(3px)', scale: 0.85 }}
                animate={{ y: 0, opacity: 1, filter: 'blur(0px)', scale: 1 }}
                exit={reduce ? { opacity: 0 } : { y: '-90%', opacity: 0, filter: 'blur(3px)', scale: 0.85 }}
                transition={
                  reduce
                    ? { duration: 0.2 }
                    : { type: 'spring', stiffness: 380, damping: 26, delay: (slot - 1) * 0.06 }
                }
                className="col-start-1 row-start-1"
              >
                {char}
              </motion.span>
            </AnimatePresence>
          </span>
        )
      })}
    </span>
  )
}
