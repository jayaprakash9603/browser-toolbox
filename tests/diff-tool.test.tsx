import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nextProvider } from 'react-i18next'

import {
  DEFAULT_RULES,
  alignDiff,
  applySection,
  buildView,
  inlineDiff,
  parseText,
  type DiffRules,
} from '@/core/engines/diff'
import i18n from '@/i18n'
import { registerModules } from '@/modules'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import DiffTool from '@/tools/text/text-diff/Tool'
import { htmlReport, unifiedPatch } from '@/tools/text/text-diff/report'

registerModules()

const EXACT: DiffRules = { ignoreCase: false, whitespace: 'exact', ignoreBlankLines: false }
const align = (a: string, b: string, rules: DiffRules = EXACT, ignoreMinor = false) =>
  alignDiff(a, b, { rules, ignoreMinor })
const kinds = (a: string, b: string, rules?: DiffRules, ignoreMinor?: boolean) =>
  align(a, b, rules, ignoreMinor).rows.map((row) => row.kind)

describe('aligned diff engine', () => {
  it('parses line endings and trailing newlines', () => {
    expect(parseText('')).toEqual({ lines: [], eol: 'None', trailingNewline: false })
    expect(parseText('a\r\nb\r\n')).toEqual({ lines: ['a', 'b'], eol: 'CRLF', trailingNewline: true })
    expect(parseText('a\nb\r\nc').eol).toBe('Mixed')
  })

  it('reports identical input', () => {
    const diff = align('one\ntwo', 'one\ntwo')
    expect(diff.verdict).toBe('identical')
    expect(diff.sections).toHaveLength(0)
  })

  it('pairs changed lines and keeps orphans on their own side', () => {
    expect(kinds('a\nb\nc', 'a\nB2\nc')).toEqual(['same', 'changed', 'same'])
    expect(kinds('a\nextra\nc', 'a\nc')).toEqual(['same', 'left', 'same'])
    expect(kinds('a\nc', 'a\nnew\nc')).toEqual(['same', 'right', 'same'])
  })

  it('aligns similar lines on the same row inside a hunk', () => {
    const diff = align('const retries = 3;\nend', 'const verbose = false;\nconst retries = 5;\nend')
    expect(diff.rows.map((row) => row.kind)).toEqual(['right', 'changed', 'same'])
    expect(diff.rows[1]).toMatchObject({ left: 0, right: 1 })
  })

  it('classifies whitespace, case and blank-line differences as unimportant', () => {
    expect(kinds('a  \nb', 'a\nb', DEFAULT_RULES)).toEqual(['minor', 'same'])
    expect(kinds('a  \nb', 'a\nb', EXACT)).toEqual(['changed', 'same'])
    expect(kinds('Hello', 'hello', { ...EXACT, ignoreCase: true })).toEqual(['minor'])
    expect(kinds('a\n\nb', 'a\nb', { ...EXACT, ignoreBlankLines: true })).toEqual(['same', 'minor', 'same'])

    const minorOnly = align('a  ', 'a', DEFAULT_RULES)
    expect(minorOnly.verdict).toBe('minor')
    expect(minorOnly.sections).toHaveLength(1)
    expect(minorOnly.sections[0].important).toBe(false)
    expect(align('a  ', 'a', DEFAULT_RULES, true).sections).toHaveLength(0)
  })

  it('copies a section in either direction and keeps the target line endings', () => {
    const diff = align('keep\r\nold\r\ntail\r\n', 'keep\nnew\nextra\ntail\n')
    expect(diff.sections).toHaveLength(1)
    const section = diff.sections[0]
    expect(applySection(diff, section, 'toRight')).toBe('keep\nold\ntail\n')
    expect(applySection(diff, section, 'toLeft')).toBe('keep\r\nnew\r\nextra\r\ntail\r\n')
  })

  it('builds filtered views with collapsible gaps', () => {
    const left = ['1', '2', '3', '4', 'x', '6', '7', '8', '9'].join('\n')
    const right = ['1', '2', '3', '4', 'y', '6', '7', '8', '9'].join('\n')
    const { rows } = align(left, right)
    expect(buildView(rows, 'diffs', 0, false, new Set())).toEqual([
      { type: 'gap', from: 0, to: 4 },
      { type: 'row', row: 4 },
      { type: 'gap', from: 5, to: 9 },
    ])
    const context = buildView(rows, 'context', 1, false, new Set())
    expect(context.filter((item) => item.type === 'row').map((item) => item.type === 'row' && item.row)).toEqual([3, 4, 5])
    expect(buildView(rows, 'diffs', 0, false, new Set([0])).filter((item) => item.type === 'row')).toHaveLength(5)
    expect(buildView(rows, 'same', 0, false, new Set())).toContainEqual({ type: 'gap', from: 4, to: 5 })
  })

  it('highlights changed words and marks whitespace-only edits as unimportant', () => {
    const words = inlineDiff('const total = 10;', 'const total = 20;', 'words', EXACT)
    expect(words.left.filter((segment) => segment.kind === 'diff').map((segment) => segment.text)).toEqual(['10'])
    expect(words.firstColumn).toBe(15)

    const spacing = inlineDiff('a = 1', 'a  = 1', 'chars', DEFAULT_RULES)
    expect(spacing.right.some((segment) => segment.kind === 'minor')).toBe(true)
    expect(spacing.right.some((segment) => segment.kind === 'diff')).toBe(false)
  })

  it('exports a unified patch and an HTML report', () => {
    expect(unifiedPatch('a\nb\n', 'a\nc\n', 'old.txt', 'new.txt')).toContain('-b\n+c')
    const diff = align('a\n<b>', 'a\n<c>')
    const html = htmlReport({
      diff,
      items: buildView(diff.rows, 'all', 3, false, new Set()),
      filter: 'all',
      leftName: 'old',
      rightName: 'new',
      rules: EXACT,
      granularity: 'words',
      t: i18n.t,
    })
    expect(html).toContain('&lt;')
    expect(html).not.toContain('<b>')
  })
})

