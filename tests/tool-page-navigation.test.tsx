import { fireEvent, render, screen } from '@testing-library/react'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it } from 'vitest'

import i18n from '@/i18n'
import { registerModules } from '@/modules'
import { toolRegistry } from '@/core/registry'
import { ToolPage } from '@/shared/components/ToolPage'
import { TooltipProvider } from '@/shared/components/ui/tooltip'

registerModules()

describe('tool page back navigation', () => {
  it('sends the clipboard manager directly home', () => {
    const tool = toolRegistry.get('clipboard.manager')!
    render(
      <TooltipProvider>
        <I18nextProvider i18n={i18n}>
          <ToolPage tool={tool} backTo="/">
            <div />
          </ToolPage>
        </I18nextProvider>
      </TooltipProvider>,
    )

    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '#/')
  })

  it('keeps category navigation as the default for other tools', () => {
    const tool = toolRegistry.get('text.analyzer')!
    render(
      <TooltipProvider>
        <I18nextProvider i18n={i18n}>
          <ToolPage tool={tool}>
            <div />
          </ToolPage>
        </I18nextProvider>
      </TooltipProvider>,
    )

    expect(screen.getByRole('link', { name: 'Back' })).toHaveAttribute('href', '#/categories/develop-qa')
  })
})

describe('tool page info', () => {
  it('keeps the description behind the info button', async () => {
    const tool = toolRegistry.get('text.analyzer')!
    render(
      <TooltipProvider>
        <I18nextProvider i18n={i18n}>
          <ToolPage tool={tool}>
            <div />
          </ToolPage>
        </I18nextProvider>
      </TooltipProvider>,
    )
    const description = i18n.t(`tools.${tool.id}.description`, {
      defaultValue: tool.description,
    })
    expect(screen.queryByText(description)).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^About / }))
    expect(await screen.findByText(description)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Copy link to tool' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Open in new tab' })).toBeInTheDocument()
  })
})
