import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react'
import {
  AlertCircleIcon,
  ClipboardPasteIcon,
  EraserIcon,
  FileSearchIcon,
  GlobeIcon,
  PencilLineIcon,
  RotateCwIcon,
  TextCursorInputIcon,
  TextSelectIcon,
  TriangleAlertIcon,
  VolumeXIcon,
} from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'
import { useTranslation } from 'react-i18next'

import { readClipboardText } from '@/core/clipboard/clipboardService'
import { toolRegistry } from '@/core/registry'
import { textToBlocks, type ReadablePage } from '@/core/text/readablePage'
import { ToolPage } from '@/shared/components/ToolPage'
import { Alert, AlertDescription, AlertTitle } from '@/shared/components/ui/alert'
import { Button } from '@/shared/components/ui/button'
import { Label } from '@/shared/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { Textarea } from '@/shared/components/ui/textarea'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'
import { cn } from '@/shared/utils/cn'
import { sendToActiveTab } from '@/tools/web/tabMessaging'

import { PlayerBar } from './PlayerBar'
import { ReaderView } from './ReaderView'
import { ReadingOptionsPopover, SpeedPopover } from './ReadingOptions'
import { VoicePicker } from './VoicePicker'
import { AUTO_VOICE, useReadAloudPrefs } from './prefs'
import { buildReader, estimateSeconds, formatClock, pickAutoVoice } from './speechText'
import { useSpeechReader, useVoices } from './useSpeechReader'

type Source = 'page' | 'selection' | 'text'

interface LoadState {
  status: 'idle' | 'loading' | 'ready' | 'error'
  page: ReadablePage | null
}

const SHORTCUT_IGNORE =
  'input, textarea, select, [contenteditable="true"], [role="slider"], [role="tab"], [role="radio"], [role="listbox"], [role="option"], [role="dialog"], [role="menu"], [role="menuitem"]'
const NATIVE_SPACE = 'button, a, [role="switch"], [role="checkbox"]'

function useReadAloudTool() {
  const tool = toolRegistry.get('text.read-aloud')
  if (!tool) throw new Error('Unknown tool: text.read-aloud')
  return tool
}

async function readFromTab(scope: 'page' | 'selection'): Promise<LoadState> {
  try {
    const data = await sendToActiveTab<ReadablePage & { text?: string }>({ type: 'GET_READABLE_TEXT', scope })
    if (!data) return { status: 'error', page: null }
    const blocks = Array.isArray(data.blocks) ? data.blocks : textToBlocks(data.text ?? '')
    return {
      status: 'ready',
      page: { title: data.title ?? '', url: data.url ?? '', lang: data.lang ?? '', blocks },
    }
  } catch {
    return { status: 'error', page: null }
  }
}

function hostOf(url: string | undefined): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return ''
  }
}

function SpeakingBars() {
  const reduceMotion = useReducedMotion()
  return (
    <span className="flex h-4 items-end gap-[3px]" aria-hidden>
      {[0, 1, 2].map((bar) => (
        <motion.span
          key={bar}
          className="h-full w-[3px] origin-bottom rounded-full bg-current"
          initial={{ scaleY: 0.45 }}
          animate={reduceMotion ? { scaleY: 0.7 } : { scaleY: [0.35, 1, 0.55, 0.9, 0.35] }}
          transition={
            reduceMotion ? { duration: 0 } : { duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: bar * 0.18 }
          }
        />
      ))}
    </span>
  )
}

function EmptyPanel({
  icon: Icon,
  title,
  hint,
  action,
  tone = 'default',
}: {
  icon: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>
  title: string
  hint: string
  action?: ReactNode
  tone?: 'default' | 'warning'
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <div
        className={cn(
          'flex size-14 items-center justify-center rounded-2xl ring-1 ring-inset',
          tone === 'warning' ? 'bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400' : 'bg-primary/10 text-primary ring-primary/15',
        )}
      >
        <Icon className="size-6" aria-hidden />
      </div>
      <div className="max-w-[32ch]">
        <p className="text-sm font-semibold">{title}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{hint}</p>
      </div>
      {action}
    </div>
  )
}

function ReaderSkeleton() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-3 px-[var(--density-page-pad)] py-4" role="status" aria-label={t('text.readAloud.loading')}>
      <div className="h-5 w-2/3 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      {[0, 1, 2].map((row) => (
        <div key={row} className="flex flex-col gap-2">
          <div className="h-3.5 w-full animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="h-3.5 w-11/12 animate-pulse rounded bg-muted motion-reduce:animate-none" />
          <div className="h-3.5 w-3/5 animate-pulse rounded bg-muted motion-reduce:animate-none" />
        </div>
      ))}
    </div>
  )
}

