import {
  CrosshairIcon,
  DownloadIcon,
  HighlighterIcon,
  KeyboardIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  SettingsIcon,
  StarIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react'
import { useMemo, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

import {
  FRAMEWORK_LABELS,
  RANK_MODES,
  frameworkSnippets,
  type FrameworkId,
  type SelectorCandidate,
  type SelectorSnapshot,
} from '@/core/engines/selector-studio'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { CopyButton } from '@/shared/components/CopyButton'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Input } from '@/shared/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { cn } from '@/shared/utils/cn'

import { clearHistory, exportHistory, importHistory } from '../history'
import type { SelectorStudioModel } from '../useSelectorStudio'
import { HubAttributesTable } from './HubAttributesTable'
import { HubSelectorLine } from './HubSelectorLine'
import { InspectPanel, type InspectSection } from './InspectPanel'
import { Playground } from './Playground'

const HUB_TABS = ['attributes', 'css', 'xpath', 'relCss', 'relXpath', 'code'] as const
const HUB_FULL_TABS = [...HUB_TABS, 'history', 'inspect'] as const
const INSPECT_SECTIONS: InspectSection[] = ['styles', 'computed', 'listeners']

const REL_STRATEGIES = new Set<SelectorCandidate['strategy']>([
  'relative',
  'ancestor',
  'parent-child',
  'sibling',
  'structural',
])

type HubTab = (typeof HUB_FULL_TABS)[number]

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url || '—'
  }
}

function elementChip(snapshot: SelectorSnapshot): string {
  const classes = snapshot.classes.length ? `.${snapshot.classes.slice(0, 4).join('.')}` : ''
  const id = snapshot.id ? `#${snapshot.id}` : ''
  return `${snapshot.tag}${id}${classes}`
}

