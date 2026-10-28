import { motion, useReducedMotion } from 'motion/react'
import {
  BadgeCheckIcon,
  FileDiffIcon,
  FingerprintIcon,
  ScaleIcon,
  ShieldCheckIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/utils/cn'

const FEATURES = [
  { key: 'featureDigests', icon: FingerprintIcon },
  { key: 'featureVerify', icon: BadgeCheckIcon },
  { key: 'featureCompare', icon: FileDiffIcon },
  { key: 'featureEvidence', icon: ShieldCheckIcon },
] as const

export interface HashHeroStats {
  hashed: number
  pending: number
}

export function HashHero({ stats }: { stats?: HashHeroStats }) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const showStats = stats && (stats.hashed > 0 || stats.pending > 0)

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
      className="relative overflow-hidden rounded-xl border bg-card px-2.5 py-2 shadow-xs"
      aria-label={t('hashToolkit.hero.title')}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 -top-10 size-28 rounded-full bg-emerald-500/8 blur-2xl"
      />

      <div className="relative flex items-start gap-2.5">
        <div className="relative flex size-9 shrink-0 items-center justify-center" aria-hidden>
          {!reduce && (
            <motion.span
              className="absolute inset-0 rounded-lg border border-emerald-500/30"
              initial={{ scale: 0.85, opacity: 0.5 }}
              animate={{ scale: 1.35, opacity: 0 }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            />
          )}
          <span className="relative flex size-9 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm dark:bg-emerald-500">
            <ScaleIcon className="size-4" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
            <h2 className="text-[13px] font-semibold leading-tight tracking-tight">
              {t('hashToolkit.hero.title')}
            </h2>
            {showStats && (
              <span className="inline-flex flex-wrap items-center gap-1">
                {stats!.hashed > 0 && (
                  <span className="rounded-full bg-emerald-500/10 px-1.5 py-px text-[10px] font-medium text-emerald-800 dark:text-emerald-300">
                    {t('hashToolkit.session.hashed', { count: stats!.hashed })}
                  </span>
                )}
                {stats!.pending > 0 && (
                  <span className="rounded-full bg-primary/10 px-1.5 py-px text-[10px] font-medium text-primary">
                    {t('hashToolkit.session.pending', { count: stats!.pending })}
                  </span>
                )}
              </span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground @[420px]:line-clamp-1">
            {t('hashToolkit.hero.subtitle')}
          </p>
          <ul className="mt-1.5 flex flex-wrap gap-1">
            {FEATURES.map(({ key, icon: Icon }, index) => (
              <motion.li
                key={key}
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2, delay: reduce ? 0 : index * 0.03 }}
                className={cn(
                  'inline-flex h-5 items-center gap-0.5 rounded-md border bg-background/90 px-1.5',
                  'text-[10px] font-medium text-foreground/80',
                )}
              >
                <Icon className="size-2.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
                <span className="truncate">{t(`hashToolkit.hero.${key}`)}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </motion.section>
  )
}