function ActionButton({
  label,
  onClick,
  disabled,
  children,
  attention,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
  children: ReactNode
  attention?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          disabled={disabled}
          onClick={onClick}
          className="relative"
        >
          {children}
          {attention && <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-primary" aria-hidden />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  )
}

export default function ReadAloudTool() {
  const { t, i18n } = useTranslation()
  const tool = useReadAloudTool()
  const { prefs, update, reset } = useReadAloudPrefs()
  const voices = useVoices()

  const [source, setSource] = useState<Source>('page')
  const [page, setPage] = useState<LoadState>({ status: 'loading', page: null })
  const [selection, setSelection] = useState<LoadState>({ status: 'idle', page: null })
  const [pageStale, setPageStale] = useState(false)
  const [customText, setCustomText] = useState('')
  const deferredText = useDeferredValue(customText)

  const browserLang = typeof navigator === 'undefined' ? 'en' : navigator.language
  const activeDoc = source === 'page' ? page.page : source === 'selection' ? selection.page : null
  const textLang = (source === 'text' ? '' : activeDoc?.lang) || browserLang

  const blocks = useMemo(
    () => (source === 'text' ? textToBlocks(deferredText) : (activeDoc?.blocks ?? [])),
    [source, deferredText, activeDoc],
  )
  const model = useMemo(
    () =>
      buildReader(
        blocks,
        { skipUrls: prefs.skipUrls, skipCitations: prefs.skipCitations, readCode: prefs.readCode },
        textLang,
      ),
    [blocks, prefs.skipUrls, prefs.skipCitations, prefs.readCode, textLang],
  )

  const autoVoice = pickAutoVoice(voices, textLang)
  const chosenVoice = prefs.voiceUri === AUTO_VOICE ? undefined : voices.find((voice) => voice.voiceURI === prefs.voiceUri)
  const voiceSettings = {
    voice: chosenVoice ?? autoVoice,
    lang: textLang,
    rate: prefs.rate,
    pitch: prefs.pitch,
    volume: prefs.volume,
  }
  const reader = useSpeechReader(model.segments, voiceSettings)
  const hasText = model.segments.length > 0

  useEffect(() => {
    let alive = true
    void readFromTab('page').then((result) => {
      if (alive) setPage(result)
    })
    return () => {
      alive = false
    }
  }, [])

  const reloadPage = useCallback(async () => {
    setPageStale(false)
    setPage((prev) => ({ status: 'loading', page: prev.page }))
    setPage(await readFromTab('page'))
  }, [])

  const loadSelection = useCallback(async () => {
    setSelection((prev) => ({ status: 'loading', page: prev.page }))
    setSelection(await readFromTab('selection'))
  }, [])

  const live = useRef({ status: reader.status, source, reloadPage })
  useEffect(() => {
    live.current = { status: reader.status, source, reloadPage }
  })

  useEffect(() => {
    const tabs = typeof chrome === 'undefined' ? undefined : chrome.tabs
    if (!tabs?.onActivated || !tabs.onUpdated) return
    const pageChanged = () => {
      const { status, source: current, reloadPage: reload } = live.current
      if (status === 'idle' && current === 'page') void reload()
      else setPageStale(true)
    }
    const onUpdated = (_id: number, info: chrome.tabs.OnUpdatedInfo, tab: chrome.tabs.Tab) => {
      if (info.status === 'complete' && tab.active) pageChanged()
    }
    tabs.onActivated.addListener(pageChanged)
    tabs.onUpdated.addListener(onUpdated)
    return () => {
      tabs.onActivated.removeListener(pageChanged)
      tabs.onUpdated.removeListener(onUpdated)
    }
  }, [])

  const actions = useRef(reader)
  useEffect(() => {
    actions.current = reader
  })

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
      const target = event.target instanceof Element ? event.target : null
      if (target?.closest(SHORTCUT_IGNORE)) return
      const current = actions.current
      if (event.key === ' ') {
        if (target?.closest(NATIVE_SPACE)) return
        event.preventDefault()
        current.toggle()
      } else if (event.key === 'ArrowRight') {
        event.preventDefault()
        current.next()
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault()
        current.previous()
      } else if (event.key === 'Escape' && current.status !== 'idle') {
        current.stop()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const changeSource = (value: string) => {
    const next = value as Source
    setSource(next)
    if (next === 'selection') void loadSelection()
    if (next === 'page' && pageStale && reader.status === 'idle') void reloadPage()
  }

  const pasteText = async () => {
    try {
      const pasted = await readClipboardText()
      if (pasted) setCustomText((prev) => (prev.trim() ? `${prev.trimEnd()}\n\n${pasted}` : pasted))
    } catch {
      // Clipboard access needs focus and permission; the textarea still accepts Ctrl+V.
    }
  }

  const preview = () => reader.preview(t('text.readAloud.previewSample'), voiceSettings)

  const numberFormat = useMemo(() => new Intl.NumberFormat(i18n.resolvedLanguage), [i18n.resolvedLanguage])
  const stats = hasText
    ? t('text.readAloud.stats', {
        words: numberFormat.format(model.words),
        duration: formatClock(estimateSeconds(model.words, prefs.rate)),
      })
    : ''
  const playing = reader.status === 'playing'
  const showEditor = source === 'text' && reader.status === 'idle'

  const announcement = playing
    ? t('text.readAloud.statusPlaying')
    : reader.status === 'paused'
      ? t('text.readAloud.statusPaused')
      : reader.finished
        ? t('text.readAloud.statusFinished')
        : ''

  const readerView = (
    <ReaderView
      model={model}
      position={reader.position}
      marking={reader.status !== 'idle'}
      playing={playing}
      word={reader.word}
      highlightWords={prefs.highlightWords}
      follow={prefs.follow}
      textSize={prefs.textSize}
      onSelect={reader.playFrom}
    />
  )

  const summaryIcon = playing ? (
    <SpeakingBars />
  ) : source === 'page' ? (
    <GlobeIcon className="size-4" aria-hidden />
  ) : source === 'selection' ? (
    <TextSelectIcon className="size-4" aria-hidden />
  ) : (
    <PencilLineIcon className="size-4" aria-hidden />
  )

  let summaryTitle: string
  let summaryDetail = stats
  let summaryActions: ReactNode
  if (source === 'page') {
    const host = hostOf(page.page?.url)
    summaryTitle = page.page?.title || (page.status === 'loading' ? t('text.readAloud.loading') : t('text.readAloud.untitled'))
    summaryDetail = [host, stats].filter(Boolean).join(' · ')
    summaryActions = (
      <ActionButton
        label={t('text.readAloud.reloadPage')}
        onClick={() => void reloadPage()}
        disabled={page.status === 'loading'}
        attention={pageStale}
      >
        <RotateCwIcon aria-hidden className={cn(page.status === 'loading' && 'animate-spin motion-reduce:animate-none')} />
      </ActionButton>
    )
  } else if (source === 'selection') {
    const host = hostOf(selection.page?.url)
    summaryTitle = host ? t('text.readAloud.selectionFrom', { host }) : t('text.readAloud.sourceSelection')
    summaryActions = (
      <Button
        type="button"
        variant="outline"
        size="xs"
        onClick={() => void loadSelection()}
        disabled={selection.status === 'loading'}
      >
        <TextCursorInputIcon aria-hidden />
        {t('text.readAloud.getSelection')}
      </Button>
    )
  } else {
    summaryTitle = t('text.readAloud.sourceText')
    summaryDetail = [stats, customText ? t('text.readAloud.charCount', { count: customText.length }) : '']
      .filter(Boolean)
      .join(' · ')
    summaryActions = showEditor ? (
      <div className="flex items-center gap-0.5">
        <ActionButton label={t('text.readAloud.paste')} onClick={() => void pasteText()}>
          <ClipboardPasteIcon aria-hidden />
        </ActionButton>
        <ActionButton label={t('text.readAloud.clear')} onClick={() => setCustomText('')} disabled={!customText}>
          <EraserIcon aria-hidden />
        </ActionButton>
      </div>
    ) : (
      <Button type="button" variant="outline" size="xs" onClick={reader.stop}>
        <PencilLineIcon aria-hidden />
        {t('text.readAloud.editText')}
      </Button>
    )
  }

  const errorPanel = (retry: () => void) => (
    <EmptyPanel
      icon={TriangleAlertIcon}
      tone="warning"
      title={t('text.readAloud.pageError')}
      hint={t('text.readAloud.pageErrorHint')}
      action={
        <Button type="button" variant="outline" size="sm" onClick={retry}>
          <RotateCwIcon aria-hidden />
          {t('text.readAloud.retry')}
        </Button>
      }
    />
  )

  const selectionEmpty = (
    <EmptyPanel
      icon={TextSelectIcon}
      title={t('text.readAloud.emptySelection')}
      hint={t('text.readAloud.emptySelectionHint')}
      action={
        <Button type="button" size="sm" onClick={() => void loadSelection()}>
          <TextCursorInputIcon aria-hidden />
          {t('text.readAloud.getSelection')}
        </Button>
      }
    />
  )

  return (
    <ToolPage tool={tool} backTo="/" contentClassName="overflow-hidden p-0">
      <div className="flex h-full min-h-0 flex-col">
        <p role="status" aria-atomic="true" className="sr-only">
          {announcement}
        </p>

        <Tabs value={source} onValueChange={changeSource} className="min-h-0 flex-1 gap-0">
          <div className="flex shrink-0 flex-col gap-3 border-b px-[var(--density-page-pad)] pt-[var(--density-page-pad)] pb-3">
            <TabsList variant="pill" fullWidth aria-label={t('text.readAloud.source')} className="w-full">
              <TabsTrigger value="page">
                <GlobeIcon aria-hidden />
                {t('text.readAloud.sourcePage')}
              </TabsTrigger>
              <TabsTrigger value="selection">
                <TextSelectIcon aria-hidden />
                {t('text.readAloud.sourceSelection')}
              </TabsTrigger>
              <TabsTrigger value="text">
                <PencilLineIcon aria-hidden />
                {t('text.readAloud.sourceText')}
              </TabsTrigger>
            </TabsList>

            <div className="flex min-h-9 items-center gap-2.5">
              <div
                className={cn(
                  'flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors duration-200',
                  playing ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary',
                )}
              >
                {summaryIcon}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium" title={summaryTitle}>
                  {summaryTitle}
                </p>
                {summaryDetail && <p className="truncate text-[11px] text-muted-foreground tabular-nums">{summaryDetail}</p>}
              </div>
              {summaryActions}
            </div>
          </div>

          {!reader.supported && (
            <Alert className="mx-[var(--density-page-pad)] mt-3 w-auto">
              <VolumeXIcon aria-hidden />
              <AlertTitle>{t('text.readAloud.unsupported')}</AlertTitle>
              <AlertDescription>{t('text.readAloud.unsupportedHint')}</AlertDescription>
            </Alert>
          )}

          <TabsContent value="page" className="min-h-0 flex-1">
            {page.status === 'loading' && !page.page ? (
              <ReaderSkeleton />
            ) : page.status === 'error' ? (
              errorPanel(() => void reloadPage())
            ) : hasText ? (
              readerView
            ) : (
              <EmptyPanel
                icon={FileSearchIcon}
                title={t('text.readAloud.emptyPage')}
                hint={t('text.readAloud.emptyPageHint')}
                action={
                  <Button type="button" variant="outline" size="sm" onClick={() => changeSource('selection')}>
                    <TextSelectIcon aria-hidden />
                    {t('text.readAloud.sourceSelection')}
                  </Button>
                }
              />
            )}
          </TabsContent>

          <TabsContent value="selection" className="min-h-0 flex-1">
            {selection.status === 'loading' && !selection.page ? (
              <ReaderSkeleton />
            ) : selection.status === 'error' ? (
              errorPanel(() => void loadSelection())
            ) : hasText ? (
              readerView
            ) : (
              selectionEmpty
            )}
          </TabsContent>

          <TabsContent value="text" className="min-h-0 flex-1">
            {showEditor ? (
              <div className="flex min-h-0 flex-1 flex-col px-[var(--density-page-pad)] py-3">
                <Label htmlFor="read-aloud-text" className="sr-only">
                  {t('text.readAloud.textLabel')}
                </Label>
                <Textarea
                  id="read-aloud-text"
                  value={customText}
                  onChange={(event) => setCustomText(event.target.value)}
                  placeholder={t('text.readAloud.textPlaceholder')}
                  className="scrollbar-styled min-h-0 flex-1 resize-none text-[15px] leading-7"
                />
              </div>
            ) : (
              readerView
            )}
          </TabsContent>
        </Tabs>

        <PlayerBar
          status={reader.status}
          finished={reader.finished}
          position={reader.position}
          segments={model.segments}
          totalWords={model.words}
          rate={prefs.rate}
          disabled={!reader.supported || !hasText}
          onToggle={reader.toggle}
          onStop={reader.stop}
          onPrevious={reader.previous}
          onNext={reader.next}
          onSeek={reader.seek}
          notice={
            reader.error && (
              <Alert variant="destructive" className="py-2">
                <AlertCircleIcon aria-hidden />
                <AlertDescription className="flex items-center justify-between gap-2">
                  <span>{t('text.readAloud.speechError', { reason: reader.error })}</span>
                  <Button type="button" variant="ghost" size="xs" onClick={reader.dismissError}>
                    {t('text.readAloud.dismiss')}
                  </Button>
                </AlertDescription>
              </Alert>
            )
          }
          voiceRow={
            <VoicePicker
              voices={voices}
              value={prefs.voiceUri}
              autoVoice={autoVoice}
              textLang={textLang}
              disabled={!reader.supported}
              onChange={(voiceUri) => update({ voiceUri })}
              onPreview={preview}
            />
          }
          speedControl={
            <SpeedPopover rate={prefs.rate} disabled={!reader.supported} onChange={(rate) => update({ rate })} />
          }
          optionsControl={<ReadingOptionsPopover prefs={prefs} onChange={update} onReset={reset} />}
        />
      </div>
    </ToolPage>
  )
}
