import { getChromeMessage } from '@/core/i18n/chromeMessages'

export const CLIPBOARD_PANEL_MENU_ID = 'toolbox.clipboard.panel'

export function buildClipboardPanelMenus(
  create: (properties: chrome.contextMenus.CreateProperties) => void,
): void {
  create({
    id: CLIPBOARD_PANEL_MENU_ID,
    title: getChromeMessage('contextMenuClipboardPanel'),
    contexts: ['page', 'frame', 'selection', 'editable', 'link', 'image', 'video'],
  })
}

export function isClipboardPanelMenuItem(menuItemId: string): boolean {
  return menuItemId === CLIPBOARD_PANEL_MENU_ID
}
