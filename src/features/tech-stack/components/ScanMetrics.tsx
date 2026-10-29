import { GlobeIcon, LayersIcon, LayoutGridIcon, type LucideIcon } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { TECH_CATEGORIES } from '@/core/engines/techStack/categories'
import { TECH_RULE_COUNT, groupHitsByCategory } from '@/core/engines/techStack/detect'
import { httpVersionLabel } from '@/core/engines/techStack/moreInfo'
import type { TechScan } from '@/core/engines/techStack/types'

import { categoryColor } from '../categoryStyle'
import { ScanSection } from './ScanSection'

function Metric({ icon: Icon, label, value, color }: { icon: LucideIcon; label: string; value: string; color: string }) {
  return (
    <div className="min-w-0 rounded-xl border bg-card px-2.5 py-2">
      <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
        <Icon className="size-3" style={{ color }} aria-hidden />
        {label}
      </p>
      <p className="mt-0.5 truncate font-mono text-[13px] font-semibold tabular-nums" title={value}>
        {value}
      </p>
    </div>
  )
}

function CompositionBar({ groups, total }: { groups: ReturnType<typeof groupHitsByCategory>; total: number }) {
  const reduce = useReducedMotion()
  if (total === 0 || groups.length < 2) return null

  return (
    <motion.div
      className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-muted"
      initial={reduce ? false : { scaleX: 0 }}
      animate={{ scaleX: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      style={{ transformOrigin: 'left' }}
      aria-hidden
    >
      {groups.map((group) => (
        <div
          key={group.category}
          className="h-full"
          style={{
            width: `${(group.hits.length / total) * 100}%`,
            backgroundColor: categoryColor(group.category),
          }}
        />
      ))}
    </motion.div>
  )
}

export function ScanMetrics({ scan }: { scan: TechScan }) {
  const { t } = useTranslation()
  const groups = useMemo(() => groupHitsByCategory(scan.hits), [scan.hits])
  const protocol = httpVersionLabel(scan.protocol) ?? (scan.url.startsWith('https:') ? 'HTTPS' : 'HTTP')

  return (
    <ScanSection className="px-3.5 pt-3">
      <div className="grid grid-cols-3 gap-2">
        <Metric
          icon={LayersIcon}
          label={t('techStack.metric.technologies')}
          value={String(scan.hits.length)}
          color="var(--hero-from)"
        />
        <Metric
          icon={LayoutGridIcon}
          label={t('techStack.metric.categories')}
          value={String(groups.length)}
          color="var(--hero-via)"
        />
        <Metric
          icon={GlobeIcon}
          label={t('techStack.metric.protocol')}
          value={protocol}
          color="var(--speed-down)"
        />
      </div>
      <CompositionBar groups={groups} total={scan.hits.length} />
      <p className="mt-1.5 text-[11px] text-muted-foreground">
        {t('techStack.coverage', { count: TECH_RULE_COUNT, categories: TECH_CATEGORIES.length })}
      </p>
    </ScanSection>
  )
}
