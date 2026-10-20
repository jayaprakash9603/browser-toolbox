import { getWhatsappPlusState, isFeatureOn } from '@/core/sites/whatsapp'
import { STORAGE_KEYS } from '@/core/constants'

export const CHATPULSE_MENU_ID = 'toolbox.wa.chatpulse'

let rebuildContextMenus: (() => Promise<void>) | null = null

export function bindChatPulseMenuRebuild(fn: () => Promise<void>): void {
  rebuildContextMenus = fn
}

export async function buildChatPulseMenus(): Promise<void> {
  const state = await getWhatsappPlusState()
  if (!state.enabled || !isFeatureOn(state.values, 'chatPulse')) return
  chrome.contextMenus.create({
    id: CHATPULSE_MENU_ID,
    title: 'Open ChatPulse Analytics',
    contexts: ['page', 'frame'],
    documentUrlPatterns: ['*://web.whatsapp.com/*'],
  })
}

export function isChatPulseMenuItem(menuItemId: string): boolean {
  return menuItemId === CHATPULSE_MENU_ID
}

export function registerChatPulseMenuSync(): void {
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== 'local' || !changes[STORAGE_KEYS.whatsappPlus]) return
    void rebuildContextMenus?.()
  })
}

export async function sendOpenAnalyticsToTab(tabId: number): Promise<void> {
  await chrome.tabs.sendMessage(tabId, { type: 'WA_OPEN_ANALYTICS' })
}
