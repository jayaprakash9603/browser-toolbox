import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDownIcon } from 'lucide-react'

import { MAX_PAGES_CEILING } from '@/core/engines/htmlArchive'
import { MAX_CRAWL_DEPTH, type CrawlScope } from '@/core/engines/htmlArchive/crawl'
import { ChoiceChips } from '@/shared/components/ChoiceChips'
import { NumberField } from '@/shared/components/NumberField'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/utils/cn'

import type { LinkCrawlSettings } from './crawlSettings'

const DEPTHS = ['1', '2', '3', '5', 'any'] as const
const LIMIT_PRESETS = [50, 100, 150, MAX_PAGES_CEILING] as const

export function SiteCrawlPanel({
  settings,
  onChange,
  pageUrl,
  disabled,
}: {
  settings: LinkCrawlSettings
  onChange: (patch: Partial<LinkCrawlSettings>) => void
  pageUrl: string
  disabled?: boolean
}) {
  const { t } = useTranslation()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreId = useId()
  let host = ''
  try {
    host = new URL(pageUrl).host
  } catch {
    /* ignore */
  }
  const depthValue = settings.maxDepth >= MAX_CRAWL_DEPTH ? 'any' : String(settings.maxDepth)

  return (
    <div
      className={cn('flex flex-col gap-2.5 rounded-xl border bg-muted/30 p-2.5', disabled && 'pointer-events-none opacity-60')}
    >
      <p className="text-[11px] leading-4 text-muted-foreground">{t('linkChecker.crawl.intro', { host: host || pageUrl })}</p>
      <ChoiceChips
        ariaLabel={t('linkChecker.crawl.scope')}
        value={settings.scope}
        onValueChange={(scope) => onChange({ scope: scope as CrawlScope })}
        columns={2}
        options={[
          { value: 'site', label: t('linkChecker.crawl.scopeSite') },
          { value: 'folder', label: t('linkChecker.crawl.scopeFolder') },
        ]}
      />
      <ChoiceChips
        ariaLabel={t('linkChecker.crawl.depth')}
        value={depthValue}
        onValueChange={(value) =>
          onChange({ maxDepth: value === 'any' ? MAX_CRAWL_DEPTH : Number.parseInt(value, 10) || 1 })
        }
        columns={5}
        options={DEPTHS.map((depth) => ({
          value: depth,
          label: depth === 'any' ? t('linkChecker.crawl.depthAny') : depth,
        }))}
      />
      <div className="flex flex-wrap items-end gap-2">
        <div className="min-w-[5.5rem] flex-1">
          <p className="mb-1 text-[11px] font-medium text-muted-foreground">{t('linkChecker.crawl.maxPages')}</p>
          <NumberField
            value={String(settings.maxPages)}
            onChange={(value) => {
              const maxPages = Number.parseInt(value, 10)
              if (Number.isFinite(maxPages) && maxPages >= 1) onChange({ maxPages })
            }}
            ariaLabel={t('linkChecker.crawl.maxPages')}
            min={1}
            max={MAX_PAGES_CEILING}
            disabled={disabled}
            className="h-8 w-full text-right text-xs"
          />
        </div>
        <div className="flex flex-1 flex-wrap gap-1">
          {LIMIT_PRESETS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ maxPages: n })}
              className={cn(
                'h-7 rounded-md border px-2 text-[11px] font-medium tabular-nums',
                settings.maxPages === n
                  ? 'border-primary/50 bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:border-foreground/20 hover:text-foreground',
              )}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        aria-expanded={moreOpen}
        aria-controls={moreId}
        onClick={() => setMoreOpen((open) => !open)}
        className="flex w-full items-center justify-between rounded-lg px-1 py-0.5 text-[11px] font-medium text-muted-foreground hover:text-foreground"
      >
        {t('linkChecker.crawl.moreOptions')}
        <ChevronDownIcon className={cn('size-3.5 transition-transform', moreOpen && 'rotate-180')} aria-hidden />
      </button>
      {moreOpen && (
        <div id={moreId} className="flex flex-col gap-2 border-t pt-2">
          <label className="grid gap-1">
            <span className="text-[11px] font-medium text-muted-foreground">{t('linkChecker.crawl.exclude')}</span>
            <Input
              value={settings.excludeText}
              onChange={(event) => onChange({ excludeText: event.target.value })}
              placeholder={t('linkChecker.crawl.excludePlaceholder')}
              className="h-8 text-xs"
            />
          </label>
        </div>
      )}
    </div>
  )
}
