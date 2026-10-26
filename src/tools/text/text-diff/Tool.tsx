import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from 'react'
import {
  ArrowLeftIcon,
  ArrowLeftRightIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CircleCheckIcon,
  Columns2Icon,
  CopyIcon,
  DownloadIcon,
  EqualApproximatelyIcon,
  EqualIcon,
  EraserIcon,
  FileCodeIcon,
  FileDiffIcon,
  FoldVerticalIcon,
  GitCompareArrowsIcon,
  EqualNotIcon,
  PanelBottomIcon,
  PencilIcon,
  Rows2Icon,
  Rows3Icon,
  SparklesIcon,
  Undo2Icon,
  WrapTextIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { alignDiff, applySection, buildView, type DiffSection, type ViewFilter } from '@/core/engines/diff'
import { consumePayload } from '@/core/payloads'
import i18n from '@/i18n'
import { diffStrings } from '@/i18n/locales/diffEn'
import { IconAction } from '@/shared/components/EditorPane'
import { TextPaneGrid } from '@/shared/components/TextPaneGrid'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu'
import { Segmented } from '@/shared/components/ui/segmented'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/components/ui/tooltip'

import { useTransformTool } from '../_shared'
import { DetailPane } from './DetailPane'
import { DiffViewer, type CopyDirection, type ScrollTarget } from './DiffViewer'
import { loadSession, useDiffPrefs, useSessionDraft, type DiffLayout, type DiffSession } from './prefs'
import { downloadText, htmlReport, unifiedPatch } from './report'
import { RulesPopover } from './RulesPopover'
import { SourcePane } from './SourcePane'
import { StatusBar } from './StatusBar'

// Registered with the tool chunk rather than en.ts so the side panel's startup bundle stays within budget.
i18n.addResources('en', 'translation', diffStrings)

type Mode = 'edit' | 'compare'

const SPLIT_MIN_WIDTH = 560
const MAX_UNDO = 50
const EMPTY_ROWS: ReadonlySet<number> = new Set()

const SAMPLE_LEFT = `function greet(user) {
  const name = user.name || "guest";
  console.log("Hello, " + name);
  // TODO: remove legacy logging
  return name;
}

const retries = 3;
const timeout = 5000;
export default greet;
`

const SAMPLE_RIGHT = `function greet(user, greeting = "Hello") {
  const name = user.name ?? "guest";
  console.log(\`\${greeting}, \${name}!\`);
  return name;
}

const retries = 5;
const verbose = false;
const timeout = 5000;
export default greet;   
`

function useElementWidth(ref: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const element = ref.current
    if (!element || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref])
  return width
}

function ToolbarGroup({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div role="group" aria-label={label} className="flex items-center gap-0.5 rounded-md border bg-background p-0.5 shadow-xs">
      {children}
    </div>
  )
}

function OptionLabel({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <>
      {icon}
      <span className="@max-[520px]:sr-only">{text}</span>
    </>
  )
}