function filterHubCandidates(
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

export function SelectorStudioView({
  model,
  compact = false,
  embedded = false,
  pane = false,
}: {
  model: SelectorStudioModel
  compact?: boolean
  embedded?: boolean
  pane?: boolean
}) {
  const { t } = useTranslation()
  const tabs = pane ? HUB_TABS : HUB_FULL_TABS
  const [tab, setTab] = useDeepLinkTab('tab', tabs, 'css')
  const [inspectSection, setInspectSection] = useDeepLinkTab('inspect', INSPECT_SECTIONS, 'styles')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [playground, setPlayground] = useState(false)
  const [name, setName] = useState('')
  const { snapshot, active } = model

  const onKeyDown = (event: KeyboardEvent) => {
    if (!(event.altKey && event.shiftKey)) return
    if (event.code === 'KeyP') {
      event.preventDefault()
      void model.pick()
    } else if (event.code === 'KeyY') {
      event.preventDefault()
      if (active) void navigator.clipboard.writeText(active.expression)
    } else if (event.code === 'KeyX') {
      event.preventDefault()
      setTab('xpath')
    } else if (event.code === 'KeyG') {
      event.preventDefault()
      setTab('css')
    } else if (event.code === 'Slash') {
      event.preventDefault()
      setPlayground(true)
    } else if (event.code === 'Backspace') {
      event.preventDefault()
      void model.clearSelection()
    }
  }

  return (
    <div
      className={cn('@container flex h-full min-h-0 flex-col outline-none', compact || pane ? 'p-1.5' : 'p-2.5')}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <header className="shrink-0 space-y-1 border-b border-border/80 pb-1.5">
        <div className="flex items-center gap-1">
          {!embedded && (
            <h1 className="min-w-0 flex-1 truncate text-[12px] font-semibold tracking-tight">
              {pane ? t('studio.hub.titlePane') : t('studio.hub.title')}
            </h1>
          )}
          {embedded && <div className="flex-1" />}
          <Button
            size="xs"
            variant={model.picking ? 'default' : 'outline'}
            className="h-7 gap-1 px-2 text-[11px]"
            aria-keyshortcuts="Alt+Shift+P"
            aria-pressed={model.picking}
            onClick={() => void model.pick()}
          >
            <CrosshairIcon className="size-3.5" aria-hidden />
            {model.picking ? t('studio.cancelPick') : t('studio.pick')}
          </Button>
          <Button
            size="icon-xs"
            variant="ghost"
            aria-label={t('studio.refresh')}
            onClick={() => void model.reanalyze()}
          >
            <RefreshCwIcon className={cn('size-3.5', model.analyzing && 'animate-spin')} />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon-xs" variant="ghost" aria-label={t('studio.more')}>
                <MoreHorizontalIcon className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => setSettingsOpen((v) => !v)}>
                <SettingsIcon /> {t('studio.settings')}
              </DropdownMenuItem>
              {active && (
                <>
                  <DropdownMenuItem onClick={() => setPlayground(true)}>
                    <PencilIcon /> {t('studio.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void model.highlight(active)}>
                    <HighlighterIcon /> {t('studio.highlight')}
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem onClick={() => void model.clearHighlight()}>
                {t('studio.clearHighlight')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void model.clearSelection()}>{t('studio.clear')}</DropdownMenuItem>
              {model.client.kind === 'devtools' && (
                <DropdownMenuItem onClick={model.inspect}>{t('studio.inspect')}</DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <KeyboardIcon /> {t('studio.shortcuts')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <p className="truncate font-mono text-[10px] text-muted-foreground">
          {snapshot ? elementChip(snapshot) : t('studio.noElement')}
          {!pane && (
            <>
              {' · '}
              {hostOf(snapshot?.pageUrl || model.pageUrl)}
            </>
          )}
        </p>
      </header>

      {settingsOpen && (
        <div className="mt-1.5 flex flex-wrap items-center gap-2 border-b border-border/60 pb-2 text-[11px]">
          <label className="flex items-center gap-1.5">
            {t('studio.rank')}
            <select
              className="h-7 rounded-md border bg-background px-2"
              value={model.settings.rankMode}
              onChange={(event) => void model.setRankMode(event.target.value as (typeof RANK_MODES)[number])}
            >
              {RANK_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {t(`studio.rank.${mode}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            {t('studio.defaultFramework')}
            <select
              className="h-7 rounded-md border bg-background px-2"
              value={model.settings.defaultFramework}
              onChange={(event) =>
                void model.patchSettings({ defaultFramework: event.target.value as FrameworkId })
              }
            >
              {Object.entries(FRAMEWORK_LABELS).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={model.settings.autoHighlight}
              onChange={(event) => void model.patchSettings({ autoHighlight: event.target.checked })}
            />
            {t('studio.autoHighlight')}
          </label>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto pt-1.5">
        {model.picking && (
          <p role="status" aria-busy="true" className="mb-1.5 text-[11px] text-primary">
            {t('studio.pickProgress')}
          </p>
        )}
        {model.stale && !model.picking && (
          <p className="mb-1.5 text-[11px] text-muted-foreground">{t('studio.stale')}</p>
        )}
        {model.error && (
          <p className="mb-1.5 text-[11px] text-destructive">{model.error}</p>
        )}

        {snapshot && active && (
          <div className="mb-2 flex items-start gap-1 rounded border border-border/80 bg-muted/30 px-2 py-1.5">
            <code className="min-w-0 flex-1 break-all font-mono text-[11px] leading-5">{active.expression}</code>
            <CopyButton text={active.expression} />
          </div>
        )}

        {playground && active && (
          <div className="mb-2">
            <Playground
              candidate={active}
              onValidate={model.validateExpression}
              onReset={() => snapshot && void model.reanalyze()}
            />
          </div>
        )}

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as HubTab)}
          className="gap-1.5"
        >
          <TabsList variant="underline" scrollButtons="auto" className="h-8 w-full max-w-full justify-start">
            {tabs.map((id) => (
              <TabsTrigger key={id} value={id} className="h-8 px-2.5 text-[11px]">
                {t(`studio.tab.${id}`)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="attributes" className="mt-0">
            {snapshot ? <HubAttributesTable snapshot={snapshot} /> : <HubEmpty />}
          </TabsContent>

          <TabsContent value="css" className="mt-0">
            <HubSelectorList
              model={model}
              items={filterHubCandidates(model.candidates, 'css', false)}
            />
          </TabsContent>

          <TabsContent value="xpath" className="mt-0">
            <HubSelectorList
              model={model}
              items={filterHubCandidates(model.candidates, 'xpath', false)}
            />
          </TabsContent>

          <TabsContent value="relCss" className="mt-0">
            <HubSelectorList
              model={model}
              items={filterHubCandidates(model.candidates, 'css', true)}
            />
          </TabsContent>

          <TabsContent value="relXpath" className="mt-0">
            <HubSelectorList
              model={model}
              items={filterHubCandidates(model.candidates, 'xpath', true)}
            />
          </TabsContent>

          <TabsContent value="code" className="mt-0">
            <CodePanel model={model} />
          </TabsContent>

          <TabsContent value="history" className="mt-0">
            <HistoryPanel model={model} name={name} setName={setName} />
          </TabsContent>

          <TabsContent value="inspect" className="mt-0">
            <div className="flex flex-col gap-2">
              <div className="flex flex-wrap gap-1">
                {INSPECT_SECTIONS.map((section) => (
                  <Button
                    key={section}
                    size="xs"
                    variant={inspectSection === section ? 'default' : 'outline'}
                    aria-pressed={inspectSection === section}
                    onClick={() => setInspectSection(section)}
                  >
                    {t(`studio.tab.${section}`)}
                  </Button>
                ))}
              </div>
              <InspectPanel inspect={model.elementInspect} inspecting={model.inspecting} section={inspectSection} />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <p className="sr-only" role="status">
        {!model.picking &&
          (active ? active.expression : t('studio.noElement'))}
      </p>
    </div>
  )
}

function HubEmpty() {
  const { t } = useTranslation()
  return (
    <p className="py-8 text-center text-[11px] text-muted-foreground">{t('studio.noElement')}</p>
  )
}

function HubSelectorList({
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

function CodePanel({ model }: { model: SelectorStudioModel }) {
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
        <article key={`${snippet.framework}-${snippet.api}-${snippet.locator}`} className="border-b border-border/60 pb-2 last:border-0">
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

function HistoryPanel({
  model,
  name,
  setName,
}: {
  model: SelectorStudioModel
  name: string
  setName: (value: string) => void
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-1.5">
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t('studio.history.name')}
          className="h-7 max-w-56 text-xs"
        />
        <Button size="xs" onClick={() => void model.saveActive(name || undefined)}>
          {t('studio.history.save')}
        </Button>
        <Button
          size="xs"
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
          size="xs"
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
          size="xs"
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
