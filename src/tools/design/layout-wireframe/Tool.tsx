import { useCallback, useEffect, useRef, useState, type ComponentType, type ReactNode, type SVGProps } from 'react'
import {
  BoxIcon,
  CheckIcon,
  ChevronRightIcon,
  CircleAlertIcon,
  CopyIcon,
  EyeIcon,
  InfoIcon,
  KeyboardIcon,
  MousePointerClickIcon,
  MoveIcon,
  PencilRulerIcon,
  RotateCcwIcon,
  RulerIcon,
  ScalingIcon,
  ScanSearchIcon,
  SquareDashedIcon,
  TextCursorInputIcon,
  Undo2Icon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  DEFAULT_INSPECTOR_LABELS,
  DEFAULT_INSPECTOR_OPTIONS,
  type InspectorAction,
  type PageInspectorOptions,
  type PageInspectorState,
} from '@/chrome/content/pageInspector/model'
import { addClipboardEntry } from '@/core/clipboard'
import { STORAGE_KEYS } from '@/core/constants'
import { isExtensionMessage } from '@/core/messaging/types'
import { get, set } from '@/core/storage'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'
import { Switch } from '@/shared/components/ui/switch'
import { cn } from '@/shared/utils/cn'
import { getActiveTabId, sendToActiveTab } from '@/tools/web/tabMessaging'
import { useDesignTool } from '../_shared'

type Prefs = Omit<PageInspectorOptions, 'enabled'>
type Flag = Exclude<keyof Prefs, 'outlineMode'>
type Icon = ComponentType<SVGProps<SVGSVGElement>>

const FLAGS: Flag[] = ['outlines', 'hoverInfo', 'boxModel', 'guides', 'select', 'move', 'resize', 'textEdit']

function toPrefs(value: unknown): Partial<Prefs> {
  if (!value || typeof value !== 'object') return {}
  const source = value as Record<string, unknown>
  const prefs: Partial<Prefs> = {}
  for (const flag of FLAGS) if (typeof source[flag] === 'boolean') prefs[flag] = source[flag]
  if (source.outlineMode === 'single' || source.outlineMode === 'depth') prefs.outlineMode = source.outlineMode
  return prefs
}

function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-foreground shadow-[0_1px_0_var(--border)]">{children}</kbd>
}

function Section({ id, icon: SectionIcon, title, children, footer }: { id: string; icon: Icon; title: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <section aria-labelledby={id} className="min-w-0">
      <h3 id={id} className="mb-1.5 flex items-center gap-1.5 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        <SectionIcon className="size-3.5" aria-hidden />
        {title}
      </h3>
      <div className="divide-y rounded-xl border bg-card">{children}</div>
      {footer}
    </section>
  )
}

interface OptionRowProps {
  id: string
  icon: Icon
  label: string
  hint: string
  checked: boolean
  disabled?: boolean
  onChange: (checked: boolean) => void
  children?: ReactNode
}

function OptionRow({ id, icon: RowIcon, label, hint, checked, disabled, onChange, children }: OptionRowProps) {
  return (
    <div className={cn('px-3 py-2.5 transition-opacity', disabled && 'opacity-55')}>
      <div className="flex items-center gap-3">
        <span className={cn('grid size-7 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground transition-colors', checked && !disabled && 'bg-primary/10 text-primary')}>
          <RowIcon className="size-3.5" aria-hidden />
        </span>
        <label htmlFor={id} className={cn('min-w-0 flex-1', disabled ? 'cursor-not-allowed' : 'cursor-pointer')}>
          <span id={`${id}-label`} className="block text-[13px] font-medium leading-tight">
            {label}
          </span>
          <span id={`${id}-hint`} className="mt-0.5 block text-[11px] leading-snug text-muted-foreground">
            {hint}
          </span>
        </label>
        <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} aria-labelledby={`${id}-label`} aria-describedby={`${id}-hint`} />
      </div>
      {children ? <div className="mt-2 pl-10">{children}</div> : null}
    </div>
  )
}

