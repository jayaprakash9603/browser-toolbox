import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { inlineDiff, type AlignedDiff, type DiffRules, type InlineGranularity, type RowKind } from '@/core/engines/diff'
import { cn } from '@/shared/utils/cn'

import { PlainText, Segments } from './DiffText'
import { SWATCH } from './styles'

const KIND_DOT: Record<RowKind, string> = {
  same: 'bg-muted-foreground/40',
  minor: SWATCH.minor,
  changed: SWATCH.changed,
  left: SWATCH.orphan,
  right: SWATCH.orphan,
}

export function DetailPane({
  diff,
  row,
  granularity,
  rules,
}: {
  diff: AlignedDiff
  row: number | null
  granularity: InlineGranularity
  rules: DiffRules
}) {
  const { t } = useTranslation()
  const current = row === null ? null : diff.rows[row]
  const leftText = current?.left == null ? null : diff.left.lines[current.left]
  const rightText = current?.right == null ? null : diff.right.lines[current.right]
  const inline = useMemo(
    () =>
      current && leftText !== null && rightText !== null && current.kind !== 'same'
        ? inlineDiff(leftText, rightText, granularity, rules, current.kind === 'minor')
        : null,
    [current, leftText, rightText, granularity, rules],
  )

  if (!current) {
    return (
      <div className="flex h-[4.25rem] shrink-0 items-center justify-center border-t bg-muted/20 px-3 text-center text-xs text-muted-foreground">
        {t('diff.detailHint')}
      </div>
    )
  }

  const line = (side: 'left' | 'right', text: string | null, number: number | null) => (
    <div className="grid grid-cols-[3.25rem_minmax(0,1fr)] items-start">
      <span className="select-none pr-2 text-right font-sans text-[11px] leading-5 text-muted-foreground tabular-nums">
        {t(side === 'left' ? 'diff.leftShort' : 'diff.rightShort')} {number === null ? '' : number + 1}
      </span>
      <code
        className={cn(
          'min-h-5 rounded-[3px] px-1.5 font-mono text-xs leading-5 whitespace-pre-wrap [overflow-wrap:anywhere] [tab-size:4]',
          text === null ? 'font-sans text-muted-foreground italic' : 'bg-background',
        )}
      >
        {text === null ? (
          t('diff.noLine')
        ) : inline ? (
          <Segments segments={side === 'left' ? inline.left : inline.right} showWhitespace />
        ) : (
          <PlainText text={text} showWhitespace />
        )}
      </code>
    </div>
  )

  return (
    <section aria-label={t('diff.detailLabel')} aria-live="polite" className="max-h-36 shrink-0 overflow-auto border-t bg-muted/25 px-2 py-1.5">
      <div className="mb-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 pl-1 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <span aria-hidden className={cn('size-2 rounded-full', KIND_DOT[current.kind])} />
          {t(`diff.kind.${current.kind}`)}
        </span>
        {inline?.firstColumn != null && <span>{t('diff.firstDifference', { column: inline.firstColumn })}</span>}
        {leftText !== null && rightText !== null && leftText.length !== rightText.length && (
          <span className="tabular-nums">{t('diff.lengths', { left: leftText.length, right: rightText.length })}</span>
        )}
      </div>
      <div className="flex flex-col gap-0.5">
        {line('left', leftText, current.left)}
        {line('right', rightText, current.right)}
      </div>
    </section>
  )
}
