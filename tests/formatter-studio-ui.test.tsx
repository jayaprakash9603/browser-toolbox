import { useState, type ReactNode } from 'react'
import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { I18nextProvider } from 'react-i18next'
import { describe, expect, it } from 'vitest'

import i18n from '@/i18n'
import { registerModules } from '@/modules'
import { toolRegistry } from '@/core/registry'
import { getWorkspaceForTool } from '@/core/registry/workspaces'
import { WorkspaceHost } from '@/features/workspace/WorkspaceHost'
import { WorkspaceContext, WorkspaceHeaderSlotContext } from '@/features/workspace/WorkspaceContext'
import { ToolPage } from '@/shared/components/ToolPage'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import FormatterStudioTool from '@/tools/developer/formatter-studio/Tool'

registerModules()

const HOST_ID = 'developer.formatter-studio'

function Providers({ children }: { children: ReactNode }) {
  return (
    <TooltipProvider>
      <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
    </TooltipProvider>
  )
}

/** Mirrors the workspace header slot that WorkspaceHost provides to child tools. */
function SlotHost({ children }: { children: ReactNode }) {
  const [slot, setSlot] = useState<HTMLDivElement | null>(null)
  return (
    <WorkspaceHeaderSlotContext.Provider value={slot}>
      <div ref={setSlot} data-testid="workspace-slot" />
      {children}
    </WorkspaceHeaderSlotContext.Provider>
  )
}

describe('workspace host view header', () => {
  it('shows one workspace header with tabs and no star or more-options menu', () => {
    const workspace = getWorkspaceForTool(HOST_ID)!
    const host = toolRegistry.get(HOST_ID)!
    render(
      <Providers>
        <WorkspaceHost workspace={workspace} activeToolId={HOST_ID}>
          <ToolPage tool={host}>
            <div>Host body</div>
          </ToolPage>
        </WorkspaceHost>
      </Providers>,
    )

    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    expect(screen.getByText('Host body')).toBeInTheDocument()
    expect(screen.getAllByRole('tab')).toHaveLength(workspace.views.length)
    expect(screen.queryByRole('button', { name: 'More options' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /favorites/i })).not.toBeInTheDocument()
  })
})

describe('workspace child tool header', () => {
  it('moves the tool actions into the workspace header slot', () => {
    const child = toolRegistry.get('developer.json-toolkit')!
    render(
      <Providers>
        <WorkspaceContext.Provider value={HOST_ID}>
          <SlotHost>
            <ToolPage tool={child}>
              <div>Child body</div>
            </ToolPage>
          </SlotHost>
        </WorkspaceContext.Provider>
      </Providers>,
    )

    const slot = screen.getByTestId('workspace-slot')
    expect(within(slot).getByRole('button', { name: 'More options' })).toBeInTheDocument()
    expect(within(slot).getByRole('button', { name: /^About / })).toBeInTheDocument()
    expect(screen.getByText('Child body')).toBeInTheDocument()
  })
})

describe('formatter Detect page', () => {
  it('detects pasted JSON and lets the user choose another format', async () => {
    const user = userEvent.setup()
    render(
      <Providers>
        <FormatterStudioTool />
      </Providers>,
    )

    const editor = screen.getByRole('textbox', { name: 'Paste or type content' })
    await user.click(editor)
    await user.paste('{"name":"One Panel"}')

    expect(await screen.findByText('JSON detected')).toBeInTheDocument()

    const formats = screen.getByRole('group', { name: 'Format' })
    expect(within(formats).getByRole('button', { name: 'JSON' })).toHaveAttribute('aria-pressed', 'true')

    const xml = within(formats).getByRole('button', { name: 'XML' })
    fireEvent.click(xml)
    expect(xml).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Open in XML' })).toBeEnabled()
  })

  it('fills a sample and clears the input', async () => {
    render(
      <Providers>
        <FormatterStudioTool />
      </Providers>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Sample' }))
    expect(await screen.findByRole('button', { name: /^Open in / })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Clear' }))
    expect(screen.queryByRole('group', { name: 'Format' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled()
  })
})
