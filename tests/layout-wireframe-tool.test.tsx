import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nextProvider } from 'react-i18next'

import { DEFAULT_INSPECTOR_OPTIONS, type PageInspectorState } from '@/chrome/content/pageInspector/model'
import i18n from '@/i18n'
import { registerModules } from '@/modules'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import LayoutWireframeTool from '@/tools/design/layout-wireframe/Tool'
import { sendToActiveTab } from '@/tools/web/tabMessaging'
import { resetChromeMockStorage } from './setup'

const page = vi.hoisted(() => ({ available: true, state: null as unknown as PageInspectorState }))

vi.mock('@/tools/web/tabMessaging', () => ({
  getActiveTabId: vi.fn(async () => 1),
  sendToActiveTab: vi.fn(async (message: { type: string; options?: object; action?: string }) => {
    if (!page.available) return null
    if (message.type === 'PAGE_INSPECTOR_SET') page.state = { ...page.state, options: { ...page.state.options, ...message.options } }
    if (message.type === 'PAGE_INSPECTOR_ACTION') {
      if (message.action === 'reset') page.state = { ...page.state, changes: 0, canUndo: false }
      return { state: page.state, css: message.action === 'export' ? '#title {\n  color: red;\n}' : undefined }
    }
    return page.state
  }),
}))

registerModules()

function renderTool() {
  return render(
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>
        <LayoutWireframeTool />
      </TooltipProvider>
    </I18nextProvider>,
  )
}

beforeEach(() => {
  resetChromeMockStorage()
  page.available = true
  page.state = { options: { ...DEFAULT_INSPECTOR_OPTIONS }, changes: 0, canUndo: false, selected: null }
  vi.mocked(sendToActiveTab).mockClear()
})

afterEach(() => {
  cleanup()
})

describe('Layout Wireframe inspector panel', () => {
  it('turns the inspector on with every option and translated overlay labels', async () => {
    const user = userEvent.setup()
    renderTool()
    const master = screen.getByRole('switch', { name: 'Inspect this page' })
    expect(master).not.toBeChecked()
    expect(screen.getByRole('switch', { name: 'Hover details' })).toBeChecked()

    await user.click(master)
    await waitFor(() => expect(master).toBeChecked())
    const call = vi.mocked(sendToActiveTab).mock.calls.find(([message]) => message.type === 'PAGE_INSPECTOR_SET')![0] as {
      options: { enabled: boolean; move: boolean }
      labels: Record<string, string>
    }
    expect(call.options).toMatchObject({ enabled: true, move: true })
    expect(call.labels.copyCss).toBe('Copy CSS')
    expect(screen.getByText(/Hover any element to see its CSS/)).toBeInTheDocument()
  })

  it('sends option changes to the page and disables edit tools without selection', async () => {
    const user = userEvent.setup()
    page.state = { ...page.state, options: { ...page.state.options, enabled: true } }
    renderTool()
    const select = screen.getByRole('switch', { name: 'Click to select' })
    await waitFor(() => expect(screen.getByRole('switch', { name: 'Inspect this page' })).toBeChecked())

    await user.click(screen.getByRole('radio', { name: 'By depth' }))
    expect(sendToActiveTab).toHaveBeenCalledWith({ type: 'PAGE_INSPECTOR_SET', options: { outlineMode: 'depth' } })

    await user.click(select)
    expect(screen.getByRole('switch', { name: 'Move by dragging' })).toBeDisabled()
    expect(screen.getByRole('switch', { name: 'Resize handles' })).toBeDisabled()
    expect(screen.getByText(/Turn on “Click to select”/)).toBeInTheDocument()
  })

  it('copies the page edits as CSS and resets them', async () => {
    const user = userEvent.setup()
    page.state = { ...page.state, options: { ...page.state.options, enabled: true }, changes: 2, canUndo: true, selected: 'h1#title' }
    renderTool()
    expect(await screen.findByText('2 elements changed')).toBeInTheDocument()
    expect(screen.getByText('Selected: h1#title')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Copy changes as CSS' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Changes copied' })).toBeInTheDocument())
    expect(await navigator.clipboard.readText()).toBe('#title {\n  color: red;\n}')

    await user.click(screen.getByRole('button', { name: 'Reset all' }))
    expect(await screen.findByText(/No changes yet/)).toBeInTheDocument()
  })

  it('explains when the current tab cannot be inspected', async () => {
    page.available = false
    renderTool()
    expect(await screen.findByRole('alert')).toHaveTextContent(/can’t be inspected/)
  })

  it('treats a reply from an outdated page script as unavailable', async () => {
    page.state = {} as PageInspectorState
    renderTool()
    expect(await screen.findByRole('alert')).toHaveTextContent(/can’t be inspected/)
    expect(screen.getByRole('switch', { name: 'Inspect this page' })).not.toBeChecked()
  })
})
