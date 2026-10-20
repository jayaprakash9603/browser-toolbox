import { beforeEach, describe, expect, it, vi } from 'vitest'

import { enqueueContextMenuRebuild } from '@/chrome/background/contextMenus'

vi.mock('@/chrome/context-menu/menuTree', () => ({
  buildMenuItems: () => [],
}))

vi.mock('@/chrome/background/imageConvert', () => ({
  buildImageConvertMenus: vi.fn(async () => {
    throw new Error('image convert menus failed')
  }),
}))

vi.mock('@/chrome/background/pip', () => ({
  buildPipMenus: vi.fn(async () => {
    /* pip ok */
  }),
}))

vi.mock('@/chrome/background/sites/whatsappAnalytics', () => ({
  buildChatPulseMenus: vi.fn(async () => {
    /* chat pulse ok */
  }),
}))

describe('context menu rebuild queue', () => {
  beforeEach(() => {
    chrome.contextMenus.removeAll = vi.fn(async () => undefined)
    chrome.contextMenus.create = vi.fn((_props, cb) => cb?.())
    Object.assign(chrome.runtime, { lastError: undefined })
  })

  it('runs concurrent rebuilds sequentially and continues after a builder fails', async () => {
    const { buildPipMenus } = await import('@/chrome/background/pip')
    const { buildChatPulseMenus } = await import('@/chrome/background/sites/whatsappAnalytics')

    await Promise.all([enqueueContextMenuRebuild(), enqueueContextMenuRebuild()])
    await enqueueContextMenuRebuild()

    expect(chrome.contextMenus.removeAll).toHaveBeenCalled()
    expect(buildPipMenus).toHaveBeenCalled()
    expect(buildChatPulseMenus).toHaveBeenCalled()
  })
})
