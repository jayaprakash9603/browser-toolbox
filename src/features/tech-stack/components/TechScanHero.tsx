import { GlobeIcon, LayersIcon, SparklesIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/utils/cn'

interface TechScanHeroProps {
  host: string
  count: number | null
  loading: boolean
}

export function TechScanHero({ host, count, loading }: TechScanHeroProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()

  return (
    <motion.section
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
      className="relative mb-3 overflow-hidden rounded-2xl border bg-card p-3 shadow-xs"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute -top-16 end-0 size-40 rounded-full bg-primary/10 blur-3xl"
      />
      <div className="relative flex items-center gap-3">
        <div className="relative flex size-12 shrink-0 items-center justify-center rounded-xl border bg-background/80 shadow-sm">
          {!reduce && loading &&
            [0, 1].map((ring) => (
              <motion.span
                key={ring}
                aria-hidden
                className="absolute inset-0 rounded-xl border border-primary/35"
                initial={{ scale: 0.85, opacity: 0.6 }}
                animate={{ scale: 1.35, opacity: 0 }}
                transition={{ duration: 1.6, repeat: Infinity, delay: ring * 0.45, ease: 'easeOut' }}
              />
            ))}
          <GlobeIcon className={cn('size-5 text-primary', loading && !reduce && 'motion-safe:animate-pulse')} aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-semibold tracking-wider text-muted-foreground uppercase">
            {t('techStack.hero.scanning')}
          </p>
          <p className="truncate text-sm font-semibold tracking-tight">{host || t('techStack.hero.unknownHost')}</p>
          <p className="text-[11px] text-muted-foreground">
            {loading
              ? t('techStack.scanning')
              : count === null
                ? t('techStack.hero.ready')
                : t('techStack.summary', { count, host })}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
            <LayersIcon className="size-3" aria-hidden />
            {loading ? '…' : (count ?? 0)}
          </span>
          <span className="inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <SparklesIcon className="size-3 text-[var(--hero-from)]" aria-hidden />
            {t('techStack.hero.wappalyzerStyle')}
          </span>
        </div>
      </div>
    </motion.section>
  )
}
