import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { HomeToolSections } from '@/app/pages/home/HomeToolSections'
import { getHomeWorkbenchGroups } from '@/app/pages/home/homeConfig'
import { RouterProvider } from '@/app/router'
import { toolRegistry } from '@/core/registry'
import { getPrimaryTools } from '@/core/registry/userCategories'
import { registerModules } from '@/modules'

registerModules()

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

function renderSections() {
  window.location.hash = '#/'
  return render(
    <RouterProvider>
      <HomeToolSections />
    </RouterProvider>,
  )
}

describe('home tool workbenches', () => {
  it('exposes every primary tool once with its real route and dynamic section count', () => {
    renderSections()
    expect(screen.getAllByRole('region')).toHaveLength(7)

    for (const section of getHomeWorkbenchGroups()) {
      const region = screen.getByRole('region', { name: section.name })
      const tools = [...section.tools, ...section.shortcuts]
      expect(within(region).getAllByText(`${tools.length} tools`).length).toBeGreaterThan(0)
      for (const tool of tools) {
        const link = within(region).getByRole('link', { name: tool.name })
        expect(link.getAttribute('href')).toBe(`#${tool.route}`)
      }
    }

    const shortcuts = getHomeWorkbenchGroups().flatMap((section) => section.shortcuts)
    expect(screen.getAllByRole('link')).toHaveLength(
      getPrimaryTools().length + shortcuts.length + 1,
    )
    expect(
      screen.getByRole('link', { name: `Browse all ${getPrimaryTools().length} tools` }),
    ).toHaveAttribute('href', '#/tools')
    expect(screen.queryByRole('link', { name: /category/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /pause|play/i })).not.toBeInTheDocument()
  })

  it('splits the large section without losing or duplicating tools and caps every workbench at ten launchers', () => {
    const groups = getHomeWorkbenchGroups()
    const ids = groups.flatMap((group) => group.tools.map((tool) => tool.id))
    expect(ids).toHaveLength(getPrimaryTools().length)
    expect(new Set(ids)).toEqual(new Set(getPrimaryTools().map((tool) => tool.id)))
    expect(new Set(ids).size).toBe(ids.length)
    for (const group of groups) {
      expect(group.tools.length + group.shortcuts.length).toBeLessThanOrEqual(10)
      expect(group.tools.length).toBeGreaterThan(0)
    }
    expect(groups.find((group) => group.id === 'productivity')?.tools).toHaveLength(8)
    expect(groups.find((group) => group.id === 'browser')?.tools).toHaveLength(3)
    expect(groups.find((group) => group.id === 'social')?.tools).toHaveLength(5)
  })

  it('uses a distinct visual workbench for each group instead of repeating terminal panels', () => {
    const { container } = renderSections()
    expect(container.querySelectorAll('.home-code-console')).toHaveLength(1)
    for (const visual of [
      '.home-design-ribbon',
      '.home-network-visual',
      '.home-planner-ruler',
      '.home-browser-chrome',
      '.home-social-wave',
      '.home-file-path',
    ]) {
      expect(container.querySelectorAll(visual)).toHaveLength(1)
    }
    expect(screen.queryByRole('region', { name: 'Productivity & Browser' })).not.toBeInTheDocument()
  })

  it('retains the accessibility shortcut without counting workspace children as standalone tools', () => {
    renderSections()
    const region = screen.getByRole('region', { name: 'Design & Accessibility' })
    const accessibility = toolRegistry.get('accessibility.toolkit')
    expect(within(region).getByRole('link', { name: 'Accessibility Quick Check' })).toHaveAttribute(
      'href',
      `#${accessibility?.route}`,
    )
    expect(screen.queryByRole('link', { name: 'Palette Generator' })).not.toBeInTheDocument()
    expect(screen.queryByText(/TLS|Mbps|Resolved|Score|Chrome 122/i)).not.toBeInTheDocument()
  })

  it('leaves all tools accessible with reduced motion and no viewport observer', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion)',
      media: query,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    }))
    const { container } = renderSections()
    expect(container.querySelectorAll('[data-motion="off"]')).toHaveLength(7)
    expect(screen.getByRole('link', { name: 'Script Studio' })).toBeInTheDocument()
  })

  it('stacks and spreads the design deck without hiding other workbenches', () => {
    renderSections()
    const design = screen.getByRole('region', { name: 'Design & Accessibility' })
    const toggle = within(design).getByRole('button', { name: 'Stack tool cards' })
    const cards = document.getElementById(toggle.getAttribute('aria-controls')!)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(cards).toHaveAttribute('inert')
    expect(cards).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByRole('link', { name: 'Browser Toolkit' })).toBeInTheDocument()
    fireEvent.click(within(design).getByRole('button', { name: 'Spread 6 tool cards' }))
    expect(cards).not.toHaveAttribute('inert')
    expect(within(design).getAllByRole('link')).toHaveLength(6)
  })
})
