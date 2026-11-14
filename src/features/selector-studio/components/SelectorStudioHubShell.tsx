import {
  ChevronDownIcon,
  CopyIcon,
  EllipsisVerticalIcon,
  FileTextIcon,
  PlayIcon,
  PlusIcon,
  TheaterIcon,
  TypeIcon,
  XIcon,
} from 'lucide-react'
import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'

import {
  filterLocatorGroup,
  FRAMEWORK_LABELS,
  type FrameworkId,
  type LocatorGroup,
} from '@/core/engines/selector-studio'
import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { cn } from '@/shared/utils/cn'

import type { SelectorCandidate } from '@/core/engines/selector-studio'

import type { SelectorStudioModel } from '../useSelectorStudio'
import { HubAttributesTable } from './HubAttributesTable'
import { HubSettingsPanel } from './HubSettingsPanel'
import { InspectPanel, type InspectSection } from './InspectPanel'
import { Playground } from './Playground'
import { HubSideRail } from './HubSideRail'
import { RelationshipExplorer } from './RelationshipExplorer'
import { SelectorsHubTable } from './SelectorsHubTable'
import {
  CodePanel,
  HistoryPanel,
  HUB_FULL_TABS,
  HUB_TABS,
  type HubTab,
  useHistoryNameState,
} from './studioHubContent'

const INSPECT_SECTIONS: InspectSection[] = ['styles', 'computed', 'listeners']

export type SelectorStudioHubVariant = 'panel' | 'devtools' | 'pane'

type OutputMode = 'standard' | 'playwright'
type FilterPreset = 'recommended' | 'xpath' | 'css' | 'framework'

const FRAMEWORK_OPTIONS: FrameworkId[] = ['playwright', 'selenium', 'cypress', 'puppeteer', 'webdriverio']

const PRESETS: FilterPreset[] = ['recommended', 'xpath', 'css', 'framework']

