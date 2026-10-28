import { CopyButton } from '@/shared/components/CopyButton'
import { Badge } from '@/shared/components/ui/badge'
import type { CapturedElement } from '@/core/engines/selector'
import {
  a11yOf,
  occupancyPct,
  type InspectIssue,
} from '@/core/engines/selector/inspect'
import type { ContrastResult } from '@/core/engines/color'
import { cn } from '@/shared/utils/cn'
import { useTranslation } from 'react-i18next'

import { ContrastMeter } from './ContrastMeter'

export function OverviewTab({
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
  const occupancy = occupancyPct(element)
  const text = element.text.replace(/\s+/g, ' ').trim()
  const attrs = Object.entries(element.attributes)
  const dims = element.dimensions

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="font-mono">{`<${element.tag}>`}</Badge>
        {element.id ? <Badge variant="outline" className="font-mono">#{element.id}</Badge> : null}
        {element.classes.slice(0, 6).map((cls) => (
          <Badge key={cls} variant="outline" className="font-mono">
            .{cls}
          </Badge>
        ))}
        {element.classes.length > 6 ? (
          <Badge variant="outline">+{element.classes.length - 6}</Badge>
        ) : null}
      </div>

      <div className="grid grid-cols-4 gap-1.5">
        <Stat label={t('inspectorEl.stat.w')} value={Math.round(dims.width)} />
        <Stat label={t('inspectorEl.stat.h')} value={Math.round(dims.height)} />
        <Stat label={t('inspectorEl.stat.x')} value={Math.round(dims.x)} />
        <Stat label={t('inspectorEl.stat.y')} value={Math.round(dims.y)} />
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <Stat
          label={t('inspectorEl.children')}
          value={element.childCount ?? 0}
          muted
        />
        <Stat label={t('inspectorEl.sibling')} value={element.indexAmongSiblings} muted />
        <div className="rounded-md border bg-card p-1.5">
          <p className="text-[11px] text-muted-foreground">{t('inspectorEl.viewport')}</p>
          <p className="text-xs font-semibold tabular-nums">
            {occupancy == null ? '—' : `${occupancy.toFixed(1)}%`}
          </p>
        </div>
      </div>

      {element.parentChain.length > 0 && (
        <section data-search-id="section-ancestors" className="rounded-xl border bg-card p-2.5 shadow-xs">
          <h3 className="mb-1.5 text-[11px] font-medium text-muted-foreground">
            {t('inspectorEl.breadcrumb')}
          </h3>
          <p className="flex flex-wrap items-center gap-0.5 font-mono text-[11px] leading-5">
            {[...element.parentChain].reverse().map((node, index) => (
              <span key={`${node.tag}-${index}`} className="inline-flex items-center gap-0.5">
                {index > 0 ? <span className="text-muted-foreground/70">›</span> : null}
                <span>
                  {node.tag}
                  {node.id ? <span className="text-primary">#{node.id}</span> : null}
                </span>
              </span>
            ))}
            <span className="text-muted-foreground/70">›</span>
            <span className="font-semibold">{element.tag}</span>
          </p>
        </section>
      )}

      <section className="rounded-xl border bg-card p-2.5 shadow-xs">
        <h3 className="mb-1.5 text-[11px] font-medium text-muted-foreground">{t('inspectorEl.contrast')}</h3>
        <ContrastMeter
          contrast={contrast}
          foreground={element.computedStyles.color}
          background={element.computedStyles['background-color']}
        />
      </section>

      {issues.length > 0 && (
        <ul className="flex flex-col gap-1" aria-label={t('inspectorEl.issues')}>
          {issues.map((issue) => (
            <li
              key={issue.id}
              className={cn(
                'rounded-lg border px-2.5 py-1.5 text-[11px] leading-4',
                issue.severity === 'error' && 'border-destructive/40 bg-destructive/5 text-destructive',
                issue.severity === 'warn' && 'border-amber-500/40 bg-amber-500/5 text-amber-900 dark:text-amber-200',
                issue.severity === 'info' && 'border-border bg-muted/40 text-muted-foreground',
              )}
            >
              {issue.label}
            </li>
          ))}
        </ul>
      )}

      <section data-search-id="section-text" className="rounded-xl border bg-card p-2.5 shadow-xs">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-medium text-muted-foreground">{t('qa.text')}</h3>
          {text ? <CopyButton text={text} /> : null}
        </div>
        <p className="break-words text-xs leading-5">
          {text ? text.slice(0, 280) : t('inspectorEl.noText')}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">
          {t('inspectorEl.role')}: {a11y.role}
          {a11y.labelled ? ` · ${a11y.name}` : ''}
        </p>
      </section>

      <section data-search-id="section-attributes" className="rounded-xl border bg-card p-2.5 shadow-xs">
        <div className="mb-1 flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-medium text-muted-foreground">{t('qa.attributes')}</h3>
          {attrs.length > 0 ? <CopyButton text={JSON.stringify(element.attributes, null, 2)} /> : null}
        </div>
        {attrs.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t('inspectorEl.noAttrs')}</p>
        ) : (
          <div className="space-y-0.5 font-mono text-[11px] leading-5">
            {attrs.map(([name, value]) => (
              <div key={name} className="min-w-0 truncate">
                <span className="text-primary">{name}</span>
                <span className="text-muted-foreground">="{value}"</span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <div className={cn('rounded-md border p-1.5', muted && 'bg-muted/30')}>
      <p className="text-xs font-semibold tabular-nums leading-none">{value}</p>
      <p className="mt-0.5 text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}
