import { MoonIcon, SunIcon, SunriseIcon } from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { categoryRegistry, toolRegistry } from '@/core/registry'
import { getGreetingKey, HOME_TAGLINES, TAGLINE_INTERVAL_MS, type GreetingKey } from '@/app/pages/home/homeConfig'
import { SlideUp } from '@/shared/components/motion'
import { cn } from '@/shared/utils/cn'

import { RollingTime, WallClock } from './WallClock'

const DAYPART_ICON: Record<GreetingKey, typeof SunIcon> = {
  'home.greeting.morning': SunriseIcon,
  'home.greeting.afternoon': SunIcon,
  'home.greeting.evening': MoonIcon,
}

/** Current time, re-rendered on each minute boundary and when the panel becomes visible again. */
function useMinuteClock(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      const current = new Date()
      setNow(current)
      timer = setTimeout(schedule, 60_000 - (current.getSeconds() * 1000 + current.getMilliseconds()) + 50)
    }
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return
      clearTimeout(timer)
      schedule()
    }
    schedule()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return now
}

function useRotatingIndex(count: number, paused: boolean): [number, (index: number) => void] {
  const [index, setIndex] = useState(0)
  useEffect(() => {
    if (paused || count < 2) return
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') setIndex((i) => (i + 1) % count)
    }, TAGLINE_INTERVAL_MS)
    return () => clearInterval(id)
  }, [paused, count, index])
  return [index, setIndex]
}

