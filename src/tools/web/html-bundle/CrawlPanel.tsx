import { useId, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDownIcon, SparklesIcon } from 'lucide-react'

import { DEFAULT_MAX_PAGES, MAX_PAGES_CEILING } from '@/core/engines/htmlArchive'
import { MAX_CRAWL_DEPTH, type CrawlScope, type RenderMode } from '@/core/engines/htmlArchive/crawl'
import { ChoiceChips } from '@/shared/components/ChoiceChips'
import { NumberField } from '@/shared/components/NumberField'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/utils/cn'

import type { CrawlSettings } from './crawlSettings'

import './i18n'

const DEPTHS = ['1', '2', '3', '5', 'any'] as const
const PARALLEL = ['1', '2', '4', '8'] as const
const LIMIT_PRESETS = [50, DEFAULT_MAX_PAGES, 1000, MAX_PAGES_CEILING] as const

interface CrawlPanelProps {
  settings: CrawlSettings
  onChange: (patch: Partial<CrawlSettings>) => void
  pageUrl: string
  framework: string | null
  pageLimit: number
  limitText: string
  onLimitText: (value: string) => void
  onLimitPreset: (value: number) => void
  busy: boolean
}

function locationOf(url: string) {
  try {
    const { host, pathname } = new URL(url)
    return { host, folder: pathname.slice(0, pathname.lastIndexOf('/') + 1) || '/' }
  } catch {
    return { host: '', folder: '/' }
  }
}