export default function LayoutWireframeTool() {
  const { t } = useTranslation()
  const tool = useDesignTool('design.layout-wireframe')
  const [options, setOptions] = useState<PageInspectorOptions>(DEFAULT_INSPECTOR_OPTIONS)
  const [page, setPage] = useState<Omit<PageInspectorState, 'options'>>({ changes: 0, canUndo: false, selected: null })
  const [unavailable, setUnavailable] = useState(false)
  const [copied, setCopied] = useState<'ok' | 'empty' | null>(null)
  const tabId = useRef<number | null>(null)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  const adopt = useCallback((state: PageInspectorState | null | undefined) => {
    if (!state?.options) {
      setUnavailable(true)
      setOptions((current) => ({ ...current, enabled: false }))
      return
    }
    setUnavailable(false)
    setPage({ changes: state.changes, canUndo: state.canUndo, selected: state.selected })
    setOptions((current) => (state.options.enabled ? state.options : { ...current, enabled: false }))
  }, [])

  const sync = useCallback(async () => {
    tabId.current = await getActiveTabId()
    adopt(await sendToActiveTab<PageInspectorState>({ type: 'PAGE_INSPECTOR_GET' }))
  }, [adopt])

  useEffect(() => {
    let active = true
    void (async () => {
      const stored = await get<unknown>(STORAGE_KEYS.pageInspector).catch(() => undefined)
      if (!active) return
      setOptions((current) => ({ ...current, ...toPrefs(stored) }))
      await sync()
    })()
    const onActivated = () => void sync()
    const onUpdated = (_id: number, info: chrome.tabs.OnUpdatedInfo) => {
      if (info.status === 'complete') void sync()
    }
    const onMessage = (message: unknown, sender: chrome.runtime.MessageSender) => {
      if (!isExtensionMessage(message) || message.type !== 'PAGE_INSPECTOR_STATE') return
      if (sender.tab?.id != null && sender.tab.id !== tabId.current) return
      adopt(message.state)
    }
    chrome.tabs?.onActivated?.addListener(onActivated)
    chrome.tabs?.onUpdated?.addListener(onUpdated)
    chrome.runtime?.onMessage?.addListener(onMessage)
    return () => {
      active = false
      clearTimeout(copiedTimer.current)
      chrome.tabs?.onActivated?.removeListener(onActivated)
      chrome.tabs?.onUpdated?.removeListener(onUpdated)
      chrome.runtime?.onMessage?.removeListener(onMessage)
    }
  }, [adopt, sync])

  const pageLabels = () => Object.fromEntries(Object.keys(DEFAULT_INSPECTOR_LABELS).map((key) => [key, t(`inspector.page.${key}`)]))

  const setEnabled = async (enabled: boolean) => {
    setOptions((current) => ({ ...current, enabled }))
    adopt(await sendToActiveTab<PageInspectorState>({ type: 'PAGE_INSPECTOR_SET', options: { ...options, enabled }, labels: pageLabels() }))
  }

  const update = (patch: Partial<Prefs>) => {
    const next = { ...options, ...patch }
    setOptions(next)
    void set(STORAGE_KEYS.pageInspector, toPrefs(next)).catch(() => {})
    if (options.enabled) void sendToActiveTab<PageInspectorState>({ type: 'PAGE_INSPECTOR_SET', options: patch }).then(adopt)
  }

  const act = async (action: InspectorAction) => {
    const result = await sendToActiveTab<{ state: PageInspectorState; css?: string }>({ type: 'PAGE_INSPECTOR_ACTION', action })
    adopt(result?.state)
    return result?.css
  }

  const flash = (value: 'ok' | 'empty') => {
    setCopied(value)
    clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(null), 1800)
  }

  const copyChanges = async () => {
    const css = await act('export')
    if (!css) {
      flash('empty')
      return
    }
    await navigator.clipboard?.writeText(css).catch(() => {})
    void addClipboardEntry(css).catch(() => {})
    flash('ok')
  }

  const flag = (key: Flag) => ({ checked: options[key], onChange: (checked: boolean) => update({ [key]: checked }) })
  const editOff = !options.select
  const showChanges = options.enabled || page.changes > 0

  const shortcuts: [ReactNode, string][] = [
    [<Kbd key="c">{t('inspector.key.click')}</Kbd>, t('inspector.key.select')],
    [
      <span key="p" className="flex gap-1">
        <Kbd>Alt+↑</Kbd>
        <Kbd>Alt+↓</Kbd>
      </span>,
      t('inspector.key.parent'),
    ],
    [
      <span key="n" className="flex gap-1">
        <Kbd>←</Kbd>
        <Kbd>↑</Kbd>
        <Kbd>→</Kbd>
        <Kbd>↓</Kbd>
      </span>,
      t('inspector.key.nudge'),
    ],
    [<Kbd key="e">Enter</Kbd>, t('inspector.key.text')],
    [<Kbd key="d">Del</Kbd>, t('inspector.key.delete')],
    [<Kbd key="z">Ctrl+Z</Kbd>, t('inspector.key.undo')],
    [<Kbd key="x">Esc</Kbd>, t('inspector.key.deselect')],
  ]

  return (
    <ToolPage tool={tool}>
      <div className="@container space-y-4">
        <section className={cn('rounded-xl border bg-card p-4 transition-colors duration-200', options.enabled && 'border-primary/40 bg-primary/[0.04]')}>
          <div className="flex items-start gap-3">
            <span className={cn('grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors', options.enabled && 'bg-primary text-primary-foreground')}>
              <ScanSearchIcon className="size-5" aria-hidden />
            </span>
            <label htmlFor="inspector-master" className="min-w-0 flex-1 cursor-pointer">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <span id="inspector-master-label">{t('inspector.master')}</span>
                {options.enabled ? (
                  <span className="relative flex size-2" aria-hidden>
                    <span className="absolute inline-flex size-full rounded-full bg-emerald-500 opacity-60 motion-safe:animate-ping" />
                    <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
                  </span>
                ) : null}
              </span>
              <span id="inspector-master-hint" className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                {options.enabled ? t('inspector.masterOn') : t('inspector.masterOff')}
              </span>
            </label>
            <Switch
              id="inspector-master"
              checked={options.enabled}
              onCheckedChange={(enabled) => void setEnabled(enabled)}
              aria-labelledby="inspector-master-label"
              aria-describedby="inspector-master-hint"
            />
          </div>
          {options.enabled && page.selected ? (
            <p className="mt-3 truncate rounded-md bg-muted px-2.5 py-1.5 font-mono text-[11px] text-muted-foreground">{t('inspector.selected', { label: page.selected })}</p>
          ) : null}
          {unavailable ? (
            <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs leading-snug text-amber-900 dark:text-amber-200">
              <CircleAlertIcon className="mt-px size-3.5 shrink-0" aria-hidden />
              {t('inspector.unavailable')}
            </p>
          ) : null}
        </section>

        {showChanges ? (
          <section aria-labelledby="inspector-changes" className="rounded-xl border bg-card p-3">
            <div className="flex items-center gap-2">
              <span className={cn('grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums', page.changes ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                {page.changes}
              </span>
              <div className="min-w-0">
                <h3 id="inspector-changes" className="text-[13px] font-semibold leading-tight">
                  {t('inspector.changes')}
                </h3>
                <p role="status" className="text-[11px] leading-snug text-muted-foreground">
                  {page.changes ? t('inspector.changesCount', { count: page.changes }) : t('inspector.noChanges')}
                </p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button size="sm" variant="outline" disabled={!page.canUndo} onClick={() => void act('undo')}>
                <Undo2Icon aria-hidden />
                {t('inspector.undo')}
              </Button>
              <Button size="sm" variant="outline" disabled={!page.changes} onClick={() => void act('reset')}>
                <RotateCcwIcon aria-hidden />
                {t('inspector.reset')}
              </Button>
              <Button size="sm" className="grow @xs:grow-0" disabled={!page.changes} onClick={() => void copyChanges()}>
                {copied === 'ok' ? <CheckIcon aria-hidden /> : <CopyIcon aria-hidden />}
                {copied === 'ok' ? t('inspector.copied') : copied === 'empty' ? t('inspector.nothingToCopy') : t('inspector.copyChanges')}
              </Button>
            </div>
          </section>
        ) : null}

        <div className="grid gap-4 @2xl:grid-cols-2">
          <Section id="inspector-see" icon={EyeIcon} title={t('inspector.see')}>
            <OptionRow id="opt-outlines" icon={SquareDashedIcon} label={t('inspector.opt.outlines')} hint={t('inspector.opt.outlinesHint')} {...flag('outlines')}>
              {options.outlines ? (
                <Segmented
                  size="sm"
                  ariaLabel={t('inspector.opt.outlineMode')}
                  value={options.outlineMode}
                  onValueChange={(outlineMode) => update({ outlineMode })}
                  options={[
                    { value: 'single', label: t('inspector.opt.single') },
                    { value: 'depth', label: t('inspector.opt.depth') },
                  ]}
                />
              ) : null}
            </OptionRow>
            <OptionRow id="opt-hover" icon={InfoIcon} label={t('inspector.opt.hoverInfo')} hint={t('inspector.opt.hoverInfoHint')} {...flag('hoverInfo')} />
            <OptionRow id="opt-box" icon={BoxIcon} label={t('inspector.opt.boxModel')} hint={t('inspector.opt.boxModelHint')} {...flag('boxModel')} />
            <OptionRow id="opt-guides" icon={RulerIcon} label={t('inspector.opt.guides')} hint={t('inspector.opt.guidesHint')} {...flag('guides')} />
          </Section>

          <Section
            id="inspector-edit"
            icon={PencilRulerIcon}
            title={t('inspector.edit')}
            footer={editOff ? <p className="mt-1.5 px-1 text-[11px] text-muted-foreground">{t('inspector.editDisabled')}</p> : null}
          >
            <OptionRow id="opt-select" icon={MousePointerClickIcon} label={t('inspector.opt.select')} hint={t('inspector.opt.selectHint')} {...flag('select')} />
            <OptionRow id="opt-move" icon={MoveIcon} label={t('inspector.opt.move')} hint={t('inspector.opt.moveHint')} disabled={editOff} {...flag('move')} />
            <OptionRow id="opt-resize" icon={ScalingIcon} label={t('inspector.opt.resize')} hint={t('inspector.opt.resizeHint')} disabled={editOff} {...flag('resize')} />
            <OptionRow id="opt-text" icon={TextCursorInputIcon} label={t('inspector.opt.textEdit')} hint={t('inspector.opt.textEditHint')} disabled={editOff} {...flag('textEdit')} />
          </Section>
        </div>

        <details className="group rounded-xl border bg-card">
          <summary className="flex cursor-pointer list-none items-center gap-2 rounded-xl px-3 py-2.5 text-[13px] font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
            <KeyboardIcon className="size-4 text-muted-foreground" aria-hidden />
            <span className="flex-1">{t('inspector.shortcuts')}</span>
            <ChevronRightIcon className="size-4 text-muted-foreground transition-transform duration-200 group-open:rotate-90" aria-hidden />
          </summary>
          <dl className="grid gap-x-4 gap-y-2 border-t px-3 py-3 text-xs @md:grid-cols-2">
            {shortcuts.map(([keys, label]) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="shrink-0">{keys}</dd>
              </div>
            ))}
          </dl>
        </details>
      </div>
    </ToolPage>
  )
}
