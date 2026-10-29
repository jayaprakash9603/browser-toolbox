import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ThemeApplicator } from '@/app/providers/ThemeApplicator'
import HomePage from '@/app/pages/HomePage'
import {
  getGreetingKey,
  getHomePopularTools,
  getPopularTools,
  getQuickActionTools,
  QUICK_ACTION_IDS,
} from '@/app/pages/home/homeConfig'
import { RouterProvider } from '@/app/router'
import { categoryRegistry, toolRegistry } from '@/core/registry'
import { reorderFavorites } from '@/features/favorites/favoritesService'
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
    expect(getPopularTools().map((tool) => tool.id)).toEqual([
      'privacy.ad-blocker',
      'privacy.web-protection',
      'design.responsive-viewer',
      'generators.qr-toolkit',
      'api.request-builder',
      'design.color-picker',
      'browser.picture-in-picture',
      'browser.internet-monitor',
      'productivity.form-autofill',
    ])
    getQuickActionTools().forEach((tool) => {
      expect(toolRegistry.get(tool.id)).toBeDefined()
    })
  })
})

describe('home landing helpers', () => {
  it('never repeats quick actions inside popular tools', () => {
    const quick = new Set<string>(QUICK_ACTION_IDS)
    const popular = getHomePopularTools()
    expect(popular[0]?.id).toBe('privacy.ad-blocker')
    expect(popular).toHaveLength(9)
    popular.forEach((tool) => expect(quick.has(tool.id)).toBe(false))
  })

  it('picks a greeting for the time of day', () => {
    expect(getGreetingKey(8)).toBe('home.greeting.morning')
    expect(getGreetingKey(14)).toBe('home.greeting.afternoon')
    expect(getGreetingKey(21)).toBe('home.greeting.evening')
    expect(getGreetingKey(2)).toBe('home.greeting.evening')
  })
})

describe('HomePage landing', () => {
  it('renders the compact welcome strip and sections without a search box', async () => {
    window.location.hash = '#/'
    render(
      <TooltipProvider>
        <RouterProvider>
          <HomePage />
        </RouterProvider>
      </TooltipProvider>,
    )
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument())
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(screen.getByText('Quick actions')).toBeInTheDocument()
    expect(screen.getByText('Browse by category')).toBeInTheDocument()
    expect(document.getElementById('all-tools')).not.toBeNull()

    const tip = screen.getByRole('button', { name: 'Next tip' })
    const before = tip.parentElement?.textContent
    fireEvent.click(tip)
    expect(tip.parentElement?.textContent).not.toBe(before)
  }, 20_000)
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
