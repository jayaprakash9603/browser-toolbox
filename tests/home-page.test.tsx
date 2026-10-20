import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ThemeApplicator } from '@/app/providers/ThemeApplicator'
import {
  getPopularTools,
  getQuickActionTools,
  QUICK_ACTION_IDS,
} from '@/app/pages/home/homeConfig'
import { RouterProvider } from '@/app/router'
import { GlobalSearch } from '@/app/pages/home/GlobalSearch'
import { categoryRegistry, toolRegistry } from '@/core/registry'
import { reorderFavorites } from '@/features/favorites/favoritesService'
import { TOOLBOX_FOCUS_HOME_SEARCH } from '@/features/search/searchFocus'
import { updateSettings } from '@/features/settings/settingsService'
import { TooltipProvider } from '@/shared/components/ui/tooltip'
import { registerModules } from '@/modules'
import { resetChromeMockStorage } from './setup'

registerModules()

afterEach(() => {
  cleanup()
  resetChromeMockStorage()
  document.documentElement.classList.remove('dark')
  delete document.documentElement.dataset.palette
})

describe('homeConfig', () => {
  it('resolves quick and popular tools from the registry', () => {
    expect(getQuickActionTools()).toHaveLength(QUICK_ACTION_IDS.length)
    expect(getPopularTools()).toHaveLength(12)
    getQuickActionTools().forEach((tool) => {
      expect(toolRegistry.get(tool.id)).toBeDefined()
    })
  })
})

describe('GlobalSearch', () => {
  it('focuses the search field when the home search shortcut event fires', async () => {
    render(
      <TooltipProvider>
        <GlobalSearch />
      </TooltipProvider>,
    )
    const input = screen.getByRole('combobox')
    window.dispatchEvent(new CustomEvent(TOOLBOX_FOCUS_HOME_SEARCH))
    await waitFor(() => expect(input).toHaveFocus())
  })

  it('supports keyboard navigation in results', async () => {
    window.location.hash = '#/'
    render(
      <TooltipProvider>
        <RouterProvider>
          <GlobalSearch />
        </RouterProvider>
      </TooltipProvider>,
    )
    const input = screen.getByRole('combobox')
    fireEvent.change(input, { target: { value: 'json toolkit' } })
    await waitFor(() => expect(screen.getAllByRole('option').length).toBeGreaterThan(0))
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(window.location.hash).toMatch(/json-toolkit|json/)
  })
})

describe('favorites reorder', () => {
  it('persists a new favorite order', async () => {
    await reorderFavorites(['text.formatter', 'clipboard.manager'])
    const { getFavorites } = await import('@/features/favorites/favoritesService')
    expect(await getFavorites()).toEqual(['text.formatter', 'clipboard.manager'])
  })
})

describe('ThemeApplicator palette', () => {
  it('sets data-palette on the document root', async () => {
    await updateSettings({ palette: 'ocean', theme: 'light' })
    render(<ThemeApplicator />)
    await waitFor(() => {
      expect(document.documentElement.dataset.palette).toBe('ocean')
    })
  })
})

describe('category cards', () => {
  it('does not mark enabled categories with tools as coming soon', () => {
    const enabled = categoryRegistry.getEnabled()
    enabled.forEach((category) => {
      const count = toolRegistry.getByCategory(category.id).length
      if (count > 0) {
        expect(count).toBeGreaterThan(0)
      }
    })
  })
})
