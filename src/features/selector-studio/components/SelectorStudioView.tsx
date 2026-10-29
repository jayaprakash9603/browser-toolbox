import {
  CrosshairIcon,
  DownloadIcon,
  HighlighterIcon,
  KeyboardIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RefreshCwIcon,
  ScanSearchIcon,
  SettingsIcon,
  StarIcon,
  Trash2Icon,
  UploadIcon,
} from 'lucide-react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useMemo, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

import {
  FRAMEWORK_LABELS,
  RANK_MODES,
  frameworkSnippets,
  statusLabel,
  type FrameworkId,
} from '@/core/engines/selector-studio'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { CopyButton } from '@/shared/components/CopyButton'
import { Badge } from '@/shared/components/ui/badge'
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
import { CandidateBadges, CandidateRow } from './CandidateRow'
import { InspectPanel, type InspectSection } from './InspectPanel'
import { Playground } from './Playground'

const MAIN_TABS = ['recommended', 'xpath', 'css', 'inspect', 'frameworks', 'history'] as const
const PANE_TABS = ['recommended', 'styles', 'computed', 'listeners'] as const
const INSPECT_SECTIONS: InspectSection[] = ['styles', 'computed', 'listeners']
const ATTR_PREVIEW = ['data-testid', 'data-test', 'data-cy', 'name', 'type', 'role', 'aria-label']

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url || '—'
  }
}

