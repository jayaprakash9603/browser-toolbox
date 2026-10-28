import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScanSearchIcon } from 'lucide-react'

import type { CapturedElement, SelectorSet } from '@/core/engines/selector'
import { locatorsOf, selectorRows } from '@/core/engines/selector/inspect'
import { CopyButton } from '@/shared/components/CopyButton'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'

import { countCssOnPage } from './pick'

const LABELS: Record<string, string> = {
  cssId: 'CSS · ID',
  cssClass: 'CSS · Class',
  cssAttribute: 'CSS · Attribute',
  cssRelative: 'CSS · Relative',
  cssAbsolute: 'CSS · Absolute',
  xpathId: 'XPath · ID',
  xpathClass: 'XPath · Class',
  xpathAttribute: 'XPath · Attribute',
  xpathText: 'XPath · Text',
  xpathRelative: 'XPath · Relative',
  xpathAbsolute: 'XPath · Absolute',
}

export function SelectorsTab({
  element,
  selectors,
}: {
  element: CapturedElement
  selectors: SelectorSet
}) {
  const { t } = useTranslation()
  const rows = selectorRows(selectors)
  const locators = locatorsOf(element, selectors)
  const [hits, setHits] = useState<Record<string, number | null>>({})
  const [checking, setChecking] = useState<string | null>(null)

  const check = async (key: string, value: string) => {
    setChecking(key)
    const count = await countCssOnPage(value)
    setHits((current) => ({ ...current, [key]: count }))
    setChecking(null)
  }

  return (
    <div className="flex flex-col gap-3" data-search-id="section-selectors">
      <section className="flex flex-col gap-1.5">
        <h3 className="text-[11px] font-medium text-muted-foreground">{t('inspectorEl.css')}</h3>
        {rows
          .filter((row) => row.group === 'css')
          .map((row) => (
            <SelectorRow
              key={row.key}
              label={LABELS[row.key] ?? row.key}
              value={row.value}
              hit={hits[row.key]}
              checking={checking === row.key}
              onCheck={() => void check(row.key, row.value)}
            />
          ))}
      </section>
      <section className="flex flex-col gap-1.5">
        <h3 className="text-[11px] font-medium text-muted-foreground">{t('inspectorEl.xpath')}</h3>
        {rows
          .filter((row) => row.group === 'xpath')
          .map((row) => (
            <SelectorRow key={row.key} label={LABELS[row.key] ?? row.key} value={row.value} />
          ))}
      </section>
      <section className="rounded-xl border bg-card p-2.5 shadow-xs">
        <h3 className="mb-1.5 text-[11px] font-medium text-muted-foreground">
          {t('inspectorEl.locators')}
        </h3>
        <div className="flex flex-col gap-1.5">
          <LocatorRow label={t('inspectorEl.playwright')} value={locators.playwright} />
          <LocatorRow label={t('inspectorEl.cypress')} value={locators.cypress} />
          <LocatorRow label={t('inspectorEl.testingLibrary')} value={locators.testingLibrary} />
          <LocatorRow label={t('inspectorEl.xpath')} value={locators.xpath} />
        </div>
      </section>
    </div>
  )
}

function SelectorRow({
  label,
  value,
  hit,
  checking,
  onCheck,
}: {
  label: string
  value: string
  hit?: number | null
  checking?: boolean
  onCheck?: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-1.5 rounded-lg border bg-card p-1.5">
      <span className="w-[6.75rem] shrink-0 text-[11px] font-medium text-muted-foreground">{label}</span>
      <code className="min-w-0 flex-1 truncate font-mono text-[11px]">{value}</code>
      {hit === 1 && (
        <Badge variant="secondary" className="text-[10px]">
          {t('inspectorEl.uniqueOne')}
        </Badge>
      )}
      {hit != null && hit > 1 && (
        <Badge variant="outline" className="text-[10px]">
          {t('inspectorEl.uniqueMany', { count: hit })}
        </Badge>
      )}
      {hit === -1 && (
        <Badge variant="destructive" className="text-[10px]">
          {t('inspectorEl.uniqueInvalid')}
        </Badge>
      )}
      {hit === null && (
        <Badge variant="outline" className="text-[10px]">
          {t('inspectorEl.uniqueUnknown')}
        </Badge>
      )}
      {onCheck && (
        <Button
          variant="ghost"
          size="icon-xs"
          onClick={onCheck}
          disabled={checking}
          aria-label={t('inspectorEl.unique')}
        >
          <ScanSearchIcon />
        </Button>
      )}
      <CopyButton text={value} />
    </div>
  )
}

function LocatorRow({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-24 shrink-0 text-[11px] text-muted-foreground">{label}</span>
      <code className="min-w-0 flex-1 truncate font-mono text-[11px]">{value}</code>
      <CopyButton text={value} />
    </div>
  )
}
