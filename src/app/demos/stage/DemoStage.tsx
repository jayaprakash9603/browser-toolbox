import { PauseIcon, PlayIcon } from 'lucide-react'
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import '@/app/demos/i18n'
import { cn } from '@/shared/utils/cn'

import { createApi, type Build } from './api'
import { useDemoHost } from './context'
import { gsap, MOTION_QUERIES, useGSAP } from './gsap'

interface DemoStageProps {
  /** Accessible summary of what the demo shows. */
  label: string
  /** One caption per `step(i)` label in the build. */
  steps: string[]
  build: Build
  children: ReactNode
  /** Design size; the canvas is scaled to fit, so demos look identical at every width. */
  width?: number
  height?: number
  className?: string
  glow?: boolean
  /** Seconds to rest between loops. */
  rest?: number
}

/**
 * Frame for a scripted tool demo: one GSAP timeline, played by the surrounding `DemoHost`.
 * Pauses offscreen, in hidden tabs, or on request, and shows the finished state under reduced motion.
 */
export function DemoStage({
  label,
  steps,
  build,
  children,
  width = 520,
  height = 420,
  className,
  glow = true,
  rest = 0.8,
}: DemoStageProps) {
  const { t } = useTranslation()
  const host = useDemoHost()
  const card = host.variant === 'card'
  const hostRef = useRef(host)
  const stepsRef = useRef(steps)
  const frameRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLDivElement>(null)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const gateRef = useRef({ user: true, visible: false, host: host.playing, reduced: false })
  const [scale, setScale] = useState(0)
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(true)

  useLayoutEffect(() => {
    hostRef.current = host
    stepsRef.current = steps
  })

  const sync = useCallback(() => {
    const tl = tlRef.current
    const gate = gateRef.current
    if (!tl || gate.reduced) return
    if (gate.user && gate.visible && gate.host && !document.hidden) tl.play()
    else tl.pause()
  }, [])

  useLayoutEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const update = () => setScale(Math.min(1.4, frame.clientWidth / width))
    update()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(update)
    observer.observe(frame)
    return () => observer.disconnect()
  }, [width])

  useEffect(() => {
    const frame = frameRef.current
    document.addEventListener('visibilitychange', sync)
    let observer: IntersectionObserver | undefined
    if (frame && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(([entry]) => {
        gateRef.current.visible = entry.isIntersecting
        sync()
      })
      observer.observe(frame)
    } else {
      gateRef.current.visible = true
      sync()
    }
    return () => {
      observer?.disconnect()
      document.removeEventListener('visibilitychange', sync)
    }
  }, [sync])

  useEffect(() => {
    gateRef.current.host = host.playing
    sync()
  }, [host.playing, sync])

  useGSAP(
    () => {
      const root = canvasRef.current
      if (!root) return
      const mm = gsap.matchMedia()
      mm.add({ motion: MOTION_QUERIES.motion, reduce: MOTION_QUERIES.reduce }, (context) => {
        const { reduce } = context.conditions as { reduce: boolean }
        const starts: number[] = []
        let current = -1
        const tl = gsap.timeline({
          paused: true,
          repeat: hostRef.current.loop ? -1 : 0,
          repeatDelay: rest,
          defaults: { ease: 'expo.out', duration: 0.7 },
          onUpdate: () => {
            const time = tl.time()
            let index = 0
            for (let i = 0; i < starts.length; i += 1) if (time >= starts[i] - 0.001) index = i
            if (index !== current) {
              current = index
              setActive(index)
              hostRef.current.onStep?.(index, stepsRef.current)
            }
            hostRef.current.onProgress?.(tl.progress())
          },
          // A reduced-motion stage parks on its final frame, which must not count as a finished cycle.
          onRepeat: () => {
            if (!gateRef.current.reduced) hostRef.current.onCycle?.()
          },
          onComplete: () => {
            if (!gateRef.current.reduced) hostRef.current.onCycle?.()
          },
        })
        build(createApi(tl, root, width, height))
        steps.forEach((_, i) =>
          starts.push(tl.labels[`step-${i}`] ?? (i === 0 ? 0 : Number.POSITIVE_INFINITY)),
        )
        const finalTime = tl.labels.final ?? tl.duration()
        tlRef.current = tl
        gateRef.current.reduced = reduce
        hostRef.current.onStep?.(0, stepsRef.current)

        if (reduce) {
          tl.time(finalTime)
          gsap.set(root.querySelector('[data-demo-cursor]'), { opacity: 0 })
        } else {
          sync()
        }
        return () => {
          tlRef.current = null
        }
      })
      return () => mm.revert()
    },
    { scope: canvasRef },
  )

  const toggle = useCallback(() => {
    const next = !gateRef.current.user
    gateRef.current.user = next
    setPlaying(next)
    hostRef.current.onPlayingChange?.(next)
    sync()
  }, [sync])

  const jump = useCallback((index: number) => {
    const tl = tlRef.current
    if (!tl) return
    const target = `step-${index}`
    // Events stay on so counters, which render through onUpdate, rewind with the jump.
    if (target in tl.labels) tl.seek(target, false)
    setActive(index)
  }, [])

  useEffect(() => {
    const host = hostRef.current
    host.onControls?.({ jump, toggle })
    return () => host.onControls?.(null)
  }, [jump, toggle])

  return (
    <figure aria-label={label} data-demo-stage="" className={cn('relative m-0', className)}>
      {glow && !card ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -inset-6 rounded-[40px] opacity-45 blur-3xl"
          style={{
            background:
              'radial-gradient(60% 60% at 50% 40%, color-mix(in srgb, var(--accent) 32%, transparent), transparent 70%)',
          }}
        />
      ) : null}
      <div
        className={cn(
          'relative overflow-hidden bg-surface',
          !card && 'rounded-[22px] border border-line-strong shadow-[0_30px_90px_-40px_rgb(0_0_0/0.9)]',
        )}
      >
        <div ref={frameRef} className="relative w-full overflow-hidden" style={{ aspectRatio: `${width} / ${height}` }}>
          <div
            ref={canvasRef}
            aria-hidden="true"
            className="absolute top-0 left-0 origin-top-left text-[13px] text-ink select-none"
            style={{
              width,
              height,
              transform: `scale(${scale || 1})`,
              visibility: scale ? 'visible' : 'hidden',
            }}
          >
            {children}
            <span
              data-demo-ripple=""
              className="pointer-events-none absolute top-0 left-0 z-40 -mt-7 -ml-7 size-14 rounded-full border-2 border-[var(--accent)] opacity-0"
            />
            <svg
              data-demo-cursor=""
              viewBox="0 0 24 24"
              className="pointer-events-none absolute top-0 left-0 z-50 size-6 opacity-0 drop-shadow-[0_6px_10px_rgb(0_0_0/0.6)]"
            >
              <path
                d="M4 2.5 19.5 11l-6.6 1.9L9.6 19.8z"
                fill="#fff"
                stroke="#07070b"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>
        {card ? null : (
          <figcaption className="flex items-center gap-3 border-t border-line px-3 py-2">
            <button
              type="button"
              onClick={toggle}
              aria-label={playing ? t('demo.pause') : t('demo.play')}
              title={playing ? t('demo.pause') : t('demo.play')}
              className="flex size-8 shrink-0 items-center justify-center rounded-full border border-line-strong text-ink-soft outline-none transition-colors hover:border-white/40 hover:text-ink focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
            >
              {playing ? (
                <PauseIcon aria-hidden="true" className="size-3.5" />
              ) : (
                <PlayIcon aria-hidden="true" className="size-3.5" />
              )}
            </button>
            <p className="m-0 w-0 min-w-0 flex-1 truncate text-[13px] text-ink-soft">
              <span className="mr-2 font-mono text-[10px] text-muted tabular-nums">
                {String(active + 1).padStart(2, '0')}/{String(steps.length).padStart(2, '0')}
              </span>
              {steps[active]}
            </p>
            <div className="flex shrink-0">
              {steps.map((step, index) => (
                <button
                  key={step}
                  type="button"
                  onClick={() => jump(index)}
                  aria-label={t('demo.stepLabel', { index: index + 1, title: step })}
                  aria-current={index === active ? 'step' : undefined}
                  className="group flex h-8 min-w-6 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]"
                >
                  <span
                    className={cn(
                      'h-1.5 rounded-full transition-all duration-500 ease-[var(--ease-out-expo)]',
                      index === active ? 'w-5 bg-[var(--accent)]' : 'w-1.5 bg-white/20 group-hover:bg-white/45',
                    )}
                  />
                </button>
              ))}
            </div>
          </figcaption>
        )}
      </div>
    </figure>
  )
}
