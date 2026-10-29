import { LayersIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { mixTint } from '../categoryStyle'
import { ScanSection } from './ScanSection'

interface TechScanHeroProps {
  host: string
  count: number | null
  loading: boolean
  accent: string
}

export function TechScanHero({ host, count, loading, accent }: TechScanHeroProps) {
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
      className="relative overflow-hidden px-3.5 pt-3.5"
      style={{ background: `linear-gradient(135deg, ${mixTint(accent, 16)}, transparent 72%)` }}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden
          className="relative flex size-12 shrink-0 items-center justify-center rounded-xl"
          style={{ color: accent, backgroundColor: mixTint(accent) }}
        >
          {!reduce && loading &&
            [0, 1].map((ring) => (
              <motion.span
                key={ring}
                className="absolute inset-0 rounded-xl border"
                style={{ borderColor: mixTint(accent, 40) }}
                initial={{ scale: 0.85, opacity: 0.6 }}
                animate={{ scale: 1.35, opacity: 0 }}
                transition={{ duration: 1.6, repeat: Infinity, delay: ring * 0.45, ease: 'easeOut' }}
              />
            ))}
          <LayersIcon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
            {t('techStack.hero.scanning')}
          </p>
          <p className="truncate text-[15px] leading-tight font-semibold" style={{ color: accent }} aria-live="polite">
            {title}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold tabular-nums"
          style={{
            color: accent,
            borderColor: mixTint(accent, 35),
            backgroundColor: mixTint(accent, 12),
          }}
        >
          {loading ? '…' : (count ?? 0)}
        </span>
      </div>
    </ScanSection>
  )
}
