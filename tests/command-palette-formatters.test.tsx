import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { RouterProvider } from '@/app/router'
import { CommandPalette } from '@/features/command-palette/CommandPalette'
import i18n from '@/i18n'
import { registerModules } from '@/modules'

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

describe('formatter search shortcuts', () => {
  it('opens the unified formatter with the searched format selected', async () => {
    const user = userEvent.setup()
    window.location.hash = '#/'

    render(
      <I18nextProvider i18n={i18n}>
        <RouterProvider>
          <CommandPalette open onOpenChange={() => undefined} />
        </RouterProvider>
      </I18nextProvider>,
    )

    await user.type(screen.getByPlaceholderText('Search tools…'), 'JSON Formatter')
    await user.click(await screen.findByRole('option', { name: /JSON Formatter/ }))

    expect(window.location.hash).toBe('#/tools/text/formatter?format=json')
  })
})