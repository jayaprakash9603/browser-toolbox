import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { RouterProvider } from '@/app/router'
import { CommandPalette } from '@/features/command-palette/CommandPalette'
import { trackRecentTool } from '@/features/recent-tools/recentToolsService'
import i18n from '@/i18n'
import { registerModules } from '@/modules'
import { resetChromeMockStorage } from './setup'

registerModules()
const originalScrollIntoView = Element.prototype.scrollIntoView

beforeAll(() => {
  vi.stubGlobal('ResizeObserver', class {
    observe() {}
    unobserve() {}
    disconnect() {}
  })
  Element.prototype.scrollIntoView = vi.fn()
})

afterAll(() => {
  vi.unstubAllGlobals()
  Element.prototype.scrollIntoView = originalScrollIntoView
})

beforeEach(() => {
  resetChromeMockStorage()
})

afterEach(() => {
  cleanup()
})

function renderPalette(onOpenChange = vi.fn()) {
  render(
    <I18nextProvider i18n={i18n}>
      <RouterProvider>
        <CommandPalette open onOpenChange={onOpenChange} />
      </RouterProvider>
    </I18nextProvider>,
  )
  return onOpenChange
}

describe('command palette', { timeout: 15_000 }, () => {
  it('lists recently opened tools first', async () => {
    await trackRecentTool('datetime.toolkit')
    renderPalette()
    const recent = await screen.findByRole('group', { name: 'Recent' })
    expect(within(recent).getByText('Date & Time Toolkit')).toBeInTheDocument()
  })

  it('shows a result count and an empty state with suggestions', async () => {
    const user = userEvent.setup()
    renderPalette()
    const input = screen.getByPlaceholderText('Search tools…')
    fireEvent.change(input, { target: { value: 'json' } })
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent(/\d+ results?/))

    fireEvent.change(input, { target: { value: '§§§§' } })
    expect(await screen.findByText('Nothing matches “§§§§”')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'timer' }))
    expect(input).toHaveValue('timer')
  })

  it('closes from the Esc button', async () => {
    const user = userEvent.setup()
    const onOpenChange = renderPalette()
    await user.click(screen.getByRole('button', { name: 'Close search' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})
