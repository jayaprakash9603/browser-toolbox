import { createTwoFilesPatch } from 'diff'
import type { TFunction } from 'i18next'

import {
  inlineDiff,
  type AlignedDiff,
  type DiffRules,
  type InlineGranularity,
  type InlineSegment,
  type ViewFilter,
  type ViewItem,
} from '@/core/engines/diff'

export function unifiedPatch(left: string, right: string, leftName: string, rightName: string): string {
  return createTwoFilesPatch(leftName, rightName, left, right, undefined, undefined, { context: 3 })
}

export function downloadText(text: string, filename: string, type = 'text/plain') {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function segmentsHtml(segments: InlineSegment[]): string {
  return segments
    .map((segment) =>
      segment.kind === 'same'
        ? escapeHtml(segment.text)
        : `<span class="${segment.kind === 'diff' ? 'hd' : 'hm'}">${escapeHtml(segment.text)}</span>`,
    )
    .join('')
}

interface ReportInput {
  diff: AlignedDiff
  items: ViewItem[]
  filter: ViewFilter
  leftName: string
  rightName: string
  rules: DiffRules
  granularity: InlineGranularity
  t: TFunction
}

export function htmlReport({ diff, items, filter, leftName, rightName, rules, granularity, t }: ReportInput): string {
  const { stats } = diff
  const body = items
    .map((item) => {
      if (item.type === 'gap') {
        const label = t(filter === 'same' ? 'diff.hiddenDiffs' : 'diff.hiddenSame', { count: item.to - item.from })
        return `<tr class="gap"><td colspan="4">${escapeHtml(label)}</td></tr>`
      }
      const row = diff.rows[item.row]
      const a = row.left === null ? null : diff.left.lines[row.left]
      const b = row.right === null ? null : diff.right.lines[row.right]
      let leftHtml = a === null ? '' : escapeHtml(a)
      let rightHtml = b === null ? '' : escapeHtml(b)
      if (a !== null && b !== null && row.kind !== 'same') {
        const inline = inlineDiff(a, b, granularity, rules, row.kind === 'minor')
        leftHtml = segmentsHtml(inline.left)
        rightHtml = segmentsHtml(inline.right)
      }
      const ln = (index: number | null) => (index === null ? '' : String(index + 1))
      return `<tr class="${row.kind}"><td class="ln">${ln(row.left)}</td><td class="tx${a === null ? ' none' : ''}">${leftHtml}</td><td class="ln">${ln(row.right)}</td><td class="tx${b === null ? ' none' : ''}">${rightHtml}</td></tr>`
    })
    .join('\n')

  const summary = [
    t('diff.statChanged', { count: stats.changed }),
    t('diff.statLeftOnly', { count: stats.leftOnly }),
    t('diff.statRightOnly', { count: stats.rightOnly }),
    t('diff.statMinor', { count: stats.minor }),
  ].join(' · ')

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${escapeHtml(t('diff.reportTitle'))}: ${escapeHtml(leftName)} ↔ ${escapeHtml(rightName)}</title>
<style>
  :root { color-scheme: light; font-family: system-ui, sans-serif; }
  body { margin: 24px; color: #1f2328; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .meta { color: #59636e; font-size: 12px; margin-bottom: 12px; }
  .legend { display: flex; gap: 14px; font-size: 12px; margin: 8px 0 14px; flex-wrap: wrap; }
  .legend i { display: inline-block; width: 10px; height: 10px; border-radius: 2px; margin-right: 5px; vertical-align: -1px; }
  table { border-collapse: collapse; width: 100%; table-layout: fixed; font: 12px/1.6 ui-monospace, SFMono-Regular, Consolas, monospace; border: 1px solid #d0d7de; }
  th { background: #f6f8fa; text-align: left; padding: 6px 8px; font: 600 12px system-ui, sans-serif; border-bottom: 1px solid #d0d7de; }
  td { padding: 0 8px; vertical-align: top; white-space: pre-wrap; word-break: break-all; tab-size: 4; }
  td.ln { width: 3.5em; text-align: right; color: #8c959f; background: #f6f8fa; user-select: none; }
  tr.changed td.tx { background: #ffebe9; }
  tr.left td.tx, tr.right td.tx { background: #f3e8ff; }
  tr.minor td.tx { background: #eef6ff; color: #0550ae; }
  td.tx.none { background: repeating-linear-gradient(135deg, #fff 0 5px, #eaeef2 5px 6px) !important; }
  .hd { background: #ffb3ad; border-radius: 2px; }
  .hm { background: #cfe5ff; border-radius: 2px; }
  tr.gap td { text-align: center; color: #59636e; background: #f6f8fa; font-family: system-ui, sans-serif; padding: 3px; }
</style>
</head>
<body>
<h1>${escapeHtml(t('diff.reportTitle'))}</h1>
<div class="meta">${escapeHtml(new Date().toLocaleString())} · ${escapeHtml(t(`diff.verdict.${diff.verdict}`, { count: diff.sections.length }))} · ${escapeHtml(summary)}</div>
<div class="legend">
  <span><i style="background:#ffb3ad"></i>${escapeHtml(t('diff.legendChanged'))}</span>
  <span><i style="background:#e9d5ff"></i>${escapeHtml(t('diff.legendOrphan'))}</span>
  <span><i style="background:#cfe5ff"></i>${escapeHtml(t('diff.legendMinor'))}</span>
</div>
<table>
<colgroup><col style="width:3.5em"><col><col style="width:3.5em"><col></colgroup>
<thead><tr><th colspan="2">${escapeHtml(leftName)}</th><th colspan="2">${escapeHtml(rightName)}</th></tr></thead>
<tbody>
${body}
</tbody>
</table>
</body>
</html>`
}