export function CrawlPanel({
  settings,
  onChange,
  pageUrl,
  framework,
  pageLimit,
  limitText,
  onLimitText,
  onLimitPreset,
  busy,
}: CrawlPanelProps) {
  const { t } = useTranslation()
  const [moreOpen, setMoreOpen] = useState(false)
  const moreId = useId()
  const { host, folder } = locationOf(pageUrl)
  const depthValue = settings.maxDepth >= MAX_CRAWL_DEPTH ? 'any' : String(settings.maxDepth)
  const depthHint =
    depthValue === 'any'
      ? t('htmlBundle.crawl.depthHintAny')
      : t('htmlBundle.crawl.depthHint', { count: settings.maxDepth })

  return (
    <section
      aria-label={t('htmlBundle.crawl.modeSite')}
      className={cn('@container flex flex-col gap-3 rounded-xl border bg-card p-3', busy && 'pointer-events-none opacity-60')}
    >
      {framework && (
        <p
          className={cn(
            'flex items-start gap-2 rounded-lg px-2.5 py-2 text-[11px] leading-4',
            settings.render === 'off'
              ? 'bg-amber-500/10 text-amber-800 dark:text-amber-300'
              : 'bg-primary/[0.07] text-foreground',
          )}
        >
          <SparklesIcon className="mt-px size-3.5 shrink-0 text-primary" aria-hidden />
          <span className="min-w-0">
            <span className="font-semibold">{t('htmlBundle.crawl.frameworkDetected', { framework })}</span>{' '}
            {settings.render === 'off' ? t('htmlBundle.crawl.frameworkRenderOff') : t('htmlBundle.crawl.frameworkRender')}
          </span>
        </p>
      )}

      <div className="grid gap-3 @[480px]:grid-cols-2">
        <Field
          label={t('htmlBundle.crawl.scope')}
          hint={
            settings.scope === 'site'
              ? t('htmlBundle.crawl.scopeSiteHint', { host })
              : t('htmlBundle.crawl.scopeFolderHint', { path: folder })
          }
        >
          <ChoiceChips<CrawlScope>
            ariaLabel={t('htmlBundle.crawl.scope')}
            columns={2}
            value={settings.scope}
            onValueChange={(scope) => onChange({ scope })}
            options={[
              { value: 'folder', label: t('htmlBundle.crawl.scopeFolder') },
              { value: 'site', label: t('htmlBundle.crawl.scopeSite') },
            ]}
          />
        </Field>
        <Field label={t('htmlBundle.crawl.depth')} hint={depthHint}>
          <ChoiceChips<(typeof DEPTHS)[number]>
            ariaLabel={t('htmlBundle.crawl.depth')}
            columns={5}
            value={DEPTHS.includes(depthValue as (typeof DEPTHS)[number]) ? (depthValue as (typeof DEPTHS)[number]) : '3'}
            onValueChange={(value) => onChange({ maxDepth: value === 'any' ? MAX_CRAWL_DEPTH : Number(value) })}
            options={DEPTHS.map((value) => ({
              value,
              label: value === 'any' ? t('htmlBundle.crawl.depthAny') : value,
            }))}
          />
        </Field>
      </div>

      <Field label={t('htmlBundle.crawl.maxPages')} hint={t('htmlBundle.crawl.maxPagesHint')}>
        <div className="flex flex-wrap items-center gap-1.5">
          <NumberField
            value={limitText}
            onChange={onLimitText}
            ariaLabel={t('htmlBundle.crawl.maxPages')}
            min={1}
            max={MAX_PAGES_CEILING}
            disabled={busy}
            className="h-8 w-20 shrink-0 text-right text-xs"
          />
          <div className="flex flex-wrap gap-1">
            {LIMIT_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                disabled={busy}
                onClick={() => onLimitPreset(preset)}
                aria-pressed={pageLimit === preset}
                className={cn(
                  'h-8 min-w-11 rounded-lg border px-2 text-xs font-medium tabular-nums outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
                  pageLimit === preset
                    ? 'border-primary/50 bg-primary/10 text-primary'
                    : 'border-input bg-background text-muted-foreground hover:border-foreground/20 hover:text-foreground',
                )}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>
      </Field>

      <div className="border-t pt-2">
        <button
          type="button"
          aria-expanded={moreOpen}
          aria-controls={moreId}
          onClick={() => setMoreOpen((open) => !open)}
          className="flex min-h-8 w-full items-center justify-between gap-2 rounded-md px-1 text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          {t('htmlBundle.crawl.moreOptions')}
          <ChevronDownIcon
            className={cn('size-4 transition-transform duration-200 motion-reduce:transition-none', moreOpen && 'rotate-180')}
            aria-hidden
          />
        </button>
        {moreOpen && (
          <div id={moreId} className="mt-2 grid gap-3 @[480px]:grid-cols-2">
            <Field label={t('htmlBundle.crawl.parallel')} hint={t('htmlBundle.crawl.parallelHint')}>
              <ChoiceChips<(typeof PARALLEL)[number]>
                ariaLabel={t('htmlBundle.crawl.parallel')}
                columns={4}
                value={
                  PARALLEL.includes(String(settings.concurrency) as (typeof PARALLEL)[number])
                    ? (String(settings.concurrency) as (typeof PARALLEL)[number])
                    : '4'
                }
                onValueChange={(value) => onChange({ concurrency: Number(value) })}
                options={PARALLEL.map((value) => ({ value, label: value }))}
              />
            </Field>
            <Field label={t('htmlBundle.crawl.render')} hint={t('htmlBundle.crawl.renderHint')}>
              <ChoiceChips<RenderMode>
                ariaLabel={t('htmlBundle.crawl.render')}
                columns={3}
                value={settings.render}
                onValueChange={(render) => onChange({ render })}
                options={[
                  { value: 'off', label: t('htmlBundle.crawl.renderOff') },
                  { value: 'auto', label: t('htmlBundle.crawl.renderAuto') },
                  { value: 'always', label: t('htmlBundle.crawl.renderAlways') },
                ]}
              />
            </Field>
            <label className="flex items-start justify-between gap-3 rounded-lg border px-2.5 py-2">
              <span className="min-w-0">
                <span className="block text-xs font-medium">{t('htmlBundle.crawl.assets')}</span>
                <span className="block text-[11px] leading-4 text-muted-foreground">
                  {t('htmlBundle.crawl.assetsHint')}
                </span>
              </span>
              <Switch
                checked={settings.includeAssets}
                onCheckedChange={(includeAssets) => onChange({ includeAssets })}
                aria-label={t('htmlBundle.crawl.assets')}
                className="mt-0.5"
              />
            </label>
            <Field label={t('htmlBundle.crawl.exclude')} hint={t('htmlBundle.crawl.excludeHint')}>
              <Input
                value={settings.excludeText}
                onChange={(event) => onChange({ excludeText: event.target.value })}
                placeholder={t('htmlBundle.crawl.excludePlaceholder')}
                aria-label={t('htmlBundle.crawl.exclude')}
                spellCheck={false}
                className="h-8 text-xs"
              />
            </Field>
          </div>
        )}
      </div>
    </section>
  )
}

function Field({ label, hint, children }: { label: string; hint: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">{label}</span>
      {children}
      <span className="text-[11px] leading-4 text-muted-foreground">{hint}</span>
    </div>
  )
}
