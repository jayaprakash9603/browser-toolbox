import {
  ChevronDownIcon,
  CopyIcon,
  FileTextIcon,
  GripVerticalIcon,
  InfoIcon,
  PlayIcon,
  PlusIcon,
  TheaterIcon,
  TypeIcon,
  XIcon,
} from 'lucide-react'
import { useMemo, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

import {
  filterLocatorGroup,
  FRAMEWORK_LABELS,
  type FrameworkId,
  type LocatorGroup,
} from '@/core/engines/selector-studio'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { cn } from '@/shared/utils/cn'

import type { SelectorStudioModel } from '../useSelectorStudio'
import { HubAttributesTable } from './HubAttributesTable'
import { HubSettingsPanel } from './HubSettingsPanel'
import { HubSideRail } from './HubSideRail'
import { InspectPanel, type InspectSection } from './InspectPanel'
import { Playground } from './Playground'
import { RelationshipExplorer } from './RelationshipExplorer'
import { SelectorsHubTable } from './SelectorsHubTable'
import {
  CodePanel,
  elementChip,
  HistoryPanel,
  hostOf,
  HUB_FULL_TABS,
  HUB_TABS,
  type HubTab,
  useHistoryNameState,
} from './studioHubContent'

const INSPECT_SECTIONS: InspectSection[] = ['styles', 'computed', 'listeners']

export type SelectorStudioHubVariant = 'panel' | 'devtools' | 'pane'

type OutputMode = 'standard' | 'playwright'

const FRAMEWORK_OPTIONS: FrameworkId[] = ['playwright', 'selenium', 'cypress', 'puppeteer', 'webdriverio']

function HubToggle({
  checked,
  onToggle,
  id,
}: {
  checked: boolean
  onToggle: () => void
  id: string
}) {
  return (
    <button type="button" id={id} role="switch" aria-checked={checked} className="relative inline-block h-3.5 w-7" onClick={onToggle}>
      <span
        className={cn(
          'block h-3.5 w-7 rounded-full transition-colors',
          checked ? 'bg-[var(--sh-orange,#ff7700)]' : 'bg-gray-300',
        )}
      />
      <span
        className={cn(
          'absolute top-[2px] size-2.5 rounded-full bg-white transition-all',
          checked ? 'right-[2px]' : 'left-[2px]',
        )}
      />
    </button>
  )
}

export function SelectorStudioHubShell({
  model,
  variant,
  hideSettingsGear = false,
}: {
  model: SelectorStudioModel
  variant: SelectorStudioHubVariant
  hideSettingsGear?: boolean
}) {
  const { t } = useTranslation()
  const pane = variant === 'pane'
  const panel = variant === 'panel'
  const tabs = pane ? HUB_TABS : HUB_FULL_TABS
  const defaultTab: HubTab = 'selectors'
  const [tab, setTab] = useDeepLinkTab('tab', tabs, defaultTab)
  const [inspectSection, setInspectSection] = useDeepLinkTab('inspect', INSPECT_SECTIONS, 'styles')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [playground, setPlayground] = useState(false)
  const [name, setName] = useHistoryNameState()
  const [outputMode, setOutputMode] = useState<OutputMode>('standard')
  const [langOpen, setLangOpen] = useState(false)
  const [typeOpen, setTypeOpen] = useState(false)
  const [selectorKind, setSelectorKind] = useState<'mixed' | 'css' | 'xpath'>('mixed')
  const [customInput, setCustomInput] = useState('')
  const [locatorGroup, setLocatorGroup] = useState<LocatorGroup>('recommended')
  const [selectorSearch, setSelectorSearch] = useState('')
  const [fontScale, setFontScale] = useState<10 | 11 | 12>(11)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const { snapshot, settings } = model
  const disabled = panel && !settings.enabled

  const frameworkLabel = FRAMEWORK_LABELS[settings.defaultFramework]

  const tableItems = useMemo(() => {
    let list = filterLocatorGroup(model.candidates, locatorGroup)
    if (locatorGroup === 'recommended' && list.length === 0) {
      list = model.candidates
    }
    if (selectorKind === 'css') list = list.filter((item) => item.kind === 'css')
    if (selectorKind === 'xpath') list = list.filter((item) => item.kind === 'xpath')
    const q = selectorSearch.trim().toLowerCase()
    if (q) {
      list = list.filter(
        (item) =>
          item.expression.toLowerCase().includes(q) ||
          item.strategy.toLowerCase().includes(q) ||
          item.kind.includes(q),
      )
    }
    if (outputMode === 'playwright') {
      list = list.filter((item) => item.strategy === 'test-attribute' || item.kind === 'xpath')
    }
    return list
  }, [locatorGroup, model.candidates, outputMode, selectorKind, selectorSearch])

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2400)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (disabled || !(event.altKey && event.shiftKey)) return
    if (event.code === 'KeyP') {
      event.preventDefault()
      void model.pick()
    } else if (event.code === 'KeyY') {
      event.preventDefault()
      if (model.active) void navigator.clipboard.writeText(model.active.expression)
    } else if (event.code === 'Slash') {
      event.preventDefault()
      setPlayground(true)
    } else if (event.code === 'Backspace') {
      event.preventDefault()
      void model.clearSelection()
    } else if (event.code === 'Escape' && settingsOpen) {
      event.preventDefault()
      setSettingsOpen(false)
    }
  }

  const verifyCustom = () => {
    const val = customInput.trim()
    if (!val) return
    const kind: 'css' | 'xpath' = val.startsWith('/') || val.startsWith('(') ? 'xpath' : 'css'
    model.validateExpression(kind, val)
    showToast(t('studio.hub.verified', { expression: val }))
    setCustomInput('')
  }

  const copyAll = () => {
    const text = tableItems.map((item) => item.expression).join('\n')
    void navigator.clipboard.writeText(text)
    showToast(t('studio.hub.copiedAll', { count: tableItems.length }))
  }

  const runAll = () => {
    void model.verifyAllCandidates()
    showToast(t('studio.hub.rerunAll'))
  }

  const exportResults = () => {
    const payload = tableItems.map((item) => ({
      kind: item.kind,
      strategy: item.strategy,
      expression: item.expression,
      matchCount: item.matchCount,
      uniqueness: item.uniqueness,
      intendedMatched: item.intendedMatched,
      score: item.score,
    }))
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.download = 'selector-studio-locators.json'
    anchor.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 500)
    showToast(t('studio.hub.exported'))
  }

  const cycleFont = () => {
    setFontScale((prev) => (prev === 11 ? 12 : prev === 12 ? 10 : 11))
  }

  const toggleSettings = () => setSettingsOpen((open) => !open)

  const devtoolsTabs: { id: HubTab; label: string }[] = pane
    ? [
        { id: 'selectors', label: t('studio.hub.tabSelectors') },
        { id: 'attributes', label: t('studio.tab.attributes') },
        { id: 'inspect', label: t('studio.tab.inspect') },
        { id: 'code', label: t('studio.tab.code') },
      ]
    : [
        { id: 'selectors', label: t('studio.hub.tabSelectors') },
        { id: 'attributes', label: t('studio.tab.attributes') },
        { id: 'inspect', label: t('studio.tab.inspect') },
        { id: 'code', label: t('studio.tab.code') },
        { id: 'history', label: t('studio.tab.history') },
      ]

  const selectorTypeLabel =
    selectorKind === 'mixed'
      ? t('studio.hub.typeMixed')
      : selectorKind === 'css'
        ? t('studio.tab.css')
        : t('studio.tab.xpath')

  const renderSecondary = () => {
    if (tab === 'attributes') {
      return snapshot ? <HubAttributesTable snapshot={snapshot} /> : <p className="p-4 text-[11px] text-[#57606a]">{t('studio.noElement')}</p>
    }
    if (tab === 'code') return <div className="p-2"><CodePanel model={model} /></div>
    if (tab === 'history') {
      return (
        <div className="p-2">
          <HistoryPanel model={model} name={name} setName={setName} compact={!panel} />
        </div>
      )
    }
    if (tab === 'inspect') {
      return (
        <div className="flex flex-col gap-2 p-2">
          <div className="flex flex-wrap gap-1">
            {INSPECT_SECTIONS.map((section) => (
              <button
                key={section}
                type="button"
                className={cn(
                  'rounded px-2 py-1 text-[10px] font-medium',
                  inspectSection === section
                    ? 'bg-[var(--sh-orange,#ff7700)] text-white'
                    : 'border border-[#d0d7de] bg-white text-[#24292f] hover:bg-[#f6f8fa]',
                )}
                aria-pressed={inspectSection === section}
                onClick={() => setInspectSection(section)}
              >
                {t(`studio.tab.${section}`)}
              </button>
            ))}
          </div>
          <InspectPanel inspect={model.elementInspect} inspecting={model.inspecting} section={inspectSection} />
        </div>
      )
    }
    return null
  }

  return (
    <div
      className={cn(
        'selector-studio-hub relative flex h-full min-h-0 flex-col bg-white text-[11px] text-[#24292f] outline-none',
        !pane && !panel && 'rounded-md border border-[#c7ccd1] shadow-sm',
        pane && 'text-[11.5px]',
      )}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <style>{`
        .selector-studio-hub { --sh-orange: #ff7700; --sh-muted: #57606a; }
        @keyframes copyFlash {
          0% { background-color: #d1fae5; }
          100% { background-color: transparent; }
        }
        .selector-studio-hub .code-font { font-family: ui-monospace, 'JetBrains Mono', Consolas, monospace; }
      `}</style>

      <h1 className="sr-only">{t('studio.hub.title')}</h1>

      <div className="flex h-[30px] shrink-0 items-center justify-between overflow-x-auto border-b border-[#dadce0] bg-[#f1f3f4] px-2">
        <div className="flex h-full items-center gap-0.5" role="tablist" aria-label={t('studio.panel.navLabel')}>
          {devtoolsTabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={cn(
                'flex h-full items-center border-b-2 px-2.5 transition-colors',
                tab === item.id
                  ? 'border-[#1a73e8] bg-[#f8fafd] font-semibold text-[#1a73e8]'
                  : 'border-transparent text-[#5f6368] hover:text-[#202124]',
              )}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {disabled && (
        <div
          role="status"
          className="shrink-0 border-b border-amber-500/35 bg-amber-500/10 px-2 py-1.5 text-[11px] text-amber-950"
        >
          {t('studio.panel.disabledBanner')}
        </div>
      )}

      {tab === 'selectors' ? (
        <>
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-1.5 border-b border-[#e1e4e8] bg-[#fdfdfd] px-2 py-1.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                className={cn(
                  'flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-medium shadow-xs transition active:scale-95',
                  outputMode === 'standard'
                    ? 'bg-[var(--sh-orange)] text-white hover:bg-[#e66a00]'
                    : 'border border-[#d0d7de] bg-white hover:bg-[#f6f8fa]',
                )}
                onClick={() => setOutputMode('standard')}
              >
                <FileTextIcon className="size-3" aria-hidden />
                {t('studio.hub.modeStandard')}
              </button>
              <button
                type="button"
                className={cn(
                  'flex items-center gap-1.5 rounded px-2.5 py-1 text-[11px] font-medium transition active:scale-95',
                  outputMode === 'playwright'
                    ? 'bg-[var(--sh-orange)] text-white hover:bg-[#e66a00]'
                    : 'border border-[#d0d7de] bg-white hover:bg-[#f6f8fa]',
                )}
                onClick={() => {
                  setOutputMode('playwright')
                  model.patchSettings({ defaultFramework: 'playwright' })
                }}
              >
                <TheaterIcon className="size-3 text-[var(--sh-orange)]" aria-hidden />
                {t('studio.hub.modePlaywright')}
              </button>

              <div className="relative">
                <button
                  type="button"
                  className="flex h-[25px] items-center gap-1 rounded border border-[#d0d7de] bg-white px-2 text-[11px] hover:bg-[#f6f8fa]"
                  onClick={() => setLangOpen((v) => !v)}
                >
                  {frameworkLabel}
                  <ChevronDownIcon className="size-2.5 text-[#57606a]" />
                </button>
                {langOpen && (
                  <div className="absolute left-0 z-30 mt-1 w-36 rounded border border-[#d0d7de] bg-white py-1 shadow-lg">
                    {FRAMEWORK_OPTIONS.map((fw) => (
                      <button
                        key={fw}
                        type="button"
                        className="block w-full px-2.5 py-1 text-left text-[11px] hover:bg-[var(--sh-orange)] hover:text-white"
                        onClick={() => {
                          model.patchSettings({ defaultFramework: fw })
                          setLangOpen(false)
                        }}
                      >
                        {FRAMEWORK_LABELS[fw]}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="button"
                className="flex size-6 items-center justify-center rounded text-[#57606a] hover:bg-gray-100 hover:text-[var(--sh-orange)]"
                title={t('studio.hub.syntaxGuide')}
              >
                <InfoIcon className="size-3" />
              </button>
            </div>
            <button type="button" className="flex size-6 items-center justify-center text-[#57606a] hover:text-black" title={t('studio.more')}>
              <GripVerticalIcon className="size-3" />
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 border-b border-[#e1e4e8] bg-[#fbfbfb] px-2 py-1.5">
            <div className="relative">
              <button
                type="button"
                className="flex h-[27px] items-center gap-1.5 whitespace-nowrap rounded bg-[var(--sh-orange)] px-2 text-[11px] font-medium text-white shadow-xs hover:bg-[#e66a00]"
                onClick={() => setTypeOpen((v) => !v)}
              >
                {selectorTypeLabel}
                <ChevronDownIcon className="size-2" />
              </button>
              {typeOpen && (
                <div className="absolute left-0 z-30 mt-1 w-44 rounded border border-[#d0d7de] bg-white py-1 shadow-lg">
                  {(
                    [
                      ['mixed', t('studio.hub.typeMixed')],
                      ['css', t('studio.tab.css')],
                      ['xpath', t('studio.tab.xpath')],
                    ] as const
                  ).map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      className="flex w-full items-center justify-between px-2.5 py-1.5 text-left text-[11px] hover:bg-[#fff2e6] hover:text-[var(--sh-orange)]"
                      onClick={() => {
                        setSelectorKind(value)
                        setTypeOpen(false)
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="relative min-w-0 flex-1">
              <input
                type="text"
                value={customInput}
                placeholder={t('studio.hub.inputPlaceholder')}
                className="h-[27px] w-full rounded border border-[#cfd4da] bg-white pl-2 pr-7 font-mono text-[11px] focus:border-[var(--sh-orange)] focus:outline-none focus:ring-1 focus:ring-[var(--sh-orange)]"
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') verifyCustom()
                }}
              />
              {customInput && (
                <button
                  type="button"
                  className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-600"
                  onClick={() => setCustomInput('')}
                >
                  <XIcon className="size-2.5" />
                </button>
              )}
            </div>
            <button
              type="button"
              className="flex size-[27px] shrink-0 items-center justify-center rounded-full border border-[#cfd4da] bg-white text-[var(--sh-orange)] shadow-sm transition hover:border-[var(--sh-orange)] hover:bg-[var(--sh-orange)] hover:text-white active:scale-95"
              title={t('studio.hub.addVerify')}
              onClick={verifyCustom}
            >
              <PlusIcon className="size-3" />
            </button>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-b border-[#e1e4e8] bg-[#f6f8fa] px-2.5 py-1 text-[11px] text-[#57606a]">
            <select
              className="h-6 max-w-[9rem] rounded border border-[#d0d7de] bg-white px-1.5 text-[10px] text-[#24292f]"
              value={locatorGroup}
              aria-label={t('studio.hub.strategyGroup')}
              onChange={(e) => setLocatorGroup(e.target.value as LocatorGroup)}
            >
              {(
                [
                  'recommended',
                  'css',
                  'xpath',
                  'text',
                  'parent',
                  'sibling',
                  'axes',
                  'indexed',
                  'absolute',
                  'all',
                ] as const
              ).map((id) => (
                <option key={id} value={id}>
                  {t(`studio.hub.group.${id}`)}
                </option>
              ))}
            </select>
            <input
              type="search"
              value={selectorSearch}
              placeholder={t('studio.hub.filterPlaceholder')}
              className="h-6 min-w-0 flex-1 rounded border border-[#d0d7de] bg-white px-1.5 text-[10px]"
              onChange={(e) => setSelectorSearch(e.target.value)}
            />
          </div>

          <div className="flex shrink-0 items-center justify-between border-b border-[#e1e4e8] bg-[#f6f8fa] px-2.5 py-1 text-[11px] text-[#57606a]">
            <div className="flex items-center gap-2.5">
              <label className="flex cursor-pointer items-center gap-1.5">
                <span className="font-medium text-[#24292f]">{t('studio.hub.axes')}</span>
                <HubToggle
                  id="axes-switch"
                  checked={settings.includeAxes}
                  onToggle={() => {
                    const next = !settings.includeAxes
                    void model.patchSettings({ includeAxes: next }).then(() => {
                      if (snapshot) void model.reanalyze()
                    })
                  }}
                />
              </label>
              <button
                type="button"
                className="flex size-4 items-center justify-center rounded-full bg-[var(--sh-orange)] text-white hover:bg-[#e66a00]"
                title={t('studio.hub.runAll')}
                onClick={runAll}
              >
                <PlayIcon className="size-2 fill-current" />
              </button>
              <button type="button" className="text-[#57606a] transition hover:text-[var(--sh-orange)]" title={t('studio.hub.copyAll')} onClick={copyAll}>
                <CopyIcon className="size-3" />
              </button>
              <button type="button" className="transition hover:text-[var(--sh-orange)]" title={t('studio.hub.fontSize')} onClick={cycleFont}>
                <TypeIcon className="size-2.5" />
              </button>
              <button type="button" className="transition hover:text-[var(--sh-orange)]" title={t('studio.hub.export')} onClick={exportResults}>
                <FileTextIcon className="size-2.5" />
              </button>
            </div>
            <label className="flex cursor-pointer items-center gap-1.5">
              <span className="text-[10px]">{t('studio.hub.autoSuggest')}</span>
              <HubToggle
                id="autosuggest-switch"
                checked={settings.livePageSync}
                onToggle={() => {
                  void model.patchSettings({ livePageSync: !settings.livePageSync })
                }}
              />
            </label>
          </div>

          {(model.picking || model.error || model.stale) && (
            <div className="shrink-0 border-b border-[#e1e4e8] px-2 py-1 text-[11px]">
              {model.picking && <p className="text-[#1a73e8]">{t('studio.pickProgress')}</p>}
              {model.stale && !model.picking && <p className="text-[#57606a]">{t('studio.stale')}</p>}
              {model.error && <p className="text-red-600">{model.error}</p>}
            </div>
          )}

          {playground && model.active && (
            <div className="shrink-0 border-b border-[#e1e4e8] p-2">
              <Playground
                candidate={model.active}
                onValidate={model.validateExpression}
                onReset={() => snapshot && void model.reanalyze()}
              />
            </div>
          )}

          <div className={cn('flex min-h-[200px] flex-1', disabled && 'pointer-events-none opacity-45')}>
            <div className="min-h-0 flex-1 overflow-y-auto border-r border-[#e1e4e8]">
              {snapshot && <RelationshipExplorer snapshot={snapshot} />}
              <SelectorsHubTable
                model={model}
                items={tableItems}
                fontScale={fontScale}
                selectedId={selectedRowId}
                onSelectId={setSelectedRowId}
              />
            </div>
            <HubSideRail
              model={model}
              settingsOpen={settingsOpen}
              onToggleSettings={toggleSettings}
              onEdit={() => setPlayground(true)}
              onOpenHistory={() => setTab('history')}
              onOpenCode={() => setTab('code')}
              showHistory={!pane}
              disabled={disabled}
              hideSettings={hideSettingsGear || panel}
              align="right"
            />
          </div>

          <div className="flex shrink-0 items-center justify-between gap-1 overflow-x-auto border-t border-[#dadce0] bg-[#f1f3f4] px-2 py-1 text-[10px] text-[#5f6368]">
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate font-mono text-[#3c4043]">
                {snapshot ? elementChip(snapshot) : t('studio.noElement')}
              </span>
              <span className="hidden truncate sm:inline">· {hostOf(snapshot?.pageUrl || model.pageUrl)}</span>
            </div>
            <span className="shrink-0 rounded bg-[var(--sh-orange)] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white">
              {t('studio.hub.brandMark')}
            </span>
          </div>
        </>
      ) : (
        <div className={cn('min-h-0 flex-1 overflow-y-auto', disabled && 'pointer-events-none opacity-45')}>
          {renderSecondary()}
        </div>
      )}

      {toast && (
        <div className="flex shrink-0 items-center justify-between bg-[#1e293b] px-2.5 py-1 text-[10.5px] text-white">
          <span>{toast}</span>
          <button type="button" className="text-gray-400 hover:text-white" onClick={() => setToast(null)}>
            <XIcon className="size-2.5" />
          </button>
        </div>
      )}

      {settingsOpen && !hideSettingsGear && !panel && (
        <>
          <button
            type="button"
            className="absolute inset-0 z-30 bg-[#202124]/25"
            aria-label={t('studio.hub.dismissSettingsOverlay')}
            onClick={() => setSettingsOpen(false)}
          />
          <aside
            className="absolute top-0 right-[34px] z-40 flex h-full max-h-full w-[min(calc(100%-2.5rem),16.5rem)] flex-col border border-[#e1e4e8] bg-white shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="studio-settings-title"
          >
            <header className="flex shrink-0 items-center justify-between gap-2 border-b border-[#e1e4e8] bg-[#f6f8fa] px-2.5 py-2">
              <h2 id="studio-settings-title" className="text-[12px] font-semibold text-[#24292f]">
                {t('studio.settings')}
              </h2>
              <button
                type="button"
                className="flex size-6 items-center justify-center rounded text-[#5f6368] hover:bg-[#e8eaed] hover:text-[#202124]"
                aria-label={t('studio.hub.closeSettings')}
                onClick={() => setSettingsOpen(false)}
              >
                <XIcon className="size-3.5" aria-hidden />
              </button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              <HubSettingsPanel model={model} showHeading={false} />
            </div>
          </aside>
        </>
      )}

      <p className="sr-only" role="status">
        {!model.picking && (model.active ? model.active.expression : t('studio.noElement'))}
      </p>
    </div>
  )
}