export function SelectorStudioView({
  model,
  compact = false,
  embedded = false,
  pane = false,
}: {
  model: SelectorStudioModel
  compact?: boolean
  /** Hide the page title when ToolPage already provides the heading. */
  embedded?: boolean
  /** Dense Elements sidebar next to Styles / Computed / Event Listeners. */
  pane?: boolean
}) {
  const { t } = useTranslation()
  const reduce = useReducedMotion()
  const tabs = pane ? PANE_TABS : MAIN_TABS
  const [tab, setTab] = useDeepLinkTab('tab', tabs, 'recommended')
  const [inspectSection, setInspectSection] = useDeepLinkTab('inspect', INSPECT_SECTIONS, 'styles')
  const [playground, setPlayground] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [name, setName] = useState('')
  const { snapshot, active } = model

  const attrs = useMemo(() => {
    if (!snapshot) return []
    return Object.entries(snapshot.attributes).filter(([key]) => key !== 'class' && key !== 'style')
  }, [snapshot])

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
      setTab('recommended')
    } else if (event.code === 'Backspace') {
      event.preventDefault()
      void model.clearSelection()
    }
  }

  return (
    <div
      className={cn('@container flex h-full min-h-0 flex-col outline-none', compact ? 'p-2' : 'p-3')}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <header className="flex shrink-0 items-center gap-2 border-b pb-2">
        {!embedded && (
          <div className="flex size-7 items-center justify-center rounded-md border bg-primary/10">
            <ScanSearchIcon className="size-3.5 text-primary" aria-hidden />
          </div>
        )}
        <div className="min-w-0 flex-1">
          {!embedded && (
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[13px] font-semibold">Selector Studio</h1>
              <span className="hidden truncate text-[11px] text-muted-foreground @[420px]:inline">
                {t('studio.subtitle')}
              </span>
            </div>
          )}
          <p className="truncate font-mono text-[10px] text-muted-foreground">
            {t('studio.page')}: {hostOf(snapshot?.pageUrl || model.pageUrl)}
            {' · '}
            {snapshot ? `${snapshot.tag}${snapshot.id ? `#${snapshot.id}` : ''}` : t('studio.none')}
          </p>
          {pane && (
            <p className="truncate text-[10px] text-muted-foreground">{t('studio.paneHint')}</p>
          )}
        </div>
        <Button
          size="xs"
          variant={model.picking ? 'default' : 'outline'}
          aria-keyshortcuts="Alt+Shift+P"
          aria-pressed={model.picking}
          aria-busy={model.picking}
          onClick={() => void model.pick()}
        >
          <CrosshairIcon aria-hidden />
          {model.picking ? t('studio.cancelPick') : t('studio.pick')}
        </Button>
        <Button size="icon-xs" variant="outline" aria-label={t('studio.refresh')} onClick={() => void model.reanalyze()}>
          <RefreshCwIcon className={model.analyzing ? 'animate-spin' : undefined} />
        </Button>
        <Button
          size="icon-xs"
          variant="outline"
          aria-label={t('studio.settings')}
          onClick={() => setSettingsOpen((value) => !value)}
        >
          <SettingsIcon />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon-xs" variant="ghost" aria-label={t('studio.more')}>
              <MoreHorizontalIcon />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => void model.clearHighlight()}>
              {t('studio.clearHighlight')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void model.clearSelection()}>{t('studio.clear')}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled>
              <KeyboardIcon /> {t('studio.shortcuts')}
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="text-[11px] text-muted-foreground">
              {t('studio.shortcut.pick')}
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="text-[11px] text-muted-foreground">
              {t('studio.shortcut.copy')}
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="text-[11px] text-muted-foreground">
              {t('studio.shortcut.xpath')}
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="text-[11px] text-muted-foreground">
              {t('studio.shortcut.css')}
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="text-[11px] text-muted-foreground">
              {t('studio.shortcut.editor')}
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="text-[11px] text-muted-foreground">
              {t('studio.shortcut.clear')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {settingsOpen && (
        <div className="mt-2 flex flex-wrap items-center gap-2 rounded-md border p-2 text-[11px]">
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

      <div className="min-h-0 flex-1 overflow-y-auto pt-2">
        {model.picking && (
          <div
            aria-busy="true"
            className="mb-2 flex items-center gap-2 rounded-md border border-primary/40 bg-primary/10 px-2 py-1.5"
          >
            <span className="size-2 shrink-0 animate-pulse rounded-full bg-primary" aria-hidden />
            <p className="min-w-0 flex-1 text-[11px]">{t('studio.pickProgress')}</p>
            <Button size="xs" variant="outline" onClick={() => void model.pick()}>
              {t('studio.cancelPick')}
            </Button>
          </div>
        )}
        <ElementCard model={model} attrs={attrs} />
        {model.stale && !model.picking && (
          <p className="mt-2 rounded-md border border-dashed px-2 py-1.5 text-[11px] text-muted-foreground">
            {t('studio.stale')}
          </p>
        )}
        {model.analyzing && (
          <p role="status" aria-busy="true" className="mt-2 text-[11px] text-muted-foreground">
            {t('studio.analyzing')}
          </p>
        )}
        {model.error && (
          <p className="mt-2 rounded-md border border-destructive/40 px-2 py-1.5 text-[11px] text-destructive">
            {model.error}
          </p>
        )}

        <Tabs value={tab} onValueChange={(value) => setTab(value as (typeof tabs)[number])} className="mt-3 gap-2">
          <TabsList variant="pill" fullWidth className="flex-wrap">
            {tabs.map((id) => (
              <TabsTrigger key={id} value={id} className="shrink-0">
                {t(`studio.tab.${id}`)}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="recommended">
            {!snapshot || !active ? (
              <EmptyState />
            ) : (
              <AnimatePresence>
                <motion.div
                  key={snapshot.identityPath || snapshot.tag}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col gap-2"
                >
                  <div className="rounded-md border p-2.5">
                    <code className="block break-all font-mono text-[12px] leading-5">{active.expression}</code>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <CandidateBadges candidate={active} />
                      {(active.strategy === 'test-attribute' ||
                        active.strategy === 'id' ||
                        active.strategy === 'semantic') &&
                      active.uniqueness === 'unique' ? (
                        <Badge variant="outline">{t('studio.framework')}</Badge>
                      ) : null}
                    </div>
                    <p className="mt-1.5 text-[11px] text-muted-foreground">
                      {t('studio.score', { value: active.score })}
                    </p>
                    <ul className="mt-1 list-disc pl-4 text-[11px] text-muted-foreground">
                      {active.reasons.map((reason) => (
                        <li key={reason}>{reason}</li>
                      ))}
                      {active.warnings.map((warning) => (
                        <li key={warning}>{warning}</li>
                      ))}
                    </ul>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <CopyButton text={active.expression} size="xs" />
                      <Button size="xs" variant="outline" onClick={() => void model.testCandidate(active)}>
                        {t('studio.test')}
                      </Button>
                      <Button size="xs" variant="outline" onClick={() => void model.highlight(active)}>
                        <HighlighterIcon /> {t('studio.highlight')}
                      </Button>
                      {model.client.kind === 'devtools' && (
                        <Button size="xs" variant="outline" onClick={model.inspect}>
                          {t('studio.inspect')}
                        </Button>
                      )}
                      <Button size="xs" variant="outline" onClick={() => setPlayground(true)}>
                        <PencilIcon /> {t('studio.edit')}
                      </Button>
                      <Button size="xs" variant="ghost" onClick={() => setTab('xpath')}>
                        {t('studio.alternatives')}
                      </Button>
                    </div>
                  </div>
                  {playground && (
                    <Playground
                      candidate={active}
                      onValidate={model.validateExpression}
                      onReset={() => snapshot && void model.reanalyze()}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            )}
          </TabsContent>

          <TabsContent value="xpath">
            <Explorer kind="xpath" model={model} />
          </TabsContent>
          <TabsContent value="css">
            <Explorer kind="css" model={model} />
          </TabsContent>
          <TabsContent value="inspect">
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
          <TabsContent value="styles">
            <InspectPanel inspect={model.elementInspect} inspecting={model.inspecting} section="styles" />
          </TabsContent>
          <TabsContent value="computed">
            <InspectPanel inspect={model.elementInspect} inspecting={model.inspecting} section="computed" />
          </TabsContent>
          <TabsContent value="listeners">
            <InspectPanel inspect={model.elementInspect} inspecting={model.inspecting} section="listeners" />
          </TabsContent>
          <TabsContent value="frameworks">
            <FrameworksPanel model={model} />
          </TabsContent>
          <TabsContent value="history">
            <HistoryPanel model={model} name={name} setName={setName} />
          </TabsContent>
        </Tabs>
      </div>

      <footer className="mt-2 shrink-0 rounded-md border bg-muted/30 px-2 py-1.5">
        <div role="status" aria-atomic="true" className="text-[11px]">
          {model.picking
            ? t('studio.pickProgress')
            : active
              ? `${statusLabel(active)}. ${t('studio.matchStatus', { count: active.matchCount ?? 0 })}`
              : t('studio.noElement')}
        </div>
        {active && (
          <p className="text-[11px] text-muted-foreground">
            {active.intendedMatched === true
              ? t('studio.intendedYes')
              : active.intendedMatched === false
                ? t('studio.intendedNo')
                : t('studio.intendedUnknown')}
            {active.matchCount != null && active.matchCount > 50 ? ` ${t('studio.manyMatches')}` : ''}
          </p>
        )}
        {model.highlighting && (
          <Button size="xs" variant="ghost" className="mt-1" onClick={() => void model.clearHighlight()}>
            {t('studio.clearHighlight')}
          </Button>
        )}
      </footer>
    </div>
  )
}

function EmptyState() {
  const { t } = useTranslation()
  return (
    <p className="rounded-md border border-dashed py-10 text-center text-xs text-muted-foreground">
      {t('studio.noElement')}
    </p>
  )
}

function ElementCard({
  model,
  attrs,
}: {
  model: SelectorStudioModel
  attrs: [string, string][]
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const snapshot = model.snapshot
  if (!snapshot) return null
  const shown = expanded ? attrs : attrs.filter(([key]) => ATTR_PREVIEW.includes(key)).slice(0, 6)
  const parent = snapshot.parentChain[0]
  return (
    <section className="rounded-md border p-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <code className="font-mono text-[12px] font-semibold">{snapshot.tag}</code>
        {snapshot.id && <Badge variant="outline">#{snapshot.id}</Badge>}
        {snapshot.classes.slice(0, 3).map((cls) => (
          <Badge key={cls} variant="secondary">
            .{cls}
          </Badge>
        ))}
        <Badge variant={snapshot.connected ? 'secondary' : 'destructive'}>
          {snapshot.connected ? t('studio.connected') : t('studio.detached')}
        </Badge>
        {model.active?.matchCount != null && (
          <Badge variant="outline">{t('studio.matches', { count: model.active.matchCount })}</Badge>
        )}
      </div>
      {shown.length > 0 && (
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-2 gap-y-0.5 text-[11px]">
          {shown.map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="text-muted-foreground">{key}</dt>
              <dd className="min-w-0 truncate font-mono">
                {value}
                <CopyButton text={value} />
              </dd>
            </div>
          ))}
        </dl>
      )}
      {attrs.length > shown.length && (
        <Button size="xs" variant="ghost" className="mt-1" onClick={() => setExpanded((value) => !value)}>
          {expanded ? t('studio.hideAttrs') : t('studio.expandAttrs')}
        </Button>
      )}
      <p className="mt-2 truncate font-mono text-[10px] text-muted-foreground">
        {t('studio.path')}: {snapshot.identityPath || '—'}
        {parent ? ` · ${t('studio.parent')}: ${parent.tag}${parent.id ? `#${parent.id}` : ''}` : ''}
      </p>
      {snapshot.shadowHosts.length > 0 && (
        <p className="mt-1 text-[11px] text-muted-foreground">{t('studio.shadowNote')}</p>
      )}
      {!snapshot.frame.isTop && (
        <p className="mt-1 text-[11px] text-muted-foreground">
          {t('studio.frameNote')}
          {!snapshot.frame.sameOrigin ? ` ${t('studio.crossOrigin')}` : ''}
        </p>
      )}
    </section>
  )
}

function Explorer({ kind, model }: { kind: 'css' | 'xpath'; model: SelectorStudioModel }) {
  const { t } = useTranslation()
  const items = model.candidates.filter((item) => item.kind === kind)
  const groups = [...model.groups.entries()].filter(([, list]) => list.some((item) => item.kind === kind))
  if (!items.length) return <EmptyState />
  return (
    <div className="flex flex-col gap-3">
      {groups.map(([strategy, list]) => (
        <details key={strategy} open className="rounded-md border p-2">
          <summary className="cursor-pointer text-[11px] font-medium">
            {t(`studio.group.${strategy}`, { defaultValue: strategy })}
          </summary>
          <div className="mt-2 flex flex-col gap-1.5">
            {list
              .filter((item) => item.kind === kind)
              .map((item) => (
                <CandidateRow
                  key={item.id}
                  candidate={item}
                  selected={model.active?.id === item.id}
                  onSelect={() => model.setActive(item)}
                  onTest={() => void model.testCandidate(item)}
                  onHighlight={() => void model.highlight(item)}
                />
              ))}
          </div>
        </details>
      ))}
    </div>
  )
}

function FrameworksPanel({ model }: { model: SelectorStudioModel }) {
  const { t } = useTranslation()
  const snippets = useMemo(() => {
    if (!model.snapshot) return []
    const all = frameworkSnippets(model.snapshot, model.candidates)
    const preferred = all.filter((item) => item.framework === model.settings.defaultFramework)
    return [...preferred, ...all.filter((item) => item.framework !== model.settings.defaultFramework)]
  }, [model.candidates, model.settings.defaultFramework, model.snapshot])

  if (!model.snapshot) return <EmptyState />
  return (
    <div className="flex flex-col gap-2">
      {snippets.map((snippet) => (
        <article key={`${snippet.framework}-${snippet.api}-${snippet.locator}`} className="rounded-md border p-2">
          <div className="flex items-center gap-2">
            <h3 className="text-[12px] font-medium">{snippet.label}</h3>
            <Badge variant="outline">{FRAMEWORK_LABELS[snippet.framework]}</Badge>
          </div>
          <p className="mt-1 text-[10px] text-muted-foreground">
            {t('studio.expression')}: <code className="font-mono">{snippet.locator}</code>
          </p>
          <pre className="mt-1 overflow-x-auto rounded bg-muted/50 p-2 font-mono text-[11px]">{snippet.code}</pre>
          <CopyButton text={snippet.code} size="xs" />
        </article>
      ))}
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
          <article key={item.id} className="rounded-md border p-2">
            {item.name && <p className="text-[12px] font-medium">{item.name}</p>}
            <code className="block break-all font-mono text-[11px]">{item.expression}</code>
            <p className="mt-1 text-[10px] text-muted-foreground">
              {item.kind} · {item.strategy} · {hostOf(item.pageUrl)}
              {item.pageUrl && item.pageUrl !== (model.snapshot?.pageUrl || model.pageUrl)
                ? ` · ${t('studio.history.otherPage')}`
                : ''}
            </p>
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
