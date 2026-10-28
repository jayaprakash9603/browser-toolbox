import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ListFilterIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { A11yCategory, A11yReport, A11yRuleOutcome } from '@/core/engines/a11y'
import { PanelSection } from '@/shared/components/toolkit'

import { IssueRow } from './IssueRow'
import type { SeverityFilter } from './ScoreHero'
import { PASS_ICON, SEVERITY_TONE } from './meta'

interface IssueListProps {
  report: A11yReport
  search: string
  severity: SeverityFilter
  category: A11yCategory | null
  showPassed: boolean
  busy: boolean
  onLocate: (outcome: A11yRuleOutcome) => void
}

function matchesSearch(outcome: A11yRuleOutcome, query: string, t: (key: string) => string) {
  if (!query) return true
  const haystack = [
    t(`a11y.rule.${outcome.id}.title`),
    t(`a11y.rule.${outcome.id}.fix`),
    ...outcome.nodes.flatMap((n) => [n.selector, n.snippet, n.detail ?? '']),
  ]
    .join(' ')
    .toLowerCase()
  return haystack.includes(query)
}

export function IssueList({ report, search, severity, category, showPassed, busy, onLocate }: IssueListProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const query = search.trim().toLowerCase()

  const items = useMemo(() => {
    let list = report.outcomes.filter((o) => (showPassed ? o.status === 'pass' : o.status === 'fail'))
    if (!showPassed && severity !== 'all') list = list.filter((o) => o.severity === severity)
    if (category) list = list.filter((o) => o.category === category)
    if (query) list = list.filter((o) => matchesSearch(o, query, t))
    return list
  }, [report.outcomes, showPassed, severity, category, query, t])

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const filtersActive = severity !== 'all' || category != null || query.length > 0

  return (
    <PanelSection
      title={showPassed ? t('a11y.issues.passedTitle') : t('a11y.issues.title')}
      icon={showPassed ? <PASS_ICON /> : <ListFilterIcon />}
    >
      {items.length === 0 ? (
        <motion.p
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-dashed px-3 py-6 text-center text-xs text-muted-foreground"
        >
          {filtersActive ? (
            <>
              <span className="font-medium text-foreground">{t('a11y.noMatches')}</span>
              <span className="mt-1 block">{t('a11y.noMatchesHint')}</span>
            </>
          ) : showPassed ? (
            t('a11y.noFailed')
          ) : (
            <>
              <span className={SEVERITY_TONE.pass.text}>{t('a11y.allClear')}</span>
            </>
          )}
        </motion.p>
      ) : (
        <ul className="flex flex-col gap-2" aria-label={t('a11y.filtersLabel')}>
          <AnimatePresence initial={false}>
            {items.map((outcome, index) => (
              <IssueRow
                key={outcome.id}
                outcome={outcome}
                expanded={expanded.has(outcome.id)}
                index={index}
                busy={busy}
                onToggle={toggle}
                onLocate={onLocate}
              />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </PanelSection>
  )
}
