import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from '@/app/App'
import { registerModules } from '@/modules'
import { toolRegistry } from '@/core/registry'

registerModules()
afterEach(cleanup)
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockImplementation((media: string) => ({
      matches: false,
      media,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  })
})

describe('registered tool routes', () => {
  it('renders every registered tool without hitting the error boundary', async () => {
    const failures: string[] = []
    const errorLog = vi.spyOn(console, 'error').mockImplementation((...args) => {
      if (args[0] === 'Tool render failed') {
        const details = args[1] as { error: Error; route: string }
        failures.push(`${details.route}: ${details.error.message}`)
      }
    })

    try {
      for (const tool of toolRegistry.getAll()) {
        window.location.hash = `#${tool.route}`
        const { unmount } = render(<App />)

        try {
          try {
            await waitFor(() => {
              expect(
                screen.queryByRole('heading', { level: 1 }) ||
                  screen.queryByText('This tool ran into a problem.'),
              ).toBeTruthy()
            }, { timeout: 10000 })
          } catch {
            failures.push(`${tool.route}: route did not render a tool heading`)
          }

          if (screen.queryByText('This tool ran into a problem.')) {
            failures.push(`${tool.route}: error boundary displayed`)
          }
        } finally {
          unmount()
        }
      }

      expect(failures).toEqual([])
    } finally {
      errorLog.mockRestore()
    }
  }, 120000)
})