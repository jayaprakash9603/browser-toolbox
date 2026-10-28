import { motion, useReducedMotion } from 'motion/react'
import { ActivityIcon, HeadingIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { A11yPageScan } from '@/core/engines/a11y'
import { PanelSection } from '@/shared/components/toolkit'
import { cn } from '@/shared/utils/cn'

interface PageInsightsProps {
  scan: A11yPageScan
}

export function PageInsights({ scan }: PageInsightsProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const stats = [
    { label: t('a11y.stats.elements'), value: scan.stats.elements },
    { label: t('a11y.stats.images'), value: scan.stats.images },
    { label: t('a11y.stats.links'), value: scan.stats.links },
    { label: t('a11y.stats.focusable'), value: scan.stats.focusable },
    {
      label: t('a11y.stats.duration'),
      value: t('a11y.stats.durationValue', { ms: Math.round(scan.stats.durationMs) }),
    },
  ]

  return (
    <>
      <PanelSection title={t('a11y.stats.title')} icon={<ActivityIcon />}>
        <div className="grid grid-cols-2 gap-1.5 @sm:grid-cols-3">
          {stats.map((item, index) => (
            <motion.div
              key={item.label}
              initial={reduce ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.04, duration: 0.25 }}
              className="rounded-xl border bg-background/60 px-2.5 py-2"
            >
              <p className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">{item.label}</p>
              <p className="mt-0.5 text-lg leading-none font-semibold tabular-nums">{item.value}</p>
            </motion.div>
          ))}
        </div>
      </PanelSection>

      {scan.headings.length > 0 && (
        <PanelSection title={t('a11y.outline.title')} icon={<HeadingIcon />}>
          <ol className="max-h-40 space-y-1 overflow-y-auto text-xs">
            {scan.headings.map((heading, index) => (
              <motion.li
                key={`${heading.selector}-${index}`}
                initial={reduce ? false : { opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: Math.min(index, 10) * 0.03 }}
                className={cn('flex items-start gap-2 rounded-lg border bg-muted/20 px-2 py-1', heading.skipped && 'border-amber-500/40')}
                style={{ paddingInlineStart: `${Math.min(heading.level, 6) * 0.35 + 0.5}rem` }}
              >
                <span className="shrink-0 rounded bg-muted px-1 font-mono text-[10px] tabular-nums">h{heading.level}</span>
                <span className="min-w-0 flex-1 truncate">{heading.text || '—'}</span>
                {heading.skipped && (
                  <span className="shrink-0 text-[10px] text-amber-600 dark:text-amber-400">{t('a11y.outline.skipped')}</span>
                )}
              </motion.li>
            ))}
          </ol>
        </PanelSection>
      )}
    </>
  )
}
