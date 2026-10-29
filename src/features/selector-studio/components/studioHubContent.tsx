import {
  DownloadIcon,
  StarIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  frameworkSnippets,
  type SelectorCandidate,
  type SelectorSnapshot,
} from '@/core/engines/selector-studio'
import { CopyButton } from '@/shared/components/CopyButton'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'

import { clearHistory, exportHistory, importHistory } from '../history'
import type { SelectorStudioModel } from '../useSelectorStudio'
import { HubSelectorLine } from './HubSelectorLine'

export const HUB_TABS = ['attributes', 'css', 'xpath', 'relCss', 'relXpath', 'code'] as const
export const HUB_FULL_TABS = [...HUB_TABS, 'history', 'inspect'] as const

const REL_STRATEGIES = new Set<SelectorCandidate['strategy']>([
  'relative',
  'ancestor',
  'parent-child',
  'sibling',
  'structural',
])

export type HubTab = (typeof HUB_FULL_TABS)[number]

export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url || '—'
  }
}

export function elementChip(snapshot: SelectorSnapshot): string {
  const classes = snapshot.classes.length ? `.${snapshot.classes.slice(0, 4).join('.')}` : ''
  const id = snapshot.id ? `#${snapshot.id}` : ''
  return `${snapshot.tag}${id}${classes}`
}

export function filterHubCandidates(
  candidates: SelectorCandidate[],
  kind: 'css' | 'xpath',
  rel: boolean,
): SelectorCandidate[] {
  return candidates.filter((item) => {
    if (item.kind !== kind) return false
    const isRel = REL_STRATEGIES.has(item.strategy)
    return rel ? isRel : !isRel
  })
}

export function HubEmpty() {
  const { t } = useTranslation()
  return (
    <p className="py-8 text-center text-[11px] text-muted-foreground">{t('studio.noElement')}</p>
  )
}

export function HubSelectorList({
  model,
  items,
}: {
  model: SelectorStudioModel
  items: SelectorCandidate[]
}) {
  if (!model.snapshot) return <HubEmpty />
  if (!items.length) return <HubEmpty />
  return (
    <div className="rounded border border-border/60">
      {items.map((item) => (
        <HubSelectorLine
          key={item.id}
          candidate={item}
          selected={model.active?.id === item.id}
          onSelect={() => {
            model.setActive(item)
            void model.highlight(item)
          }}
          onHighlight={() => void model.highlight(item)}
        />
      ))}
    </div>
  )
}

export function CodePanel({ model }: { model: SelectorStudioModel }) {
  const { t } = useTranslation()
  const snippets = useMemo(() => {
    if (!model.snapshot) return []
    const all = frameworkSnippets(model.snapshot, model.candidates)
    const preferred = all.filter((item) => item.framework === model.settings.defaultFramework)
    return [...preferred, ...all.filter((item) => item.framework !== model.settings.defaultFramework)]
  }, [model.candidates, model.settings.defaultFramework, model.snapshot])

  if (!model.snapshot) return <HubEmpty />
  return (
    <div className="flex flex-col gap-2">
      {snippets.map((snippet) => (
        <article
          key={`${snippet.framework}-${snippet.api}-${snippet.locator}`}
          className="border-b border-border/60 pb-2 last:border-0"
        >
          <p className="text-[11px] font-medium">{snippet.label}</p>
          <pre className="mt-1 overflow-x-auto font-mono text-[10px] leading-5 text-muted-foreground">
            {snippet.code}
          </pre>
          <CopyButton text={snippet.code} size="xs" />
        </article>
      ))}
      {!snippets.length && (
        <p className="py-6 text-center text-[11px] text-muted-foreground">{t('studio.noCandidates')}</p>
      )}
    </div>
  )
}

export function HistoryPanel({
  model,
  name,
  setName,
  compact = false,
}: {
  model: SelectorStudioModel
  name: string
  setName: (value: string) => void
  compact?: boolean
}) {
  const { t } = useTranslation()
  const inputClass = compact ? 'h-7 max-w-56 text-xs' : 'h-9 max-w-md text-sm'
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('studio.history.name')}
          className={inputClass}
        />
        <Button size={compact ? 'xs' : 'sm'} onClick={() => void model.saveActive(name || undefined)}>
          {t('studio.history.save')}
        </Button>
        <Button
          size={compact ? 'xs' : 'sm'}
          variant="outline"
          onClick={() => {
            const blob = new Blob([exportHistory(model.history)], { type: 'application/json' })
            const url = URL.createObjectURL(blob)
            const anchor = document.createElement('a')
            anchor.href = url
            anchor.download = 'selector-studio-history.json'
            anchor.click()
            window.setTimeout(() => URL.revokeObjectURL(url), 500)
          }}
        >
          <DownloadIcon /> {t('studio.history.export')}
        </Button>
        <Button
          size={compact ? 'xs' : 'sm'}
          variant="outline"
          onClick={() => {
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = 'application/json'
            input.onchange = () => {
              const file = input.files?.[0]
              if (!file) return
              void file.text().then(async (text) => {
                const next = importHistory(text, model.history)
                model.setHistory(next)
                const { set } = await import('@/core/storage')
                const { STORAGE_KEYS } = await import('@/core/constants')
                await set(STORAGE_KEYS.selectorStudio, { history: next, settings: model.settings })
              })
            }
            input.click()
          }}
        >
          <UploadIcon /> {t('studio.history.import')}
        </Button>
        <Button
          size={compact ? 'xs' : 'sm'}
          variant="ghost"
          onClick={() => {
            void clearHistory().then(() =>
              model.setHistory(model.history.filter((item) => item.favorite)),
            )
          }}
        >
          {t('studio.history.clear')}
        </Button>
      </div>
      {model.history.length === 0 ? (
        <p className="py-8 text-center text-xs text-muted-foreground">{t('studio.history.empty')}</p>
      ) : (
        model.history.map((item) => (
          <article key={item.id} className="border-b border-border/60 pb-2">
            {item.name && <p className="text-[11px] font-medium">{item.name}</p>}
            <code className="block break-all font-mono text-[11px]">{item.expression}</code>
            <div className="mt-1 flex gap-1">
              <Button size="xs" variant="outline" onClick={() => void model.restoreHistory(item)}>
                {t('studio.history.use')}
              </Button>
              <CopyButton text={item.expression} />
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label={t('studio.history.favorite')}
                onClick={() => void model.updateHistoryEntry(item.id, { favorite: !item.favorite })}
              >
                <StarIcon className={item.favorite ? 'fill-current' : undefined} />
              </Button>
              <Button
                size="icon-xs"
                variant="ghost"
                aria-label={t('studio.history.delete')}
                onClick={() => void model.removeHistoryEntry(item.id)}
              >
                <Trash2Icon />
              </Button>
            </div>
          </article>
        ))
      )}
    </div>
  )
}

export function useHistoryNameState() {
  return useState('')
}