export default function DiffTool() {
  const { t } = useTranslation()
  const tool = useTransformTool('text.diff')
  const [prefs, setPrefs] = useDiffPrefs()
  const [session, setSession] = useState(loadSession)
  useSessionDraft(session)
  const [mode, setMode] = useState<Mode>(() => (session.left && session.right ? 'compare' : 'edit'))
  const [selected, setSelected] = useState<number | null>(null)
  const [scrollTarget, setScrollTarget] = useState<ScrollTarget | null>(null)
  const [history, setHistory] = useState<Pick<DiffSession, 'left' | 'right'>[]>([])
  const [message, setMessage] = useState<string | null>(null)
  const messageTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  const rootRef = useRef<HTMLDivElement>(null)
  const sessionRef = useRef(session)
  const width = useElementWidth(rootRef)
  const layout: DiffLayout = prefs.layout ?? (width === 0 || width >= SPLIT_MIN_WIDTH ? 'split' : 'inline')

  const left = useDeferredValue(session.left)
  const right = useDeferredValue(session.right)
  const stale = left !== session.left || right !== session.right
  const diff = useMemo(
    () => alignDiff(left, right, { rules: prefs.rules, ignoreMinor: prefs.ignoreMinor }),
    [left, right, prefs.rules, prefs.ignoreMinor],
  )

  const [expandedState, setExpandedState] = useState<{
    diff: typeof diff
    filter: ViewFilter
    context: number
    rows: ReadonlySet<number>
  } | null>(null)
  const expanded =
    expandedState?.diff === diff && expandedState.filter === prefs.filter && expandedState.context === prefs.contextLines
      ? expandedState.rows
      : EMPTY_ROWS
  const items = useMemo(
    () => buildView(diff.rows, prefs.filter, prefs.contextLines, prefs.ignoreMinor, expanded),
    [diff.rows, prefs.filter, prefs.contextLines, prefs.ignoreMinor, expanded],
  )
  const expandGap = useCallback(
    (from: number) =>
      setExpandedState({
        diff,
        filter: prefs.filter,
        context: prefs.contextLines,
        rows: new Set(expanded).add(from),
      }),
    [diff, prefs.filter, prefs.contextLines, expanded],
  )

  const sectionByRow = useMemo(() => {
    const map = new Int32Array(diff.rows.length).fill(-1)
    for (const section of diff.sections) map.fill(section.index, section.startRow, section.endRow)
    return map
  }, [diff])

  const selectedRow = selected !== null && selected < diff.rows.length ? selected : null
  const currentSection = selectedRow !== null && sectionByRow[selectedRow] >= 0 ? diff.sections[sectionByRow[selectedRow]] : null
  const leftName = session.leftName || t('diff.left')
  const rightName = session.rightName || t('diff.right')

  useEffect(() => {
    sessionRef.current = session
  }, [session])

  useEffect(() => () => clearTimeout(messageTimer.current), [])

  const flash = useCallback((text: string) => {
    clearTimeout(messageTimer.current)
    setMessage(text)
    messageTimer.current = setTimeout(() => setMessage(null), 2200)
  }, [])

  useEffect(() => {
    let cancelled = false
    void consumePayload(tool.id).then((payload) => {
      const text = payload?.text
      if (cancelled || !text?.trim()) return
      const name = payload?.pageTitle ?? ''
      const fillLeft = !sessionRef.current.left.trim()
      setSession((current) =>
        fillLeft ? { ...current, left: text, leftName: name } : { ...current, right: text, rightName: name },
      )
      setMode(fillLeft ? 'edit' : 'compare')
    })
    return () => {
      cancelled = true
    }
  }, [tool.id])

  const goTo = useCallback(
    (section: DiffSection | undefined) => {
      if (!section) return
      if (prefs.filter === 'same') setPrefs({ filter: 'all' })
      setSelected(section.startRow)
      setScrollTarget({ row: section.startRow, nonce: Date.now() })
    },
    [prefs.filter, setPrefs],
  )

  const nextSection = currentSection
    ? diff.sections[currentSection.index + 1]
    : diff.sections.find((section) => section.startRow > (selectedRow ?? -1))
  const prevSection = currentSection
    ? diff.sections[currentSection.index - 1]
    : [...diff.sections].reverse().find((section) => section.endRow <= (selectedRow ?? Number.POSITIVE_INFINITY))

  const remember = useCallback(() => {
    const { left: l, right: r } = sessionRef.current
    setHistory((stack) => [...stack.slice(-(MAX_UNDO - 1)), { left: l, right: r }])
  }, [])

  const copySection = useCallback(
    (section: DiffSection, direction: CopyDirection) => {
      if (stale) return
      const text = applySection(diff, section, direction)
      remember()
      setSession((current) => (direction === 'toRight' ? { ...current, right: text } : { ...current, left: text }))
      setSelected(section.startRow)
      flash(t(direction === 'toRight' ? 'diff.copiedToRight' : 'diff.copiedToLeft'))
    },
    [diff, stale, remember, flash, t],
  )

  const undo = () => {
    const last = history[history.length - 1]
    if (!last) return
    setHistory(history.slice(0, -1))
    setSession((current) => ({ ...current, ...last }))
    flash(t('diff.undone'))
  }

  const startCompare = () => {
    setMode('compare')
    if (selectedRow === null) goTo(diff.sections[0])
  }

  const swap = () => {
    setSession((current) => ({
      left: current.right,
      right: current.left,
      leftName: current.rightName,
      rightName: current.leftName,
    }))
    setSelected(null)
  }

  const clearAll = () => {
    remember()
    setSession({ left: '', right: '', leftName: '', rightName: '' })
    setSelected(null)
    setMode('edit')
  }

  const loadSample = () => {
    remember()
    setSession({ left: SAMPLE_LEFT, right: SAMPLE_RIGHT, leftName: 'greet.js (v1)', rightName: 'greet.js (v2)' })
    setSelected(null)
    setMode('compare')
  }

  const writeClipboard = (text: string, done: string) => {
    void navigator.clipboard.writeText(text).then(
      () => flash(done),
      () => flash(t('diff.clipboardFailed')),
    )
  }
  const patch = () => unifiedPatch(session.left, session.right, leftName, rightName)
  const report = () =>
    htmlReport({
      diff,
      items,
      filter: prefs.filter,
      leftName,
      rightName,
      rules: prefs.rules,
      granularity: prefs.granularity,
      t,
    })

  const moveSelection = (step: number) => {
    const order = items.flatMap((item) => (item.type === 'row' ? [item.row] : []))
    if (order.length === 0) return
    const position = selectedRow === null ? -1 : order.indexOf(selectedRow)
    const next = order[Math.min(order.length - 1, Math.max(0, position === -1 ? 0 : position + step))]
    setSelected(next)
    setScrollTarget({ row: next, nonce: Date.now() })
  }

  const onViewerKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const plain = !event.altKey && !event.ctrlKey && !event.metaKey
    const key = event.key
    let handled = true
    if ((event.altKey && key === 'ArrowDown') || (key === 'F7' && !event.shiftKey) || (plain && key === 'n')) goTo(nextSection)
    else if ((event.altKey && key === 'ArrowUp') || (key === 'F7' && event.shiftKey) || (plain && key === 'p')) goTo(prevSection)
    else if (plain && key === 'ArrowDown') moveSelection(1)
    else if (plain && key === 'ArrowUp') moveSelection(-1)
    else if ((event.ctrlKey || event.metaKey) && key.toLowerCase() === 'z') undo()
    else handled = false
    if (handled) event.preventDefault()
  }

  const counter = currentSection ? currentSection.index + 1 : '–'
  const noVisibleDiffs = (prefs.filter === 'diffs' || prefs.filter === 'context') && diff.sections.length === 0

  const filterOptions = [
    { value: 'all', icon: <Rows3Icon />, text: t('diff.filterAll'), title: t('diff.filterAllHint') },
    { value: 'diffs', icon: <EqualNotIcon />, text: t('diff.filterDiffs'), title: t('diff.filterDiffsHint') },
    { value: 'context', icon: <FoldVerticalIcon />, text: t('diff.filterContext'), title: t('diff.filterContextHint') },
    { value: 'same', icon: <EqualIcon />, text: t('diff.filterSame'), title: t('diff.filterSameHint') },
  ] as const

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <div ref={rootRef} className="@container flex min-h-0 flex-1 flex-col gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <Segmented<Mode>
            ariaLabel={t('diff.mode')}
            value={mode}
            onValueChange={(next) => (next === 'compare' ? startCompare() : setMode('edit'))}
            options={[
              { value: 'edit', label: <OptionLabel icon={<PencilIcon />} text={t('diff.edit')} /> },
              { value: 'compare', label: <OptionLabel icon={<GitCompareArrowsIcon />} text={t('diff.compare')} /> },
            ]}
          />

          {mode === 'compare' ? (
            <>
              <Segmented<ViewFilter>
                ariaLabel={t('diff.filter')}
                value={prefs.filter}
                onValueChange={(filter) => setPrefs({ filter })}
                options={filterOptions.map((option) => ({
                  value: option.value,
                  title: option.title,
                  label: <OptionLabel icon={option.icon} text={option.text} />,
                }))}
              />
              <Segmented<DiffLayout>
                ariaLabel={t('diff.layout')}
                value={layout}
                onValueChange={(next) => setPrefs({ layout: next })}
                options={[
                  {
                    value: 'split',
                    title: t('diff.layoutSplit'),
                    label: (
                      <>
                        <Columns2Icon aria-hidden />
                        <span className="sr-only">{t('diff.layoutSplit')}</span>
                      </>
                    ),
                  },
                  {
                    value: 'inline',
                    title: t('diff.layoutInline'),
                    label: (
                      <>
                        <Rows2Icon aria-hidden />
                        <span className="sr-only">{t('diff.layoutInline')}</span>
                      </>
                    ),
                  },
                ]}
              />
              <ToolbarGroup label={t('diff.navigation')}>
                <IconAction label={t('diff.prev')} disabled={!prevSection} onClick={() => goTo(prevSection)}>
                  <ChevronUpIcon />
                </IconAction>
                <span aria-live="polite" className="min-w-11 text-center text-xs text-muted-foreground tabular-nums">
                  {counter} / {diff.sections.length}
                </span>
                <IconAction label={t('diff.next')} disabled={!nextSection} onClick={() => goTo(nextSection)}>
                  <ChevronDownIcon />
                </IconAction>
              </ToolbarGroup>
              <ToolbarGroup label={t('diff.merge')}>
                <IconAction
                  label={t('diff.copyToRight')}
                  disabled={!currentSection}
                  onClick={() => currentSection && copySection(currentSection, 'toRight')}
                >
                  <ArrowRightIcon />
                </IconAction>
                <IconAction
                  label={t('diff.copyToLeft')}
                  disabled={!currentSection}
                  onClick={() => currentSection && copySection(currentSection, 'toLeft')}
                >
                  <ArrowLeftIcon />
                </IconAction>
                <IconAction label={t('diff.undo')} disabled={history.length === 0} onClick={undo}>
                  <Undo2Icon />
                </IconAction>
              </ToolbarGroup>
              <div className="ml-auto flex items-center gap-0.5">
                <IconAction
                  label={t(prefs.ignoreMinor ? 'diff.ignoringMinor' : 'diff.ignoreMinor')}
                  pressed={prefs.ignoreMinor}
                  onClick={() => setPrefs({ ignoreMinor: !prefs.ignoreMinor })}
                >
                  <EqualApproximatelyIcon />
                </IconAction>
                <RulesPopover prefs={prefs} onChange={setPrefs} />
                <IconAction label={t('editor.wrap')} pressed={prefs.wrap} onClick={() => setPrefs({ wrap: !prefs.wrap })}>
                  <WrapTextIcon />
                </IconAction>
                <IconAction
                  label={t('diff.details')}
                  pressed={prefs.details}
                  onClick={() => setPrefs({ details: !prefs.details })}
                >
                  <PanelBottomIcon />
                </IconAction>
                <DropdownMenu>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-xs" aria-label={t('diff.export')} className="text-muted-foreground">
                          <DownloadIcon />
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>{t('diff.export')}</TooltipContent>
                  </Tooltip>
                  <DropdownMenuContent align="end" className="max-h-none">
                    <DropdownMenuItem disabled={diff.verdict === 'empty'} onSelect={() => writeClipboard(patch(), t('diff.patchCopied'))}>
                      <CopyIcon className="size-4" /> {t('diff.copyPatch')}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={diff.verdict === 'empty'} onSelect={() => downloadText(patch(), 'changes.patch', 'text/x-diff')}>
                      <FileDiffIcon className="size-4" /> {t('diff.downloadPatch')}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={diff.verdict === 'empty'} onSelect={() => downloadText(report(), 'diff-report.html', 'text/html')}>
                      <FileCodeIcon className="size-4" /> {t('diff.downloadReport')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem disabled={!session.left} onSelect={() => writeClipboard(session.left, t('diff.leftCopied'))}>
                      <CopyIcon className="size-4" /> {t('diff.copyLeft')}
                    </DropdownMenuItem>
                    <DropdownMenuItem disabled={!session.right} onSelect={() => writeClipboard(session.right, t('diff.rightCopied'))}>
                      <CopyIcon className="size-4" /> {t('diff.copyRight')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={swap}>
                      <ArrowLeftRightIcon className="size-4" /> {t('diff.swap')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </>
          ) : (
            <>
              <Button size="xs" variant="outline" onClick={swap} disabled={!session.left && !session.right}>
                <ArrowLeftRightIcon /> {t('diff.swap')}
              </Button>
              <Button size="xs" variant="ghost" onClick={loadSample}>
                <SparklesIcon /> {t('diff.sample')}
              </Button>
              <div className="ml-auto flex items-center gap-0.5">
                {history.length > 0 && (
                  <IconAction label={t('diff.undo')} onClick={undo}>
                    <Undo2Icon />
                  </IconAction>
                )}
                <Button size="xs" variant="ghost" onClick={clearAll} disabled={!session.left && !session.right}>
                  <EraserIcon /> {t('diff.clearBoth')}
                </Button>
              </div>
            </>
          )}
        </div>

        {mode === 'edit' ? (
          <>
            <TextPaneGrid>
              <SourcePane
                side="left"
                value={session.left}
                name={session.leftName}
                onChange={(value) => setSession((current) => ({ ...current, left: value }))}
                onLoad={(text, name) => setSession((current) => ({ ...current, left: text, leftName: name }))}
                onSubmit={startCompare}
                onError={flash}
              />
              <SourcePane
                side="right"
                value={session.right}
                name={session.rightName}
                onChange={(value) => setSession((current) => ({ ...current, right: value }))}
                onLoad={(text, name) => setSession((current) => ({ ...current, right: text, rightName: name }))}
                onSubmit={startCompare}
                onError={flash}
              />
            </TextPaneGrid>
            <div className="flex shrink-0 items-stretch overflow-hidden rounded-lg border">
              <StatusBar diff={diff} message={message} className="flex-1 border-t-0" />
              <Button
                size="xs"
                className="m-1 shrink-0"
                disabled={diff.verdict === 'empty'}
                onClick={startCompare}
              >
                <GitCompareArrowsIcon /> {t('diff.compare')}
              </Button>
            </div>
          </>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border bg-background shadow-xs">
            {diff.verdict === 'empty' ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                <GitCompareArrowsIcon className="size-9 text-muted-foreground/50" aria-hidden />
                <div>
                  <p className="text-sm font-medium">{t('diff.emptyTitle')}</p>
                  <p className="mx-auto mt-1 max-w-72 text-xs text-muted-foreground">{t('diff.emptyBody')}</p>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => setMode('edit')}>
                    <PencilIcon /> {t('diff.addText')}
                  </Button>
                  <Button size="sm" variant="outline" onClick={loadSample}>
                    <SparklesIcon /> {t('diff.sample')}
                  </Button>
                </div>
              </div>
            ) : noVisibleDiffs ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
                <CircleCheckIcon className="size-9 text-emerald-500/70" aria-hidden />
                <div>
                  <p className="text-sm font-medium">{t('diff.noDiffsTitle')}</p>
                  <p className="mx-auto mt-1 max-w-72 text-xs text-muted-foreground">
                    {t(diff.verdict === 'minor' ? 'diff.noDiffsMinor' : 'diff.noDiffsIdentical')}
                  </p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setPrefs({ filter: 'all' })}>
                  <Rows3Icon /> {t('diff.showAll')}
                </Button>
              </div>
            ) : (
              <DiffViewer
                diff={diff}
                items={items}
                filter={prefs.filter}
                layout={layout}
                wrap={prefs.wrap}
                showWhitespace={prefs.showWhitespace}
                granularity={prefs.granularity}
                rules={prefs.rules}
                selectedRow={selectedRow}
                currentSection={currentSection}
                sectionByRow={sectionByRow}
                leftName={leftName}
                rightName={rightName}
                scrollTarget={scrollTarget}
                onSelectRow={setSelected}
                onExpandGap={expandGap}
                onCopySection={copySection}
                onKeyDown={onViewerKey}
              />
            )}
            {prefs.details && diff.verdict !== 'empty' && !noVisibleDiffs && (
              <DetailPane diff={diff} row={selectedRow} granularity={prefs.granularity} rules={prefs.rules} />
            )}
            <StatusBar diff={diff} message={message} />
          </div>
        )}
      </div>
    </ToolPage>
  )
}
