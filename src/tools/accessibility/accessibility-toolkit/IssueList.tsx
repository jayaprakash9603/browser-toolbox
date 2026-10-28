import { useMemo, useState } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { ListFilterIcon, SearchIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { A11yCategory, A11yReport, A11yRuleOutcome } from '@/core/engines/a11y'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { PanelSection } from '@/shared/components/toolkit'

import { IssueRow } from './IssueRow'
import type { SeverityFilter } from './ScoreHero'
import { PASS_ICON, SEVERITY_TONE } from './meta'

interface IssueListProps {
  report: A11yReport
  severity: SeverityFilter
  category: A11yCategory | null
  showPassed: boolean
  busy: boolean
  onLocate: (outcome: A11yRuleOutcome) => void
  onClearFilters: () => void
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

export function IssueList({ report, severity, category, showPassed, busy, onLocate, onClearFilters }: IssueListProps) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const [search, setSearch] = useState('')
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
      actions={
        filtersActive && (
          <Button variant="ghost" size="xs" className="h-6 text-[11px]" onClick={() => { setSearch(''); onClearFilters() }}>
            {t('a11y.clearFilters')}
          </Button>
        )
      }
    >
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={t('a11y.searchPlaceholder')}
          className="h-8 pl-8 text-xs"
          aria-label={t('a11y.searchPlaceholder')}
        />
      </div>

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
        <ul className="flex max-h-[min(50vh,28rem)] flex-col gap-2 overflow-y-auto pr-0.5" aria-label={t('a11y.filtersLabel')}>
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
