import { memo, useEffect, useMemo, useRef, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import { ArrowLeftIcon, ArrowRightIcon, ChevronsUpDownIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import {
  inlineDiff,
  maxColumns,
  type AlignedDiff,
  type DiffRow,
  type DiffRules,
  type DiffSection,
  type InlineGranularity,
  type ViewFilter,
  type ViewItem,
} from '@/core/engines/diff'
import { cn } from '@/shared/utils/cn'

import { PlainText, Segments } from './DiffText'
import { Overview } from './Overview'
import type { DiffLayout } from './prefs'
import { LINE_NUMBER_TINT, MISSING_LINE, RAIL_TINT, ROW_TINT } from './styles'

export interface ScrollTarget {
  row: number
  nonce: number
}

export type CopyDirection = 'toRight' | 'toLeft'

interface RowSettings {
  granularity: InlineGranularity
  rules: DiffRules
  showWhitespace: boolean
  wrap: boolean
}

interface RowProps {
  row: DiffRow
  index: number
  leftText: string | null
  rightText: string | null
  selected: boolean
  current: boolean
  section: DiffSection | null
  settings: RowSettings
  onSelect: (row: number) => void
  onCopy: (section: DiffSection, direction: CopyDirection) => void
}

const VIRTUALIZE_AFTER = 1500

function useInline({ row, leftText, rightText, settings }: Pick<RowProps, 'row' | 'leftText' | 'rightText' | 'settings'>) {
  return useMemo(
    () =>
      leftText !== null && rightText !== null && row.kind !== 'same'
        ? inlineDiff(leftText, rightText, settings.granularity, settings.rules, row.kind === 'minor')
        : null,
    [leftText, rightText, row.kind, settings.granularity, settings.rules],
  )
}

function textClass(wrap: boolean) {
  return cn('min-h-5 min-w-0 px-2', wrap ? 'whitespace-pre-wrap [overflow-wrap:anywhere]' : 'whitespace-pre')
}

function MergeButtons({
  section,
  current,
  onCopy,
  className,
}: {
  section: DiffSection
  current: boolean
  onCopy: RowProps['onCopy']
  className?: string
}) {
  const { t } = useTranslation()
  const button =
    'flex size-[18px] cursor-pointer items-center justify-center rounded-[4px] border bg-background text-foreground/80 shadow-xs transition-colors duration-150 hover:border-primary/50 hover:bg-primary hover:text-primary-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none [&_svg]:size-3'
  return (
    <span
      className={cn(
        'z-[1] flex items-center gap-0.5 transition-opacity duration-150',
        current ? 'opacity-100' : 'opacity-50 group-hover/row:opacity-100 focus-within:opacity-100',
        className,
      )}
    >
      <button
        type="button"
        className={button}
        aria-label={t('diff.copyToRight')}
        title={t('diff.copyToRight')}
        onClick={(event) => {
          event.stopPropagation()
          onCopy(section, 'toRight')
        }}
      >
        <ArrowRightIcon />
      </button>
      <button
        type="button"
        className={button}
        aria-label={t('diff.copyToLeft')}
        title={t('diff.copyToLeft')}
        onClick={(event) => {
          event.stopPropagation()
          onCopy(section, 'toLeft')
        }}
      >
        <ArrowLeftIcon />
      </button>
    </span>
  )
}

function KindLabel({ kind }: { kind: DiffRow['kind'] }) {
  const { t } = useTranslation()
  if (kind === 'same') return null
  return <span className="sr-only">{t(`diff.kind.${kind}`)}: </span>
}

const SplitRow = memo(function SplitRow(props: RowProps) {
  const { row, index, leftText, rightText, selected, current, section, settings, onSelect, onCopy } = props
  const inline = useInline(props)
  const sideTint = (present: boolean) => (present ? ROW_TINT[row.kind] : MISSING_LINE)
  const isStart = section !== null && section.startRow === index

  return (
    <div
      data-row={index}
      onClick={() => onSelect(index)}
      className={cn(
        'group/row grid [grid-template-columns:var(--cols)]',
        selected && 'outline -outline-offset-1 outline-primary/60',
        current && 'shadow-[inset_3px_0_0_var(--color-primary)]',
      )}
    >
      <span className={cn('select-none px-1.5 text-right tabular-nums', sideTint(leftText !== null), LINE_NUMBER_TINT[row.kind])}>
        {row.left === null ? '' : row.left + 1}
      </span>
      <span className={cn(textClass(settings.wrap), sideTint(leftText !== null))}>
        <KindLabel kind={row.kind} />
        {leftText !== null &&
          (inline ? (
            <Segments segments={inline.left} showWhitespace={settings.showWhitespace} />
          ) : (
            <PlainText text={leftText} showWhitespace={settings.showWhitespace} />
          ))}
      </span>
      <span className="relative flex items-start justify-center border-x bg-muted/30">
        {row.kind !== 'same' && (
          <span aria-hidden className={cn('absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2', RAIL_TINT[row.kind])} />
        )}
        {isStart && <MergeButtons section={section} current={current} onCopy={onCopy} className="relative mt-px" />}
      </span>
      <span className={cn('select-none px-1.5 text-right tabular-nums', sideTint(rightText !== null), LINE_NUMBER_TINT[row.kind])}>
        {row.right === null ? '' : row.right + 1}
      </span>
      <span className={cn(textClass(settings.wrap), sideTint(rightText !== null))}>
        {rightText !== null &&
          (inline ? (
            <Segments segments={inline.right} showWhitespace={settings.showWhitespace} />
          ) : (
            <PlainText text={rightText} showWhitespace={settings.showWhitespace} />
          ))}
      </span>
    </div>
  )
})

const InlineRow = memo(function InlineRow(props: RowProps) {
  const { row, index, leftText, rightText, selected, current, section, settings, onSelect, onCopy } = props
  const inline = useInline(props)
  const isStart = section !== null && section.startRow === index
  const number = 'select-none px-1.5 text-right tabular-nums'

  const line = (side: 'left' | 'right' | 'both', content: ReactNode) => (
    <div className={cn('grid [grid-template-columns:var(--cols)]', ROW_TINT[row.kind])}>
      <span className={cn(number, LINE_NUMBER_TINT[row.kind])}>{side !== 'right' && row.left !== null ? row.left + 1 : ''}</span>
      <span className={cn(number, LINE_NUMBER_TINT[row.kind])}>{side !== 'left' && row.right !== null ? row.right + 1 : ''}</span>
      <span aria-hidden className={cn('select-none text-center', LINE_NUMBER_TINT[row.kind])}>
        {side === 'left' ? '−' : side === 'right' ? '+' : ''}
      </span>
      <span className={textClass(settings.wrap)}>{content}</span>
    </div>
  )

  return (
    <div
      data-row={index}
      onClick={() => onSelect(index)}
      className={cn(
        'group/row relative',
        selected && 'outline -outline-offset-1 outline-primary/60',
        current && 'shadow-[inset_3px_0_0_var(--color-primary)]',
      )}
    >
      <KindLabel kind={row.kind} />
      {row.kind === 'same' && leftText !== null && line('both', <PlainText text={leftText} showWhitespace={settings.showWhitespace} />)}
      {row.kind !== 'same' &&
        leftText !== null &&
        line(
          'left',
          inline ? (
            <Segments segments={inline.left} showWhitespace={settings.showWhitespace} />
          ) : (
            <PlainText text={leftText} showWhitespace={settings.showWhitespace} />
          ),
        )}
      {row.kind !== 'same' &&
        rightText !== null &&
        line(
          'right',
          inline ? (
            <Segments segments={inline.right} showWhitespace={settings.showWhitespace} />
          ) : (
            <PlainText text={rightText} showWhitespace={settings.showWhitespace} />
          ),
        )}
      {isStart && (
        <MergeButtons section={section} current={current} onCopy={onCopy} className="absolute top-px left-[calc(100cqw-3.25rem)]" />
      )}
    </div>
  )
})

function GapRow({ from, to, filter, onExpand }: { from: number; to: number; filter: ViewFilter; onExpand: (from: number) => void }) {
  const { t } = useTranslation()
  const count = to - from
  return (
    <div className="border-y border-dashed bg-muted/40">
      <button
        type="button"
        onClick={() => onExpand(from)}
        className="sticky left-0 flex w-[100cqw] cursor-pointer items-center justify-center gap-1.5 py-0.5 font-sans text-[11px] text-muted-foreground transition-colors duration-150 hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
      >
        <ChevronsUpDownIcon className="size-3" aria-hidden />
        {filter === 'same' ? t('diff.hiddenDiffs', { count }) : t('diff.hiddenSame', { count })}
        <span className="text-primary">{t('diff.showLines')}</span>
      </button>
    </div>
  )
}

interface DiffViewerProps {
  diff: AlignedDiff
  items: ViewItem[]
  filter: ViewFilter
  layout: DiffLayout
  wrap: boolean
  showWhitespace: boolean
  granularity: InlineGranularity
  rules: DiffRules
  selectedRow: number | null
  currentSection: DiffSection | null
  sectionByRow: Int32Array
  leftName: string
  rightName: string
  scrollTarget: ScrollTarget | null
  onSelectRow: (row: number) => void
  onExpandGap: (from: number) => void
  onCopySection: (section: DiffSection, direction: CopyDirection) => void
  onKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
}

export function DiffViewer({
  diff,
  items,
  filter,
  layout,
  wrap,
  showWhitespace,
  granularity,
  rules,
  selectedRow,
  currentSection,
  sectionByRow,
  leftName,
  rightName,
  scrollTarget,
  onSelectRow,
  onExpandGap,
  onCopySection,
  onKeyDown,
}: DiffViewerProps) {
  const { t } = useTranslation()
  const scrollerRef = useRef<HTMLDivElement>(null)
  const settings = useMemo<RowSettings>(
    () => ({ granularity, rules, showWhitespace, wrap }),
    [granularity, rules, showWhitespace, wrap],
  )
  const columns = useMemo(() => Math.max(maxColumns(diff.left.lines), maxColumns(diff.right.lines)), [diff])
  const digits = String(Math.max(diff.left.lines.length, diff.right.lines.length, 1)).length

  const gridStyle = useMemo(() => {
    const textWidth = `calc(${columns}ch + 1.5rem)`
    const vars: Record<string, string> =
      layout === 'split'
        ? {
            '--ln': `calc(${digits}ch + 1rem)`,
            '--gutter': '2.75rem',
            '--col': wrap ? 'minmax(0, 1fr)' : `max(calc((100cqw - 2 * var(--ln) - var(--gutter)) / 2), ${textWidth})`,
            '--cols': 'var(--ln) var(--col) var(--gutter) var(--ln) var(--col)',
            width: wrap ? '100%' : 'calc(2 * var(--ln) + var(--gutter) + 2 * var(--col))',
          }
        : {
            '--ln': `calc(${digits}ch + 1rem)`,
            '--col': wrap ? 'minmax(0, 1fr)' : `max(calc(100cqw - 2 * var(--ln) - 1.25rem), ${textWidth})`,
            '--cols': 'var(--ln) var(--ln) 1.25rem var(--col)',
            width: wrap ? '100%' : 'calc(2 * var(--ln) + 1.25rem + var(--col))',
          }
    return vars as CSSProperties
  }, [columns, digits, layout, wrap])

  useEffect(() => {
    const scroller = scrollerRef.current
    if (!scrollTarget || !scroller) return
    const element = scroller.querySelector<HTMLElement>(`[data-row="${scrollTarget.row}"]`)
    if (!element) return
    const top = element.offsetTop
    const bottom = top + element.offsetHeight
    const header = 30
    if (top < scroller.scrollTop + header || bottom > scroller.scrollTop + scroller.clientHeight) {
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      scroller.scrollTo({ top: Math.max(0, top - scroller.clientHeight / 3), behavior: reduced ? 'auto' : 'smooth' })
    }
  }, [scrollTarget])

  const Row = layout === 'split' ? SplitRow : InlineRow
  const virtualize = items.length > VIRTUALIZE_AFTER
  const sideHeader = (name: string, lines: number, eol: string) => (
    <span className="flex min-w-0 items-center gap-1.5 px-2 font-sans">
      <span className="truncate text-xs font-semibold text-foreground">{name}</span>
      <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
        {t('common.lines', { count: lines })}
        {eol !== 'None' && ` · ${eol}`}
      </span>
    </span>
  )

  return (
    <div className="flex min-h-0 flex-1">
      <Overview items={items} rows={diff.rows} scrollerRef={scrollerRef} />
      <div
        ref={scrollerRef}
        role="region"
        aria-label={t('diff.viewerLabel')}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="scrollbar-styled min-h-0 min-w-0 flex-1 overflow-auto overscroll-contain outline-none [container-type:inline-size] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      >
        <div style={gridStyle} className="relative min-w-full font-mono text-xs leading-5 [tab-size:4]">
          <div className="sticky top-0 z-10 grid h-7 items-center border-b bg-background/95 backdrop-blur-sm [grid-template-columns:var(--cols)]">
            {layout === 'split' ? (
              <>
                <span className="col-span-2 min-w-0">{sideHeader(leftName, diff.left.lines.length, diff.left.eol)}</span>
                <span className="h-full border-x bg-muted/30" />
                <span className="col-span-2 min-w-0">{sideHeader(rightName, diff.right.lines.length, diff.right.eol)}</span>
              </>
            ) : (
              <span className="col-span-4 flex min-w-0 items-center gap-1 px-1 font-sans text-xs">
                <span className="truncate font-semibold">{leftName}</span>
                <ArrowRightIcon className="size-3 shrink-0 text-muted-foreground" aria-hidden />
                <span className="truncate font-semibold">{rightName}</span>
              </span>
            )}
          </div>
          {items.map((item) => {
            if (item.type === 'gap') {
              return <GapRow key={`gap-${item.from}`} from={item.from} to={item.to} filter={filter} onExpand={onExpandGap} />
            }
            const row = diff.rows[item.row]
            const sectionIndex = sectionByRow[item.row]
            const section = sectionIndex >= 0 ? diff.sections[sectionIndex] : null
            return (
              <div key={item.row} className={virtualize ? '[contain-intrinsic-block-size:auto_20px] [content-visibility:auto]' : undefined}>
                <Row
                  row={row}
                  index={item.row}
                  leftText={row.left === null ? null : diff.left.lines[row.left]}
                  rightText={row.right === null ? null : diff.right.lines[row.right]}
                  selected={selectedRow === item.row}
                  current={currentSection !== null && section === currentSection}
                  section={section}
                  settings={settings}
                  onSelect={onSelectRow}
                  onCopy={onCopySection}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
