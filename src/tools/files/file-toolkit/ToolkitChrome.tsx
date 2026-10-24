import { useTranslation } from 'react-i18next'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ShieldCheckIcon } from 'lucide-react'

import { FileGlyph } from '@/shared/components/files'
import { cn } from '@/shared/utils/cn'
import { MODE_META, MODES, type Mode } from './modes'

function FlowDots() {
  const reduce = useReducedMotion()
  return (
    <span className="relative flex w-14 items-center justify-between" aria-hidden>
      {[0, 1, 2, 3].map((dot) => (
        <motion.span
          key={dot}
          className="size-1.5 rounded-full bg-primary"
          initial={{ opacity: 0.25, scale: 0.8 }}
          animate={reduce ? { opacity: 0.6 } : { opacity: [0.25, 1, 0.25], scale: [0.8, 1.15, 0.8] }}
          transition={reduce ? undefined : { duration: 1.4, repeat: Infinity, delay: dot * 0.18, ease: 'easeInOut' }}
        />
      ))}
    </span>
  )
}

function ConversionArt({ mode }: { mode: Mode }) {
  const reduce = useReducedMotion()
  const [from, to] = MODE_META[mode].pair
  return (
    <div className="relative hidden shrink-0 items-center gap-2 pr-1 @[440px]:flex" aria-hidden>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={`${mode}-from`}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: -12, rotate: -10 }}
          animate={{ opacity: 1, x: 0, rotate: -6 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={{ type: 'spring', stiffness: 300, damping: 22 }}
        >
          <div className="hero-float-icon">
            <FileGlyph extension={from} className="h-12 opacity-80" />
          </div>
        </motion.div>
      </AnimatePresence>
      <FlowDots />
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={`${mode}-to`}
          initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.6, rotate: 12 }}
          animate={{ opacity: 1, scale: 1, rotate: 4 }}
          exit={{ opacity: 0, transition: { duration: 0.12 } }}
          transition={{ type: 'spring', stiffness: 360, damping: 18, delay: reduce ? 0 : 0.08 }}
          className="relative"
        >
          <span className="absolute inset-0 -z-10 scale-125 rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--hero-to)_45%,transparent),transparent)] blur-md" />
          <div className="hero-float-icon hero-float-icon-delay-2">
            <FileGlyph extension={to} className="h-14 drop-shadow-lg" />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  )
}

export function ToolkitHero({ mode }: { mode: Mode }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  return (
    <div className="relative isolate overflow-hidden rounded-2xl border bg-card px-4 py-3.5 shadow-xs">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(120% 140% at 0% 0%, color-mix(in srgb, var(--hero-from) 16%, transparent), transparent 55%), radial-gradient(90% 120% at 100% 100%, color-mix(in srgb, var(--hero-to) 18%, transparent), transparent 60%)',
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-60 [mask-image:linear-gradient(90deg,transparent,black_60%)]"
        style={{
          backgroundImage: 'radial-gradient(color-mix(in srgb, var(--foreground) 12%, transparent) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
        }}
      />
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-700 uppercase dark:text-emerald-300">
            <ShieldCheckIcon className="size-3" aria-hidden />
            {t('fs.hero.badge')}
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mode}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              <p className="mt-1.5 text-base leading-tight font-semibold tracking-tight text-balance">{t(`fs.hero.${mode}.title`)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground text-pretty">{t(`fs.hero.${mode}.text`)}</p>
            </motion.div>
          </AnimatePresence>
        </div>
        <ConversionArt mode={mode} />
      </div>
    </div>
  )
}

export function ModeTiles({ value }: { value: Mode }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  return (
    <TabsPrimitive.List aria-label={t('fs.modesLabel')} className="grid grid-cols-3 gap-1.5 @[720px]:grid-cols-6">
      {MODES.map((mode) => {
        const { icon: Icon, tone } = MODE_META[mode]
        const active = value === mode
        return (
          <TabsPrimitive.Trigger
            key={mode}
            value={mode}
            className={cn(
              'group/tile relative flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border bg-card/60 px-2 py-2 text-left outline-none transition-[border-color,background-color,transform] duration-150 hover:border-foreground/15 hover:bg-card focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] @[480px]:px-2.5',
              active && 'border-transparent',
            )}
          >
            {active && (
              <motion.span
                layoutId="file-toolkit-mode"
                className="absolute inset-0 rounded-xl bg-primary/[0.07] ring-[1.5px] ring-primary/70"
                transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }}
                aria-hidden
              />
            )}
            <span
              className={cn(
                'relative flex size-7 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 group-hover/tile:scale-105 [&_svg]:size-3.5',
                tone,
              )}
              aria-hidden
            >
              <Icon />
            </span>
            <span className="relative flex min-w-0 flex-col">
              <span className={cn('truncate text-xs font-semibold', active ? 'text-foreground' : 'text-foreground/80')}>
                {t(`fs.modes.${mode}`)}
              </span>
              <span className="hidden truncate text-[10px] text-muted-foreground @[560px]:block">{t(`fs.modes.${mode}Hint`)}</span>
            </span>
          </TabsPrimitive.Trigger>
        )
      })}
    </TabsPrimitive.List>
  )
}