export function WelcomeStrip({ favoriteCount, delay = 0 }: { favoriteCount: number; delay?: number }) {
  const { t, i18n } = useTranslation()
  const reduce = useReducedMotion()
  const now = useMinuteClock()
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  // Reduced motion stops auto-advance entirely; the dots still let people browse the messages.
  const [taglineIndex, setTaglineIndex] = useRotatingIndex(HOME_TAGLINES.length, Boolean(reduce) || hovered || focused)
  const tagline = HOME_TAGLINES[taglineIndex]
  const TaglineIcon = tagline.icon

  const greetingKey = getGreetingKey(now.getHours())
  const DaypartIcon = DAYPART_ICON[greetingKey]
  const clock = useMemo(() => {
    const parts = new Intl.DateTimeFormat(i18n.language, { hour: 'numeric', minute: '2-digit' }).formatToParts(now)
    const time = parts
      .filter((p) => p.type !== 'dayPeriod')
      .map((p) => p.value)
      .join('')
      .trim()
    const period = parts.find((p) => p.type === 'dayPeriod')?.value ?? ''
    const date = new Intl.DateTimeFormat(i18n.language, { weekday: 'short', month: 'short', day: 'numeric' }).format(now)
    const full = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'full', timeStyle: 'short' }).format(now)
    return { time, period, date, full }
  }, [now, i18n.language])

  const stats = useMemo(() => {
    const toolCount = toolRegistry.getAll().length
    const categoryCount = categoryRegistry
      .getEnabled()
      .filter((category) => toolRegistry.getByCategory(category.id).length > 0).length
    return { toolCount, categoryCount }
  }, [])

  const items = [
    { label: t('home.stat.tools'), value: stats.toolCount },
    { label: t('home.stat.categories'), value: stats.categoryCount },
    { label: t('home.stat.favorites'), value: favoriteCount },
  ]

  const enter = reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: 'blur(4px)' }
  const exit = reduce ? { opacity: 0 } : { opacity: 0, y: -8, filter: 'blur(4px)' }

  return (
    <SlideUp delay={delay} className="@container mb-[var(--density-section-gap)]">
      <section
        aria-labelledby="home-welcome-title"
        className="relative overflow-hidden rounded-2xl border p-3 shadow-[var(--shadow-card)]"
        style={{
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--hero-from) 16%, var(--card)) 0%, color-mix(in srgb, var(--hero-to) 8%, var(--card)) 55%, var(--card) 100%)',
        }}
        onPointerEnter={() => setHovered(true)}
        onPointerLeave={() => setHovered(false)}
        onFocus={() => setFocused(true)}
        onBlur={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false)
        }}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 -right-8 size-28 rounded-full opacity-25 blur-2xl"
          style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--hero-to))' }}
        />
        {/* Narrow cards give the tagline its own full-width line instead of squeezing it beside the clock. */}
        <div className="relative grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-2.5 gap-y-2 @[560px]:items-start @[560px]:gap-y-0.5">
          <span
            aria-hidden
            className="relative col-start-1 row-start-1 flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-xl text-white shadow-sm @[560px]:row-span-2"
            style={{ background: 'linear-gradient(135deg, var(--hero-from), var(--hero-to))' }}
          >
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={tagline.id}
                initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: -30 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.4, rotate: 30, transition: { duration: 0.15 } }}
                transition={reduce ? { duration: 0.2 } : { type: 'spring', stiffness: 420, damping: 22 }}
                className="flex"
              >
                <TaglineIcon className="size-4" />
              </motion.span>
            </AnimatePresence>
          </span>

          <h1
            id="home-welcome-title"
            className="col-start-2 row-start-1 min-w-0 text-[15px] leading-tight font-semibold tracking-tight text-balance"
          >
            {t(greetingKey)}
          </h1>
          {/* Every message is laid out invisibly in the same cell so the card never changes height. */}
          <div className="col-span-3 col-start-1 row-start-2 grid min-w-0 text-xs leading-snug text-pretty text-muted-foreground @[560px]:col-span-1 @[560px]:col-start-2">
            {HOME_TAGLINES.map((item) => (
              <span key={item.id} aria-hidden className="invisible col-start-1 row-start-1">
                {t(`home.tagline.${item.id}`)}
              </span>
            ))}
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={tagline.id}
                initial={enter}
                animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                exit={{ ...exit, transition: { duration: 0.16 } }}
                transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
                className="col-start-1 row-start-1"
              >
                {t(`home.tagline.${tagline.id}`)}
              </motion.p>
            </AnimatePresence>
          </div>

          <time
            dateTime={now.toISOString()}
            aria-label={clock.full}
            title={clock.full}
            className="col-start-3 row-start-1 flex shrink-0 items-center gap-2 rounded-2xl border bg-background/50 py-1.5 ps-2.5 pe-2.5 shadow-sm backdrop-blur-sm @[360px]:py-1 @[360px]:ps-1 @[560px]:row-span-2"
          >
            <WallClock now={now} className="hidden size-10 @[360px]:block @[560px]:size-[46px]" />
            <span className="flex flex-col items-end gap-1" aria-hidden>
              <span className="flex items-baseline gap-0.5 text-[15px] leading-none font-semibold tracking-tight tabular-nums">
                <RollingTime time={clock.time} />
                {clock.period ? (
                  <span className="text-[10px] font-medium text-muted-foreground uppercase">{clock.period}</span>
                ) : null}
              </span>
              <span className="flex items-center gap-1 text-[10px] leading-none text-muted-foreground">
                <DaypartIcon className="size-3 text-[var(--hero-from)]" aria-hidden />
                {clock.date}
              </span>
            </span>
          </time>
        </div>

        <div className="relative mt-1.5 flex items-center gap-1 @[560px]:mt-2 @[560px]:ps-[46px]" role="group" aria-label={t('home.taglines')}>
          {HOME_TAGLINES.map((item, i) => {
            const active = i === taglineIndex
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setTaglineIndex(i)}
                aria-label={t('home.taglineShow', { topic: t(`home.taglineTopic.${item.id}`) })}
                aria-current={active ? 'true' : undefined}
                className="group/dot flex h-4 cursor-pointer items-center rounded-full px-0.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <motion.span
                  aria-hidden
                  animate={{ width: active ? 14 : 5 }}
                  transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 500, damping: 34 }}
                  className={cn(
                    'block h-[5px] rounded-full transition-colors',
                    active ? 'bg-[var(--hero-from)]' : 'bg-muted-foreground/30 group-hover/dot:bg-muted-foreground/60',
                  )}
                />
              </button>
            )
          })}
        </div>

        <dl className="relative mt-2 grid grid-cols-3 divide-x rounded-xl border bg-background/60 backdrop-blur-sm">
          {items.map((item) => (
            <div key={item.label} className="flex min-w-0 flex-col-reverse items-center px-1 py-1.5">
              <dt className="max-w-full truncate text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                {item.label}
              </dt>
              <dd className="text-base leading-tight font-bold tabular-nums">{item.value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </SlideUp>
  )
}