function renderTool() {
  return render(
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>
        <DiffTool />
      </TooltipProvider>
    </I18nextProvider>,
  )
}

describe('Diff tool', () => {
  beforeAll(() => {
    Element.prototype.scrollTo = vi.fn()
  })

  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
  })

  afterEach(cleanup)

  it('is named Diff and starts in edit mode', () => {
    renderTool()
    expect(screen.getByRole('heading', { name: 'Diff' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Edit' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('button', { name: /Try an example/ })).toBeInTheDocument()
  }, 30_000)

  it('navigates, merges and undoes difference sections', async () => {
    renderTool()
    fireEvent.click(screen.getByRole('button', { name: /Try an example/ }))

    await screen.findByText('3 difference sections')
    expect(screen.getByRole('radio', { name: 'Compare' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getAllByText('greet.js (v1)').length).toBeGreaterThan(0)

    fireEvent.click(screen.getByRole('button', { name: 'Next difference (Alt+↓)' }))
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    expect(screen.getAllByText('Changed').length).toBeGreaterThan(0)

    fireEvent.click(screen.getAllByRole('button', { name: 'Copy section to right' })[0])
    await screen.findByText('Section copied to the right')
    await waitFor(() => expect(screen.getByText(/\/ 2$/)).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Undo' }))
    await waitFor(() => expect(screen.getByText(/\/ 3$/)).toBeInTheDocument())
  }, 30_000)

  it('treats unimportant differences as equal when asked', async () => {
    renderTool()
    fireEvent.click(screen.getByRole('button', { name: /Try an example/ }))
    await screen.findByText('3 difference sections')

    fireEvent.click(screen.getByRole('button', { name: 'Ignore unimportant differences' }))
    await screen.findByText('2 difference sections')
  }, 30_000)
})
