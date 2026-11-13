import { getChromeMessage } from '@/core/i18n/chromeMessages'

export const COLOR_PICK_MENU_ID = 'toolbox.color.pick'

export function buildColorPickerMenus(
  create: (properties: chrome.contextMenus.CreateProperties) => void,
): void {
  create({
    id: COLOR_PICK_MENU_ID,
    title: getChromeMessage('contextMenuColorPicker'),
    contexts: ['page', 'frame', 'image', 'selection'],
  })
}

export function isColorPickerMenuItem(menuItemId: string): boolean {
  return menuItemId === COLOR_PICK_MENU_ID
}
