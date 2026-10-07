import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { I18nextProvider } from 'react-i18next'

import i18n from '@/i18n'
import { registerModules } from '@/modules'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import ApiRequestBuilderTool from '@/tools/qa/api-request-builder/Tool'

registerModules()
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

beforeEach(() => {
  vi.clearAllMocks()
})

function renderTool() {
  return render(
    <I18nextProvider i18n={i18n}>
      <TooltipProvider>
        <ApiRequestBuilderTool />
      </TooltipProvider>
    </I18nextProvider>,
  )
}

describe('API Request Builder', () => {
  it('requests access on Send and then displays the response', async () => {
    const user = userEvent.setup()
    vi.mocked(chrome.permissions.request).mockResolvedValue(true as never)
    vi.mocked(chrome.permissions.contains).mockResolvedValue(true as never)
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('{"ok":true}', {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
      }),
    )

    renderTool()
    expect(screen.getByRole('heading', { name: 'API Request Builder' })).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Request URL' }), 'https://api.example.com/v1')
    expect(chrome.permissions.request).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Send request' }))

    expect(chrome.permissions.request).toHaveBeenCalledWith({
      origins: ['https://api.example.com/*'],
    })
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled())
    expect(await screen.findByText(/200 OK/)).toBeInTheDocument()
    expect(screen.getByText(/"ok": true/)).toBeInTheDocument()
  })

  it('does not send when host access is denied', async () => {
    const user = userEvent.setup()
    vi.mocked(chrome.permissions.request).mockResolvedValue(false as never)
    const fetchSpy = vi.spyOn(globalThis, 'fetch')

    renderTool()
    expect(screen.getByRole('heading', { name: 'API Request Builder' })).toBeInTheDocument()
    await user.type(screen.getByRole('textbox', { name: 'Request URL' }), 'https://api.example.com')
    await user.click(screen.getByRole('button', { name: 'Send request' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(/access was not granted/i)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})