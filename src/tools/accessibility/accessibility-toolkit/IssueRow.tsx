import { memo, useId } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ChevronDownIcon, CrosshairIcon, ExternalLinkIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { wcagUnderstandingUrl, type A11yRuleOutcome } from '@/core/engines/a11y'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { cn } from '@/shared/utils/cn'

import { SEVERITY_ICON, SEVERITY_TONE } from './meta'

interface IssueRowProps {
  outcome: A11yRuleOutcome
  expanded: boolean
  index: number
  busy: boolean
  onToggle: (id: string) => void
  onLocate: (outcome: A11yRuleOutcome) => void
}

export const IssueRow = memo(function IssueRow({ outcome, expanded, index, busy, onToggle, onLocate }: IssueRowProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const detailsId = useId()
  const Icon = SEVERITY_ICON[outcome.severity]
  const tone = SEVERITY_TONE[outcome.severity]
  const title = t(`a11y.rule.${outcome.id}.title`)
  const fix = t(`a11y.rule.${outcome.id}.fix`)

  return (
    <motion.li
      layout={reduce ? false : 'position'}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduce ? undefined : { opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.25, delay: reduce ? 0 : Math.min(index, 14) * 0.025, ease: [0.22, 1, 0.36, 1] }}
      className={cn(
        'overflow-hidden rounded-xl border bg-card transition-[border-color,box-shadow] duration-200',
        expanded && 'border-primary/35 shadow-sm',
        `border-l-[3px] ${tone.border}`,
      )}
    >
      <div className="flex items-start gap-2 p-2.5">
        <span className={cn('mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg', tone.soft, tone.text)} aria-hidden>
          <Icon className="size-3.5" />
        </span>
        <button
          type="button"
          className="min-w-0 flex-1 cursor-pointer rounded-sm text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={expanded}
          aria-controls={detailsId}
          onClick={() => onToggle(outcome.id)}
        >
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[13px] leading-5 font-medium text-foreground">{title}</span>
            <Badge variant="secondary" className="h-5 px-1.5 text-[10px] tabular-nums">
              {t('a11y.failed', { failed: outcome.failed })}
            </Badge>
          </span>
          <span className="mt-0.5 block text-[11px] text-muted-foreground">{t('a11y.checked', { checked: outcome.checked })}</span>
        </button>
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label={t('a11y.locate')}
            title={t('a11y.locate')}
            disabled={busy || outcome.nodes.length === 0}
            onClick={() => onLocate(outcome)}
          >
            <CrosshairIcon className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-expanded={expanded}
            aria-controls={detailsId}
            aria-label={title}
            onClick={() => onToggle(outcome.id)}
          >
            <ChevronDownIcon className={cn('size-4 transition-transform duration-200', expanded && 'rotate-180')} />
          </Button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            id={detailsId}
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={reduce ? undefined : { height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t bg-muted/20"
          >
            <div className="space-y-2.5 p-2.5 pt-2">
              <p className="text-xs leading-relaxed text-muted-foreground">{fix}</p>
              <div className="flex flex-wrap gap-1">
                {outcome.wcag.map((criterion) => {
                  const href = wcagUnderstandingUrl(criterion)
                  return href ? (
                    <a
                      key={criterion}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-6 items-center gap-0.5 rounded-full border bg-background/80 px-2 text-[10px] font-medium text-primary hover:underline"
                    >
                      {t('a11y.wcag')} {criterion}
                      <ExternalLinkIcon className="size-2.5 opacity-70" aria-hidden />
                    </a>
                  ) : (
                    <span key={criterion} className="inline-flex h-6 items-center rounded-full border px-2 text-[10px] text-muted-foreground">
                      {t('a11y.wcag')} {criterion}
                    </span>
                  )
                })}
                <span className="inline-flex h-6 items-center rounded-full border px-2 text-[10px] text-muted-foreground">
                  {outcome.level === 'best' ? t('a11y.bestPractice') : t('a11y.level', { level: outcome.level })}
                </span>
              </div>
              {outcome.nodes.length > 0 && (
                <ul className="space-y-1.5">
                  {outcome.nodes.map((node, nodeIndex) => (
                    <li key={`${node.selector}-${nodeIndex}`} className="rounded-lg border bg-background/70 px-2 py-1.5 text-[11px]">
                      <p className="font-medium text-foreground/90">
                        {node.selector ? (
                          <code className="break-all font-mono text-[10px]">{node.selector}</code>
                        ) : (
                          t('a11y.pageLevel')
                        )}
                      </p>
                      {node.snippet && <p className="mt-0.5 break-words text-muted-foreground">{node.snippet}</p>}
                      {node.detail && <p className="mt-0.5 text-muted-foreground">{node.detail}</p>}
                      {node.ratio != null && node.required != null && (
                        <p className="mt-0.5 tabular-nums text-muted-foreground">
                          {node.ratio.toFixed(2)}:1 · need {node.required}:1
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {outcome.failed > outcome.nodes.length && (
                <p className="text-[11px] text-muted-foreground">
                  {t('a11y.showMore', { count: outcome.failed - outcome.nodes.length })}
                </p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  )
})
