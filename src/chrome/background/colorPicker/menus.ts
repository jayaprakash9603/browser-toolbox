import { getChromeMessage } from '@/core/i18n/chromeMessages'

export const COLOR_PICKER_PARENT_MENU_ID = 'toolbox.color.parent'
export const COLOR_PICK_PAGE_MENU_ID = 'toolbox.color.pick-page'
export const COLOR_PICK_SCREEN_MENU_ID = 'toolbox.color.pick-screen'

export function buildColorPickerMenus(
  create: (properties: chrome.contextMenus.CreateProperties) => void,
): void {
  create({
    id: COLOR_PICKER_PARENT_MENU_ID,
    title: getChromeMessage('contextMenuColorPicker'),
    contexts: ['page', 'frame', 'image', 'selection'],
  })
  create({
    id: COLOR_PICK_PAGE_MENU_ID,
    parentId: COLOR_PICKER_PARENT_MENU_ID,
    title: getChromeMessage('contextMenuPickColorPage'),
    contexts: ['page', 'frame', 'image', 'selection'],
  })
  create({
    id: COLOR_PICK_SCREEN_MENU_ID,
    parentId: COLOR_PICKER_PARENT_MENU_ID,
    title: getChromeMessage('contextMenuPickColorScreen'),
    contexts: ['page', 'frame', 'image', 'selection'],
  })
}

export function colorPickerMenuAction(menuItemId: string): 'page' | 'screen' | null {
  if (menuItemId === COLOR_PICK_PAGE_MENU_ID) return 'page'
  if (menuItemId === COLOR_PICK_SCREEN_MENU_ID) return 'screen'
  return null
}

export function isColorPickerMenuItem(menuItemId: string): boolean {
  return colorPickerMenuAction(menuItemId) != null
}
