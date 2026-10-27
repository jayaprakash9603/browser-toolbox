import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { DEMOS } from '@/app/demos/registry.generated'
import { ToolDemo } from '@/app/demos/ToolDemo'
import CategoryDemoPlayer from '@/app/pages/category/CategoryDemoPlayer'
import CategoryPage from '@/app/pages/CategoryPage'
import { CategoryCard } from '@/app/pages/home/CategoryCard'
import { categoryRegistry, toolRegistry } from '@/core/registry'
import { registerModules } from '@/modules'
import { TooltipProvider } from '@/shared/components/ui/tooltip'

registerModules()

/** Tools whose website page has no walkthrough yet; they show a still poster. */
const WITHOUT_DEMO = ['developer.timestamp-toolkit']

const originalMatchMedia = window.matchMedia

function preferReducedMotion() {
  window.matchMedia = vi.fn().mockImplementation((query: string) => ({
    matches: query.includes('reduce'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

function tool(id: string) {
  const found = toolRegistry.get(id)
  if (!found) throw new Error(`missing tool ${id}`)
  return found
}

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  window.matchMedia = originalMatchMedia
  localStorage.clear()
})

describe('demo registry', () => {
  it('has a website demo for every tool except the known fallbacks', () => {
    const missing = toolRegistry
      .getAll()
      .map(({ id }) => id)
      .filter((id) => !(id in DEMOS))
    expect(missing.sort()).toEqual([...WITHOUT_DEMO].sort())
    for (const id of Object.keys(DEMOS)) expect(toolRegistry.get(id), id).toBeDefined()
  })
})

describe('ToolDemo', () => {
  it('shows a poster for a tool without a demo and still finishes its cycle', () => {
    vi.useFakeTimers({
      toFake: ['setTimeout', 'clearTimeout', 'requestAnimationFrame', 'cancelAnimationFrame', 'performance'],
    })
    const onCycle = vi.fn()
    render(
      <ToolDemo
        tool={tool('developer.timestamp-toolkit')}
        host={{ variant: 'card', loop: false, playing: true, onCycle }}
      />,
    )
    expect(screen.getByText('A walkthrough for this tool is on the way.')).toBeInTheDocument()
    expect(onCycle).not.toHaveBeenCalled()
    act(() => {
      vi.advanceTimersByTime(4600)
    })
    expect(onCycle).toHaveBeenCalledTimes(1)
  })

  it('builds a copied website demo and seeks between its steps', async () => {
    preferReducedMotion()
    const onStep = vi.fn()
    render(<ToolDemo tool={tool('text.diff')} host={{ variant: 'player', loop: true, playing: true, onStep }} />)

    const figure = await screen.findByRole(
      'figure',
      { name: /comparing two config files/i },
      { timeout: 20_000 },
    )
    expect(within(figure).getByText('Read the summary')).toBeInTheDocument()
    expect(onStep).toHaveBeenLastCalledWith(3, expect.arrayContaining(['Paste Input A', 'Compare']))

    const first = within(figure).getByRole('button', { name: 'Step 1: Paste Input A' })
    fireEvent.click(first)
    expect(first).toHaveAttribute('aria-current', 'step')
    expect(within(figure).getByText('Paste Input A', { selector: 'p' })).toBeInTheDocument()
  }, 30_000)
})

describe('CategoryDemoPlayer', () => {
  it('switches tools from the tab list and stops auto-advancing', () => {
    const tools = toolRegistry.getByCategory('text')
    render(<CategoryDemoPlayer tools={tools} />)

    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(tools.length)
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('switch', { name: 'Play every tool' })).toBeChecked()

    fireEvent.click(tabs[2])
    expect(screen.getAllByRole('tab')[2]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('switch', { name: 'Play every tool' })).not.toBeChecked()

    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'ArrowRight' })
    expect(screen.getAllByRole('tab')[3]).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('link', { name: /^Open / })).toHaveAttribute('href', `#${tools[3].route}`)
  }, 30_000)

})

describe('CategoryPage demo toggle', () => {
  const renderPage = () =>
    render(
      <TooltipProvider>
        <CategoryPage categoryId="text" />
      </TooltipProvider>,
    )

  it('starts closed, opens the player from the header and remembers it', async () => {
    renderPage()
    const toggle = screen.getByRole('button', { name: 'Watch demo' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('region', { name: 'Watch demo' })).not.toBeInTheDocument()

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('region', { name: 'Watch demo' })).toBeInTheDocument()
    expect(await screen.findByRole('tablist', {}, { timeout: 20_000 })).toBeInTheDocument()
    expect(localStorage.getItem('tbx.category.demo.open')).toBe('1')
    cleanup()

    renderPage()
    expect(screen.getByRole('button', { name: 'Watch demo' })).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Watch demo' }))
    expect(localStorage.getItem('tbx.category.demo.open')).toBe('0')
  }, 30_000)
})

describe('CategoryCard reel', () => {
  it('loads the reel with the first tool and its position', async () => {
    const category = categoryRegistry.get('text')
    if (!category) throw new Error('missing text category')
    const tools = toolRegistry.getByCategory('text')
    render(<CategoryCard category={category} tools={tools} />)
    expect(await screen.findByText(`1/${tools.length}`, {}, { timeout: 20_000 })).toBeInTheDocument()
  }, 30_000)
})
