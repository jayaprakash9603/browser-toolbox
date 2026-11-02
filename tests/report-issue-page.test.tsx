import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { RouterProvider } from '@/app/router'
import ReportIssuePage from '@/app/pages/ReportIssuePage'
import { SupportCard } from '@/features/support/SupportCard'
import { registerModules } from '@/modules'
import { TooltipProvider } from '@/shared/components/ui/tooltip'

registerModules()
const initialClipboard = Object.getOwnPropertyDescriptor(navigator, 'clipboard')
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  if (initialClipboard) {
    Object.defineProperty(navigator, 'clipboard', initialClipboard)
  } else {
    Reflect.deleteProperty(navigator, 'clipboard')
  }
})

function renderReport(from = '/') {
  window.location.hash = `#/report-issue?from=${encodeURIComponent(from)}`
  return render(
    <TooltipProvider>
      <RouterProvider>
        <ReportIssuePage />
      </RouterProvider>
    </TooltipProvider>,
  )
}

function mockClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText },
  })
}

function describeIssue() {
  fireEvent.change(screen.getByLabelText('Title', { exact: false }), {
    target: { value: 'Cannot convert data' },
  })
  fireEvent.change(screen.getByLabelText('What went wrong?', { exact: false }), {
    target: { value: 'Expected JSON, got an empty result.' },
  })
}

describe('full-page issue reporting', () => {
  it('navigates to a full-page route and keeps the originating tool context', () => {
    window.location.hash = '#/tools/text/diff'
    render(
      <TooltipProvider>
        <RouterProvider>
          <SupportCard delay={0} />
        </RouterProvider>
      </TooltipProvider>,
    )
    expect(screen.getByRole('link', { name: 'Report an Issue' })).toHaveAttribute(
      'href',
      '#/report-issue?from=%2Ftools%2Ftext%2Fdiff',
    )
    renderReport('/tools/text/diff')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Report an issue', level: 1 })).toBeInTheDocument()
    describeIssue()
    fireEvent.click(screen.getByRole('button', { name: 'Review report' }))
    const github = screen.getByRole('link', { name: 'Open GitHub issue' })
    const url = new URL(github.getAttribute('href')!)
    expect(url.searchParams.get('body')).toContain('**Tool:** Diff')
    expect(url.searchParams.get('body')).toContain('Panel route: /tools/text/diff')
  })

  it('requires details and previews the report before offering share actions', () => {
    renderReport()
    expect(screen.getByRole('button', { name: 'Review report' })).toBeDisabled()
    expect(screen.queryByRole('link', { name: 'Open GitHub issue' })).not.toBeInTheDocument()
    describeIssue()
    fireEvent.click(screen.getByRole('button', { name: 'Review report' }))
    const github = screen.getByRole('link', { name: 'Open GitHub issue' })
    const url = new URL(github.getAttribute('href')!)
    expect(url.searchParams.get('title')).toBe('Cannot convert data')
    expect(url.searchParams.get('body')).toContain('Expected JSON, got an empty result.')
    expect(url.searchParams.get('body')).toContain('Extension version:')
    expect(screen.getByRole('region', { name: 'Your report preview' })).toHaveTextContent(
      'Expected JSON',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Edit details' }))
    expect(screen.getByLabelText('Title', { exact: false })).toHaveValue('Cannot convert data')
  })

  it('filters and selects a tool in the reusable autocomplete', () => {
    renderReport()
    const toolPicker = screen.getByRole('combobox', { name: 'Tool' })
    fireEvent.focus(toolPicker)
    fireEvent.change(toolPicker, { target: { value: 'diff' } })
    fireEvent.click(screen.getByRole('option', { name: 'Diff' }))

    describeIssue()
    fireEvent.click(screen.getByRole('button', { name: 'Review report' }))
    const github = screen.getByRole('link', { name: 'Open GitHub issue' })
    expect(new URL(github.getAttribute('href')!).searchParams.get('body')).toContain(
      '**Tool:** Diff',
    )
  })

  it('excludes diagnostics when unchecked and copies exactly the reviewed report', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    mockClipboard(write)
    renderReport()
    describeIssue()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Include basic diagnostics' }))
    fireEvent.click(screen.getByRole('button', { name: 'Review report' }))
    const github = screen.getByRole('link', { name: 'Open GitHub issue' })
    expect(new URL(github.getAttribute('href')!).searchParams.get('body')).not.toContain(
      'Diagnostics',
    )
    fireEvent.click(screen.getByRole('button', { name: 'Copy report' }))
    expect(await screen.findByRole('button', { name: 'Copied' })).toBeInTheDocument()
    expect(write).toHaveBeenCalledWith(
      expect.stringContaining('Cannot convert data\n\n**Tool:** General'),
    )
    expect(write).not.toHaveBeenCalledWith(expect.stringContaining('Diagnostics'))
  })

  it('shows copy errors and preserves email as a fallback share action', async () => {
    mockClipboard(vi.fn().mockRejectedValue(new Error('Clipboard blocked')))
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    renderReport()
    describeIssue()
    fireEvent.click(screen.getByRole('button', { name: 'Review report' }))
    fireEvent.click(screen.getByRole('button', { name: 'Copy report' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not copy the report')
    expect(log).toHaveBeenCalled()
    expect(screen.getByRole('link', { name: 'Email report' })).toHaveAttribute(
      'href',
      expect.stringContaining('mailto:'),
    )
  })

  it('keeps the preview and share actions in the full-page content region', () => {
    renderReport()
    describeIssue()
    fireEvent.click(screen.getByRole('button', { name: 'Review report' }))
    const page = screen.getByRole('region', { name: 'Your report preview' })
    expect(within(page).getByText('Cannot convert data')).toBeInTheDocument()
    expect(page.closest('.report-page')).toBeInTheDocument()
  })
})
