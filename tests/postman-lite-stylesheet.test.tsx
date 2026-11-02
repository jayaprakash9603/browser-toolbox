import { cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('postman-lite/style.css?inline', () => ({
  default: '*{border-color:hsl(var(--border))}',
}))

import { usePostmanLiteStylesheet } from '@/features/api-client/usePostmanLiteStylesheet'
import { useApiClientDialogPortalTheme } from '@/features/api-client/useApiClientDialogPortalTheme'

const sheets = () => document.head.querySelectorAll('style[data-browser-toolbox="postman-lite"]')

afterEach(() => {
  cleanup()
  delete document.documentElement.dataset.browserToolboxApiClient
  document
    .querySelectorAll(
      '[data-test-api-client-portal], [data-test-api-client-theme-host], [data-test-api-client-trigger]',
    )
    .forEach((node) => node.remove())
})

describe('usePostmanLiteStylesheet', () => {
  it('attaches the postman-lite sheet only while the API client is mounted', () => {
    expect(sheets()).toHaveLength(0)

    const { unmount } = renderHook(() => usePostmanLiteStylesheet())
    expect(sheets()).toHaveLength(1)
    expect(sheets()[0]?.textContent).toContain('hsl(var(--border))')

    unmount()
    expect(sheets()).toHaveLength(0)
  })

  it('keeps one shared sheet until the last instance unmounts', () => {
    const first = renderHook(() => usePostmanLiteStylesheet())
    const second = renderHook(() => usePostmanLiteStylesheet())
    expect(sheets()).toHaveLength(1)

    first.unmount()
    expect(sheets()).toHaveLength(1)

    second.unmount()
    expect(sheets()).toHaveLength(0)
  })

  it('themes and layers portaled Postman Lite dialogs', async () => {
    document.documentElement.dataset.browserToolboxApiClient = 'open'

    const host = document.createElement('div')
    host.className = 'api-client-theme-host'
    host.dataset.testApiClientThemeHost = ''
    host.style.setProperty('--background', '220 15% 96%')

    const trigger = document.createElement('button')
    trigger.dataset.testApiClientTrigger = ''
    const portal = document.createElement('div')
    portal.dataset.testApiClientPortal = ''
    const overlay = document.createElement('div')
    overlay.dataset.postmanLiteDialogOverlay = ''
    overlay.dataset.state = 'open'
    const dialog = document.createElement('div')
    dialog.dataset.postmanLiteDialogContent = ''
    dialog.dataset.state = 'open'
    dialog.setAttribute('role', 'dialog')
    portal.append(overlay, dialog)
    trigger.addEventListener('click', () => document.body.append(portal))
    document.body.append(host, trigger)

    renderHook(() => {
      usePostmanLiteStylesheet()
      useApiClientDialogPortalTheme()
    })
    trigger.click()

    await waitFor(() => {
      expect(dialog.parentElement).toHaveClass('api-client-theme-host')
      expect(dialog.parentElement?.style.getPropertyValue('--background')).toBe('220 15% 96%')
    })

    expect(dialog.isConnected).toBe(true)
    expect(sheets()[0]?.textContent).toContain('[data-postman-lite-dialog-content][data-state="open"]')
    expect(sheets()[0]?.textContent).toContain('[data-postman-lite-dialog-overlay][data-state="open"]')
  })
})
