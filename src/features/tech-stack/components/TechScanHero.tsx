import { LayersIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { cn } from '@/shared/utils/cn'

import { mixTint } from '../categoryStyle'
import { ScanSection } from './ScanSection'

interface TechScanHeroProps {
  host: string
  count: number | null
  loading: boolean
  accent: string
  actions?: ReactNode
  /** Sticks under the tool page header while the list scrolls. */
  pinned?: boolean
  /** Popover shell uses popover surface tokens. */
  inPopover?: boolean
}

export function TechScanHero({
  host,
  count,
  loading,
  accent,
  actions,
  pinned = false,
  inPopover = false,
}: TechScanHeroProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const title = host || (loading ? t('techStack.scanning') : t('techStack.hero.unknownHost'))
  const detail = loading
    ? t('techStack.hero.loadingHint')
    : count === null
      ? t('techStack.hero.ready')
      : count === 0
        ? t('web.techStack.empty')
        : t('techStack.hero.found', { count })

  return (
    <ScanSection
      instant
      className={cn(
        'relative shrink-0 overflow-hidden border-b border-border/80 px-3.5 pt-3.5 pb-3',
        inPopover ? 'z-10 bg-popover' : 'bg-background/95 backdrop-blur-md',
        pinned && 'sticky top-0 z-[2]',
      )}
      style={{
        background: `linear-gradient(135deg, ${mixTint(accent, 18)}, ${inPopover ? 'var(--popover)' : 'var(--background)'} 68%)`,
      }}
    >
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="relative flex size-12 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-card text-primary"
        >
          {!reduce && loading &&
            [0, 1].map((ring) => (
              <motion.span
                key={ring}
                className="absolute inset-0 rounded-xl border border-primary/35"
                initial={{ scale: 0.85, opacity: 0.6 }}
                animate={{ scale: 1.35, opacity: 0 }}
                transition={{ duration: 1.6, repeat: Infinity, delay: ring * 0.45, ease: 'easeOut' }}
              />
            ))}
          <LayersIcon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold tracking-wide text-foreground/75 uppercase">
            {t('techStack.hero.scanning')}
          </p>
          <p className="truncate text-[15px] leading-tight font-semibold text-foreground" aria-live="polite">
            {title}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <span className="inline-flex min-w-[1.75rem] items-center justify-center rounded-full border border-border bg-card px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums text-foreground">
            {loading ? '…' : (count ?? 0)}
          </span>
          {actions}
        </div>
      </div>
    </ScanSection>
  )
}
