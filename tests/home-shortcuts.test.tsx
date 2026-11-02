import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { FavoritesSection } from '@/app/pages/home/FavoritesSection'
import { QuickActions } from '@/app/pages/home/QuickActions'
import { RecentSection } from '@/app/pages/home/RecentSection'
import { RouterProvider } from '@/app/router'
import { reorderFavorites } from '@/features/favorites/favoritesService'
import { trackRecentTool } from '@/features/recent-tools/recentToolsService'
import { registerModules } from '@/modules'
import { resetChromeMockStorage } from './setup'

registerModules()

afterEach(() => {
  cleanup()
  resetChromeMockStorage()
})

describe('dashboard shortcuts', () => {
  it('keeps all quick actions with their names and routes', () => {
    render(
      <RouterProvider>
        <QuickActions />
      </RouterProvider>,
    )
    expect(screen.getAllByRole('link')).toHaveLength(4)
    expect(screen.getByRole('link', { name: 'Tab Manager' })).toHaveAttribute(
      'href',
      '#/tools/productivity/tab-manager',
    )
    expect(screen.getByRole('link', { name: 'Clipboard Manager' })).toBeInTheDocument()
  })

  it('wraps every saved favorite instead of hiding names in a carousel', async () => {
    await reorderFavorites([
      'screenshots.recorder',
      'api.request-builder',
      'productivity.form-autofill',
      'text.case-converter',
    ])
    const { container } = render(
      <RouterProvider>
        <FavoritesSection />
      </RouterProvider>,
    )
    await screen.findByRole('link', { name: 'Case Converter' })
    expect(container.querySelectorAll('.home-favorite-link')).toHaveLength(4)
    expect(screen.getByRole('link', { name: /Manage/ })).toHaveAttribute('href', '#/favorites')
    expect(container.querySelector('.home-favorite-grid')).toBeInTheDocument()
  })

  it('retains recent ordering, timestamps, routes, and the view-all action', async () => {
    await trackRecentTool('text.diff')
    await trackRecentTool('security.toolkit')
    const { container } = render(
      <RouterProvider>
        <RecentSection />
      </RouterProvider>,
    )
    await waitFor(() => expect(container.querySelectorAll('.home-recent-link')).toHaveLength(2))
    expect(container.querySelectorAll('.home-recent-link')[0]).toHaveAttribute(
      'href',
      '#/tools/security/toolkit',
    )
    expect(container.querySelectorAll('time')).toHaveLength(2)
    expect(screen.getByRole('link', { name: /View all/ })).toHaveAttribute('href', '#/recent')
  })
})
