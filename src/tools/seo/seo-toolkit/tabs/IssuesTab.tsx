import { useTranslation } from 'react-i18next'

import type { SeoCheck, SeoReport } from '@/core/engines/seo/types'
import { CheckRow } from '../components'

export function IssuesTab({ report }: { report: SeoReport }) {
  const { t } = useTranslation()
  const issues = report.checks.filter(
    (c) => c.weight > 0 && !c.ok && (c.severity === 'error' || c.severity === 'warning'),
  )
  const errors = issues.filter((c) => c.severity === 'error')
  const warnings = issues.filter((c) => c.severity === 'warning')

  if (issues.length === 0) {
    return (
      <p className="rounded-lg border border-green-500/40 bg-green-500/5 p-3 text-center text-[11px] text-green-700 dark:text-green-400">
        {t('seo.noIssues')}
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <IssueGroup title={t('seo.errors', { count: errors.length })} items={errors} />
      <IssueGroup title={t('seo.warnings', { count: warnings.length })} items={warnings} />
    </div>
  )
}

function IssueGroup({ title, items }: { title: string; items: SeoCheck[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <p className="mb-1 text-[11px] font-medium">{title}</p>
      <div className="space-y-1">
        {items.map((c) => (
          <CheckRow key={c.id} check={c} />
        ))}
      </div>
    </div>
  )
}
