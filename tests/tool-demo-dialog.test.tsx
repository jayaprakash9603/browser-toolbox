import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { toolRegistry, type ToolDefinition } from '@/core/registry'
import { registerModules } from '@/modules'
import { ToolPage } from '@/shared/components/ToolPage'
import ToolDemoDialog from '@/shared/components/ToolDemoDialog'
import { TooltipProvider } from '@/shared/components/ui/tooltip'

vi.mock('@/app/pages/category/CategoryDemoPlayer', () => ({
  default: ({ tools }: { tools: readonly ToolDefinition[] }) => (
    <div data-testid="demo-player">
      {tools.map((tool) => (
        <span key={tool.id}>{tool.id}</span>
      ))}
    </div>
  ),
}))

registerModules()
afterEach(cleanup)

describe('tool walkthrough access', () => {
  it('opens the current tool demo from the first menu option without changing tool content', async () => {
    const user = userEvent.setup()
    render(
      <TooltipProvider>
        <ToolPage tool={toolRegistry.get('text.diff')!}>
          <input aria-label="Working data" defaultValue="Keep my changes" />
        </ToolPage>
      </TooltipProvider>,
    )
    await user.click(screen.getByRole('button', { name: 'More options' }))
    const options = screen.getAllByRole('menuitem')
    expect(options[0]).toHaveTextContent('Watch demo')
    await user.click(options[0])
    const dialog = await screen.findByRole('dialog', { name: /demo$/ })
    expect(within(dialog).getByTestId('demo-player')).toHaveTextContent('text.diff')
    expect(dialog).toHaveTextContent('does not use or change your data')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('Working data')).toHaveValue('Keep my changes')
  })

  it('offers real child walkthroughs for a workspace overview instead of a placeholder', () => {
    render(
      <ToolDemoDialog
        tool={toolRegistry.get('developer.formatter-studio')!}
        onOpenChange={vi.fn()}
      />,
    )
    const player = screen.getByTestId('demo-player')
    expect(player).toHaveTextContent('developer.json-toolkit')
    expect(player).toHaveTextContent('developer.yaml-toolkit')
    expect(player).not.toHaveTextContent('developer.formatter-studio')
  })
})
