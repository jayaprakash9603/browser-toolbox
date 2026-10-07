import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { I18nextProvider } from 'react-i18next'

import i18n from '@/i18n'
import { registerModules } from '@/modules'
import { TooltipProvider } from '@/shared/components/ui/tooltip'

vi.mock('@/features/api-client/ToolboxApiClient', () => ({
  ToolboxApiClient: () => <div data-testid="postman-lite-api-client">Postman Lite</div>,
}))

import ApiRequestBuilderTool from '@/tools/api/request-builder/Tool'

registerModules()
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
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
  it('renders the Postman Lite API client shell', () => {
    renderTool()
    expect(screen.getByRole('heading', { name: 'API Request Builder' })).toBeInTheDocument()
    expect(screen.getByTestId('postman-lite-api-client')).toBeInTheDocument()
  })
})
