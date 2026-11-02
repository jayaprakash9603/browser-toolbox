import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { RouterProvider } from '@/app/router'
import { ReportIssueDialog } from '@/features/support/ReportIssueDialog'
import { registerModules } from '@/modules'

registerModules()
beforeEach(() => {
  userEvent.setup()
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function openReport() {
  render(
    <RouterProvider>
      <ReportIssueDialog open onOpenChange={vi.fn()} />
    </RouterProvider>,
  )
}
function describeIssue() {
  fireEvent.change(screen.getByLabelText('Title', { exact: false }), {
    target: { value: 'Cannot convert data' },
  })
  fireEvent.change(screen.getByLabelText('What went wrong?', { exact: false }), {
    target: { value: 'Expected JSON, got an empty result.' },
  })
}

describe('issue report review', () => {
  it('requires details and previews the report before offering send actions', () => {
    openReport()
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

  it('excludes diagnostics when unchecked and copies exactly the reviewed report', async () => {
    const write = vi.fn().mockResolvedValue(undefined)
    vi.spyOn(navigator.clipboard, 'writeText').mockImplementation(write)
    openReport()
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

  it('shows copy errors and preserves the report for another sharing method', async () => {
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('Clipboard blocked'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    openReport()
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
})
