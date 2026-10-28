import { useTranslation } from 'react-i18next'

import type { ContrastResult } from '@/core/engines/color'
import type { CapturedElement } from '@/core/engines/selector'
import { a11yOf, type InspectIssue } from '@/core/engines/selector/inspect'
import { CopyButton } from '@/shared/components/CopyButton'
import { cn } from '@/shared/utils/cn'

import { ContrastMeter } from './ContrastMeter'

export function A11yTab({
  element,
  contrast,
  issues,
}: {
  element: CapturedElement
  contrast: ContrastResult | null
  issues: InspectIssue[]
}) {
  const { t } = useTranslation()
  const a11y = a11yOf(element)
  const html = element.html

  return (
    <div className="flex flex-col gap-3" data-search-id="section-a11y">
      <section className="rounded-xl border bg-card p-2.5 shadow-xs">
        <h3 className="mb-1.5 text-[11px] font-medium text-muted-foreground">{t('inspectorEl.contrast')}</h3>
        <ContrastMeter
          contrast={contrast}
          foreground={element.computedStyles.color}
          background={element.computedStyles['background-color']}
        />
      </section>

      <dl className="grid grid-cols-2 gap-1.5">
        <Fact label={t('inspectorEl.role')} value={a11y.role} />
        <Fact
          label={t('inspectorEl.name')}
          value={a11y.labelled ? a11y.name : t('inspectorEl.unnamed')}
          copy={a11y.labelled ? a11y.name : undefined}
        />
        <Fact
          label={t('inspectorEl.focusable')}
          value={a11y.focusable ? t('inspectorEl.yes') : t('inspectorEl.no')}
        />
        <Fact
          label={t('inspectorEl.interactive')}
          value={a11y.interactive ? t('inspectorEl.yes') : t('inspectorEl.no')}
        />
        <Fact
          label={t('inspectorEl.hidden')}
          value={a11y.hidden ? t('inspectorEl.yes') : t('inspectorEl.no')}
        />
      </dl>

      <section>
        <h3 className="mb-1.5 text-[11px] font-medium text-muted-foreground">{t('inspectorEl.issues')}</h3>
        {issues.length === 0 ? (
          <p className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-2.5 py-2 text-[11px] leading-4 text-emerald-800 dark:text-emerald-300">
            {t('inspectorEl.noIssues')}
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {issues.map((issue) => (
              <li
                key={issue.id}
                className={cn(
                  'rounded-lg border px-2.5 py-1.5 text-[11px] leading-4',
                  issue.severity === 'error' && 'border-destructive/40 bg-destructive/5 text-destructive',
                  issue.severity === 'warn' &&
                    'border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-200',
                  issue.severity === 'info' && 'border-border bg-muted/40 text-muted-foreground',
                )}
              >
                {issue.label}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-search-id="section-html" className="rounded-xl border bg-card p-2.5 shadow-xs">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-medium text-muted-foreground">{t('inspectorEl.html')}</h3>
          <CopyButton text={html} />
        </div>
        <pre className="max-h-40 overflow-auto whitespace-pre-wrap break-all font-mono text-[10px] leading-4 text-muted-foreground">
          {html}
        </pre>
      </section>
    </div>
  )
}

function Fact({ label, value, copy }: { label: string; value: string; copy?: string }) {
  return (
    <div className="rounded-lg border bg-card px-2.5 py-1.5">
      <div className="flex items-center justify-between gap-1">
        <dt className="text-[11px] text-muted-foreground">{label}</dt>
        {copy ? <CopyButton text={copy} /> : null}
      </div>
      <dd className="truncate text-xs font-medium">{value}</dd>
    </div>
  )
}
