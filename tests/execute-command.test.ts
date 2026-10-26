import { beforeEach, describe, expect, it, vi } from 'vitest'

import { executeToolboxCommand } from '@/chrome/background/executeCommand'
import { PANEL_OPEN_COMMAND_PALETTE_KEY } from '@/core/panel/navigationSession'
import { resetChromeMockStorage } from './setup'

describe('executeToolboxCommand', () => {
  beforeEach(() => {
    resetChromeMockStorage()
    vi.mocked(chrome.sidePanel.open).mockClear()
    vi.mocked(chrome.storage.session.set).mockClear()
  })

  it('opens the side panel and signals the command palette before awaiting storage', async () => {
    const tab = { id: 1, windowId: 42 } as chrome.tabs.Tab
    await executeToolboxCommand('open-command-palette', tab)

    expect(chrome.sidePanel.open).toHaveBeenCalledWith({ windowId: 42 })
    expect(chrome.storage.session.set).toHaveBeenCalledWith({
      [PANEL_OPEN_COMMAND_PALETTE_KEY]: true,
    })
  })
})
