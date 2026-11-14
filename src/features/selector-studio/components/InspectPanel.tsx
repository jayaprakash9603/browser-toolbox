import { useTranslation } from 'react-i18next'

import type { ElementInspect } from '@/core/engines/selector-studio'
import { CopyButton } from '@/shared/components/CopyButton'
import { Badge } from '@/shared/components/ui/badge'
import { cn } from '@/shared/utils/cn'

import { BoxModel } from './BoxModel'

export type InspectSection = 'styles' | 'computed' | 'listeners'

export function InspectPanel({
  inspect,
  inspecting,
  section,
}: {
  inspect: ElementInspect | null
  inspecting: boolean
  section: InspectSection
}) {
  const { t } = useTranslation()
  if (inspecting && !inspect) {
    return (
      <p role="status" aria-busy="true" className="rounded-md border border-dashed px-2 py-8 text-center text-xs text-muted-foreground">
        {t('studio.inspectLoading')}
      </p>
    )
  }
  if (!inspect) {
    return (
      <p className="rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground">
        {t('studio.inspectEmpty')}
      </p>
    )
  }

  if (section === 'styles') return <StylesSection inspect={inspect} />
  if (section === 'computed') return <ComputedSection inspect={inspect} />
  return <ListenersSection inspect={inspect} />
}

function StylesSection({ inspect }: { inspect: ElementInspect }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-3">
      <BoxModel inspect={inspect} />
      {inspect.classes.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {inspect.classes.map((cls) => (
            <Badge key={cls} variant="secondary" className="min-w-0 max-w-full">
              <span className="min-w-0 truncate">.{cls}</span>
            </Badge>
          ))}
        </div>
      )}
      <Row label={t('studio.inlineStyle')} value={inspect.inlineStyle || '—'} copy={inspect.inlineStyle} />
      {inspect.rules.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">{t('studio.noMatchedRules')}</p>
      ) : (
        inspect.rules.map((rule, index) => (
          <article key={`${rule.selector}-${index}`} className="rounded-md border p-3">
            <code className="block wrap-anywhere font-mono text-[11px]">{rule.selector}</code>
            <p className="mt-1.5 truncate text-[10px] text-muted-foreground">{rule.href}</p>
            <pre className="mt-1.5 wrap-anywhere whitespace-pre-wrap font-mono text-[11px] leading-5">{rule.cssText || '—'}</pre>
            {rule.cssText ? (
              <div className="mt-2">
                <CopyButton text={`${rule.selector} { ${rule.cssText} }`} size="xs" />
              </div>
            ) : null}
          </article>
        ))
      )}
    </div>
  )
}

function ComputedSection({ inspect }: { inspect: ElementInspect }) {
  const { t } = useTranslation()
  if (!inspect.computed.length) {
    return <p className="text-[11px] text-muted-foreground">{t('studio.noComputed')}</p>
  }
  return (
    <dl className="grid grid-cols-[minmax(0,7.5rem)_1fr] gap-x-3 gap-y-2 text-[11px]">
      {inspect.computed.map((item) => (
        <div key={item.name} className="contents">
          <dt className="min-w-0 truncate pt-1 text-muted-foreground">{item.name}</dt>
          <dd className="min-w-0">
            <span className="inline-flex max-w-full items-start gap-2">
              <span className="wrap-anywhere pt-1 font-mono">{item.value}</span>
              <CopyButton text={item.value} size="icon-xs" />
            </span>
          </dd>
        </div>
      ))}
    </dl>
  )
}

function ListenersSection({ inspect }: { inspect: ElementInspect }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[11px] text-muted-foreground">
        {inspect.listenerSource === 'devtools' ? t('studio.listenersDevtools') : t('studio.listenersAttrs')}
      </p>
      {inspect.listeners.length === 0 ? (
        <p className="text-[11px] text-muted-foreground">{t('studio.noListeners')}</p>
      ) : (
        inspect.listeners.map((item, index) => (
          <div key={`${item.source}-${item.type}-${index}`} className="flex flex-wrap items-center gap-2 rounded-md border px-2.5 py-2 text-[11px]">
            <code className="font-mono">{item.type}</code>
            <Badge variant="outline">{item.source}</Badge>
            <span className="text-muted-foreground">×{item.count}</span>
            {item.capture ? <Badge variant="secondary">capture</Badge> : null}
          </div>
        ))
      )}
    </div>
  )
}

function Row({ label, value, copy }: { label: string; value: string; copy?: string }) {
  return (
    <div className={cn('rounded-md border p-3')}>
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <code className="mt-1 block wrap-anywhere font-mono text-[11px] leading-5">{value}</code>
      {copy ? (
        <div className="mt-2">
          <CopyButton text={copy} size="xs" />
        </div>
      ) : null}
    </div>
  )
}