function presetToGroup(preset: FilterPreset): LocatorGroup {
  if (preset === 'xpath') return 'xpath'
  if (preset === 'css') return 'css'
  if (preset === 'framework') return 'jquery'
  return 'recommended'
}

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
  const [playgroundOpen, setPlaygroundOpen] = useState(false)
  const [playgroundPinned, setPlaygroundPinned] = useState<SelectorCandidate | null>(null)
  const [name, setName] = useHistoryNameState()
  const [outputMode, setOutputMode] = useState<OutputMode>('standard')
  const [langOpen, setLangOpen] = useState(false)
  const [typeOpen, setTypeOpen] = useState(false)
  const [selectorKind, setSelectorKind] = useState<'mixed' | 'css' | 'xpath'>('mixed')
  const [customInput, setCustomInput] = useState('')
  const [preset, setPreset] = useState<FilterPreset>('recommended')
  const [presetOpen, setPresetOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [fontScale, setFontScale] = useState<10 | 11 | 12>(11)
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [hideStaleBanner, setHideStaleBanner] = useState(false)
  const { snapshot, settings } = model

  useEffect(() => {
    if (model.stale) setHideStaleBanner(false)
  }, [model.stale])
  const disabled = panel && !settings.enabled

  const frameworkLabel = FRAMEWORK_LABELS[settings.defaultFramework]

  const tableItems = useMemo(() => {
    const group = presetToGroup(preset)
    let list = filterLocatorGroup(model.candidates, group)
    if (group === 'recommended' && list.length === 0) {
      list = model.candidates
    }
    if (selectorKind === 'css') list = list.filter((item) => item.kind === 'css')
    if (selectorKind === 'xpath') list = list.filter((item) => item.kind === 'xpath')
    if (outputMode === 'playwright') {
      const playwrightRows = list.filter((item) => item.reasons.includes('Playwright'))
      if (playwrightRows.length) list = playwrightRows
    }
    return list
  }, [model.candidates, outputMode, preset, selectorKind])

  const playgroundCandidate = model.active ?? playgroundPinned

  const openPlayground = (seed?: SelectorCandidate | null) => {
    const next = seed ?? model.active
    if (!next) return
    setPlaygroundPinned(next)
    setPlaygroundOpen(true)
    setMoreOpen(false)
    setSettingsOpen(false)
  }

  const closePlayground = () => {
    setPlaygroundOpen(false)
  }

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(null), 2400)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.code === 'Escape') {
      if (playgroundOpen) {
        event.preventDefault()
        closePlayground()
        return
      }
      if (settingsOpen) {
        event.preventDefault()
        setSettingsOpen(false)
        return
      }
    }
    if (disabled || !(event.altKey && event.shiftKey)) return
    if (event.code === 'KeyP') {
      event.preventDefault()
      void model.pick()
    } else if (event.code === 'KeyY') {
      event.preventDefault()
      if (model.active) void navigator.clipboard.writeText(model.active.expression)
    } else if (event.code === 'Slash') {
      event.preventDefault()
      openPlayground()
    } else if (event.code === 'Backspace') {
      event.preventDefault()
      void model.clearSelection()
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
        pane && 'selector-studio-hub--pane text-[11px]',
      )}
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      <style>{`
        .selector-studio-hub { --sh-orange: #ff6a00; --sh-muted: #5f6368; }
        @keyframes copyFlash {
          0% { background-color: #d1fae5; }
          100% { background-color: transparent; }
        }
        .selector-studio-hub .code-font { font-family: ui-monospace, 'JetBrains Mono', Consolas, monospace; }
        .selector-studio-hub--pane .hub-strip { padding-top: 0.25rem; padding-bottom: 0.25rem; }
        .selector-studio-hub--pane .hub-mode-scroll { scrollbar-width: thin; }
      `}</style>

      <h1 className="sr-only">{t('studio.hub.title')}</h1>

      <div className="flex h-8 shrink-0 items-center gap-1.5 overflow-x-auto border-b border-[#dadce0] bg-[#f1f3f4] px-2 text-[11px]">
        <div className="flex h-full shrink-0 items-stretch gap-0.5" role="tablist" aria-label={t('studio.panel.navLabel')}>
          {devtoolsTabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              className={cn(
                'flex h-full items-center px-2.5 transition-colors',
                tab === item.id
                  ? 'relative border border-[#dadce0] border-t-2 border-t-[#1a73e8] bg-white font-medium text-[#1a73e8]'
                  : 'text-[#5f6368] hover:text-[#202124]',
              )}
              onClick={() => setTab(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>

        {tab === 'selectors' && (
          <>
            <span className="hidden h-4 w-px shrink-0 bg-[#dadce0] sm:block" aria-hidden />
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
              <button
                type="button"
                className={cn(
                  'flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition active:scale-95',
                  outputMode === 'standard'
                    ? 'bg-[var(--sh-orange)] text-white shadow-xs hover:bg-[#e65e00]'
                    : 'border border-[#dadce0] bg-white text-[#202124] hover:bg-[#f8f9fa]',
                )}
                onClick={() => setOutputMode('standard')}
              >
                <FileTextIcon className="size-2.5 shrink-0" aria-hidden />
                {t('studio.hub.modeStandard')}
              </button>
              <button
                type="button"
                className={cn(
                  'flex shrink-0 items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium transition active:scale-95',
                  outputMode === 'playwright'
                    ? 'bg-[var(--sh-orange)] text-white shadow-xs hover:bg-[#e65e00]'
                    : 'border border-[#dadce0] bg-white text-[#202124] hover:bg-[#f8f9fa]',
                )}
                onClick={() => {
                  setOutputMode('playwright')
                  model.patchSettings({ defaultFramework: 'playwright' })
                }}
              >
                <TheaterIcon className="size-2.5 shrink-0 text-[var(--sh-orange)]" aria-hidden />
                {t('studio.hub.modePlaywright')}
              </button>
              <div className="relative shrink-0">
                <button
                  type="button"
                  className="flex items-center gap-1 rounded border border-[#dadce0] bg-white px-2 py-0.5 text-[11px] hover:bg-[#f8f9fa]"
                  onClick={() => setLangOpen((v) => !v)}
                >
                  {frameworkLabel}
                  <ChevronDownIcon className="size-2 text-[#5f6368]" />
                </button>
                {langOpen && (
                  <div className="absolute left-0 z-30 mt-1 w-28 rounded border border-[#dadce0] bg-white py-1 shadow-lg">
                    {FRAMEWORK_OPTIONS.map((fw) => (
                      <button
                        key={fw}
                        type="button"
                        className="block w-full px-2.5 py-1 text-left text-[11px] first:font-medium hover:bg-[var(--sh-orange)] hover:text-white"
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
            </div>
          </>
        )}
      </div>

      {tab === 'selectors' && (
        <div className="flex h-7 shrink-0 items-center justify-between gap-2 border-b border-[#e1e4e8] bg-[#f6f8fa] px-2 text-[10px] text-[#5f6368]">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <label className="flex cursor-pointer items-center gap-1">
              <span className="text-[11px] font-medium text-[#202124]">{t('studio.hub.axes')}</span>
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
              className="flex size-[18px] items-center justify-center rounded-full bg-[var(--sh-orange)] text-white hover:bg-[#e65e00]"
              title={t('studio.hub.runAll')}
              aria-label={t('studio.hub.runAll')}
              onClick={runAll}
            >
              <PlayIcon className="size-2 fill-current" />
            </button>
            <button
              type="button"
              className="p-0.5 transition hover:text-[var(--sh-orange)]"
              title={t('studio.hub.copyAll')}
              aria-label={t('studio.hub.copyAll')}
              onClick={copyAll}
            >
              <CopyIcon className="size-3" />
            </button>
            <button
              type="button"
              className="p-0.5 transition hover:text-[var(--sh-orange)]"
              title={t('studio.hub.fontSize')}
              aria-label={t('studio.hub.fontSize')}
              onClick={cycleFont}
            >
              <TypeIcon className="size-3" />
            </button>
            <label className="flex cursor-pointer items-center gap-1">
              <span className="text-[10.5px]">{t('studio.hub.autoSuggest')}</span>
              <HubToggle
                id="autosuggest-switch"
                checked={settings.livePageSync}
                onToggle={() => {
                  void model.patchSettings({ livePageSync: !settings.livePageSync })
                }}
              />
            </label>
          </div>
          <div className="relative ml-auto shrink-0">
            <button
              type="button"
              className="flex size-6 items-center justify-center rounded text-[#5f6368] hover:bg-[#e8eaed] hover:text-[#202124]"
              title={t('studio.more')}
              aria-label={t('studio.more')}
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((v) => !v)}
            >
              <EllipsisVerticalIcon className="size-3.5" />
            </button>
            {moreOpen && (
              <div className="absolute right-0 z-30 mt-1 w-40 rounded border border-[#dadce0] bg-white py-1 text-[11px] shadow-lg">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left hover:bg-[#f1f3f4]"
                  onClick={() => {
                    exportResults()
                    setMoreOpen(false)
                  }}
                >
                  {t('studio.hub.export')}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

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
          <div className="flex shrink-0 items-center gap-2 border-b border-[#f1f3f4] bg-white px-2.5 py-1.5">
            <div className="relative shrink-0">
              <button
                type="button"
                className="flex h-7 items-center gap-1.5 whitespace-nowrap rounded bg-[var(--sh-orange)] px-2.5 text-[11px] font-medium text-white shadow-xs hover:bg-[#e65e00]"
                onClick={() => setTypeOpen((v) => !v)}
              >
                {selectorTypeLabel}
                <ChevronDownIcon className="size-2" />
              </button>
              {typeOpen && (
                <div className="absolute left-0 z-30 mt-1 w-44 rounded border border-[#dadce0] bg-white py-1 shadow-lg">
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
                      className={cn(
                        'flex w-full px-2.5 py-1.5 text-left text-[11px] hover:bg-[#fff4eb] hover:text-[var(--sh-orange)]',
                        value === 'mixed' && 'font-medium',
                      )}
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
                className="h-7 w-full rounded border border-[#dadce0] bg-white px-2.5 font-mono text-[11px] text-[#202124] focus:border-[var(--sh-orange)] focus:outline-none focus:ring-1 focus:ring-[var(--sh-orange)]"
                onChange={(e) => setCustomInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') verifyCustom()
                }}
              />
            </div>
            <div className="relative shrink-0">
              <button
                type="button"
                className="flex h-7 items-center gap-1.5 rounded border border-[#dadce0] bg-white px-2 text-[11px] hover:bg-[#f8f9fa]"
                aria-label={t('studio.hub.presetLabel')}
                onClick={() => setPresetOpen((v) => !v)}
              >
                {t(`studio.hub.preset.${preset}`)}
                <ChevronDownIcon className="size-2 text-[#5f6368]" />
              </button>
              {presetOpen && (
                <div className="absolute right-0 z-30 mt-1 w-36 rounded border border-[#dadce0] bg-white py-1 shadow-lg">
                  {PRESETS.map((id) => (
                    <button
                      key={id}
                      type="button"
                      className={cn(
                        'block w-full px-2.5 py-1.5 text-left text-[11px] hover:bg-[#f1f3f4]',
                        id === 'recommended' && 'font-medium',
                      )}
                      onClick={() => {
                        setPreset(id)
                        setPresetOpen(false)
                      }}
                    >
                      {t(`studio.hub.preset.${id}`)}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              type="button"
              className="flex size-7 shrink-0 items-center justify-center rounded-full border border-[#dadce0] text-[var(--sh-orange)] transition hover:border-[var(--sh-orange)] hover:bg-[var(--sh-orange)] hover:text-white active:scale-95"
              title={t('studio.hub.addVerify')}
              aria-label={t('studio.hub.addVerify')}
              onClick={verifyCustom}
            >
              <PlusIcon className="size-3.5" />
            </button>
          </div>

          {((model.stale && !hideStaleBanner) || model.error) && (
            <div className="flex shrink-0 items-center justify-between border-b border-[#dadce0] bg-[#f8f9fa] px-3 py-1.5 text-[11px] text-[#5f6368]">
              {model.stale && !hideStaleBanner && <span>{t('studio.stale')}</span>}
              {model.error && <span className="text-red-600">{model.error}</span>}
              {model.stale && !hideStaleBanner && (
                <button
                  type="button"
                  className="text-[#80868b] hover:text-[#202124]"
                  aria-label={t('studio.hub.dismissNotification')}
                  onClick={() => setHideStaleBanner(true)}
                >
                  <XIcon className="size-3" />
                </button>
              )}
            </div>
          )}
          {model.picking && (
            <div className="shrink-0 border-b border-[#e1e4e8] bg-[#e8f0fe] px-3 py-1 text-[11px] text-[#1a73e8]">
              {t('studio.pickProgress')}
            </div>
          )}

          <div
            className={cn('flex min-h-0 flex-1 overflow-hidden', disabled && 'pointer-events-none opacity-45')}
          >
            <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden border-r border-[#e1e4e8]">
              <div className="min-h-0 flex-1 overflow-y-auto">
                <SelectorsHubTable
                  model={model}
                  items={tableItems}
                  fontScale={fontScale}
                  selectedId={selectedRowId}
                  onSelectId={setSelectedRowId}
                />
              </div>
              {snapshot && <RelationshipExplorer snapshot={snapshot} />}
            </div>
            <HubSideRail
              model={model}
              settingsOpen={settingsOpen}
              onToggleSettings={toggleSettings}
              onEdit={() => openPlayground()}
              onOpenHistory={() => setTab('history')}
              onOpenCode={() => setTab('code')}
              showHistory={!pane}
              disabled={disabled}
              hideSettings={hideSettingsGear || panel}
              align="right"
            />
          </div>

          <div className="flex shrink-0 items-center justify-between border-t border-[#dadce0] bg-[#f1f3f4] px-2 py-0.5 text-[9px] tracking-wide text-[#5f6368]">
            <span className="truncate font-mono text-[#3c4043]">
              {snapshot ? `${snapshot.tag}${snapshot.id ? `#${snapshot.id}` : ''}` : t('studio.noElement')}
            </span>
            <span className="shrink-0 font-medium uppercase">{t('studio.hub.brandLine')}</span>
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

      {playgroundOpen && playgroundCandidate && tab === 'selectors' && (
        <div
          className="absolute inset-x-0 bottom-0 z-[60] flex max-h-[min(52%,22rem)] flex-col border-t border-[#dadce0] bg-white shadow-[0_-8px_24px_rgba(32,33,36,0.18)]"
          role="dialog"
          aria-modal="true"
          aria-label={t('studio.playground')}
        >
          <div className="min-h-0 overflow-y-auto p-2.5">
            <Playground
              candidate={playgroundCandidate}
              onValidate={model.validateExpression}
              onReset={() => snapshot && void model.reanalyze()}
              onClose={closePlayground}
            />
          </div>
        </div>
      )}

      {settingsOpen && !hideSettingsGear && !panel && !playgroundOpen && (
        <>
          <button
            type="button"
            className="absolute inset-0 z-30 bg-[#202124]/25"
            aria-label={t('studio.hub.dismissSettingsOverlay')}
            onClick={() => setSettingsOpen(false)}
          />
          <aside
            className="absolute top-0 right-8 z-40 flex h-full max-h-full w-[min(calc(100%-2.25rem),16.5rem)] flex-col border border-[#e1e4e8] bg-white shadow-xl"
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