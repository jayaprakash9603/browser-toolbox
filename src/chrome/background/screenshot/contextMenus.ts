import { getChromeMessage } from '@/core/i18n/chromeMessages'

const PARENT = 'toolbox.screenshot'

export function buildScreenshotMenus(
  create: (properties: chrome.contextMenus.CreateProperties) => void,
): void {
  create({
    id: PARENT,
    title: getChromeMessage('contextMenuScreenshot') ?? 'Capture',
    contexts: ['page', 'frame', 'selection'],
  })
  const items: { id: string; title: string; mode: string }[] = [
    { id: 'entire', title: 'Entire page', mode: 'entire' },
    { id: 'visible', title: 'Visible part', mode: 'visible' },
    { id: 'selection', title: 'Selection', mode: 'selection' },
    { id: 'element', title: 'Element', mode: 'element' },
    { id: 'all-tabs', title: 'All tabs', mode: 'all-tabs' },
  ]
  for (const item of items) {
    create({
      id: `${PARENT}.${item.id}`,
      parentId: PARENT,
      title: item.title,
      contexts: ['page', 'frame', 'selection'],
    })
  }
}

export function isScreenshotMenuAction(actionId: string): boolean {
  return actionId.startsWith(`${PARENT}.`)
}

export function screenshotModeFromMenuAction(actionId: string): string | null {
  if (!isScreenshotMenuAction(actionId)) return null
  return actionId.slice(PARENT.length + 1)
}
