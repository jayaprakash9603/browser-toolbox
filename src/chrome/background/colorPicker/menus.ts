import { getChromeMessage } from '@/core/i18n/chromeMessages'

export const COLOR_PICK_PAGE_MENU_ID = 'toolbox.color.pick-page'
export const COLOR_PICK_SCREEN_MENU_ID = 'toolbox.color.pick-screen'

export function buildColorPickerMenus(
  create: (properties: chrome.contextMenus.CreateProperties) => void,
): void {
  create({
    id: COLOR_PICK_PAGE_MENU_ID,
    title: getChromeMessage('contextMenuPickColorPage'),
    contexts: ['page', 'frame', 'image'],
  })
  create({
    id: COLOR_PICK_SCREEN_MENU_ID,
    title: getChromeMessage('contextMenuPickColorScreen'),
    contexts: ['page', 'frame', 'image', 'selection'],
  })
}

export function isColorPickerMenuItem(menuItemId: string): boolean {
  return menuItemId === COLOR_PICK_PAGE_MENU_ID || menuItemId === COLOR_PICK_SCREEN_MENU_ID
}
