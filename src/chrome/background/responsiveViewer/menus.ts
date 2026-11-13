import { getChromeMessage } from '@/core/i18n/chromeMessages'
import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'
import { STORAGE_KEY } from '@/tools/design/responsive-viewer/storageKey'
import { simulatorStudioUrl } from '@/tools/design/responsive-viewer/studioUrl'
import { setPanelRouteIntent } from '@/core/panel/navigationSession'
import { openExtensionPanel } from '@/platform/panel'
import { startScreenshot } from '../screenshot/start'
import {
  SIMULATOR_CAPTURE,
  SIMULATOR_OPEN_LINK,
  SIMULATOR_PANEL,
  SIMULATOR_PARENT_ID,
} from './ids'

export {
  SIMULATOR_CAPTURE,
  SIMULATOR_OPEN_DEVICE,
  SIMULATOR_OPEN_LINK,
  SIMULATOR_OPEN_PAGE,
  SIMULATOR_PANEL,
  SIMULATOR_PARENT_ID,
  isSimulatorMenuItem,
} from './ids'

export function buildSimulatorMenus(create: (properties: chrome.contextMenus.CreateProperties) => void): void {
  // Leaf item: Chrome will not fire clicks on a parent that has children, so this
  // must stay a single entry. Under One Panel's grouped menu it opens the overlay.
  create({
    id: SIMULATOR_PARENT_ID,
    title: getChromeMessage('contextMenuSimulator') ?? 'Mobile Simulator',
    contexts: ['page', 'frame', 'link', 'image', 'selection'],
  })
}

async function lastDeviceId(): Promise<string | undefined> {
  try {
    const stored = await chrome.storage.local.get(STORAGE_KEY)
    const raw = stored[STORAGE_KEY]
    const parsed = typeof raw === 'string' ? (JSON.parse(raw) as { lastDevice?: unknown }) : null
    return typeof parsed?.lastDevice === 'string' ? parsed.lastDevice : undefined
  } catch {
    return undefined
  }
}

export async function handleSimulatorMenuClick(
  menuItemId: string,
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab,
): Promise<void> {
  if (menuItemId === SIMULATOR_CAPTURE) {
    await startScreenshot('visible', tab)
    return
  }
  if (menuItemId === SIMULATOR_PANEL) {
    await setPanelRouteIntent('/tools/design/responsive-viewer')
    if (tab?.windowId != null) await openExtensionPanel({ windowId: tab.windowId, tabId: tab.id })
    return
  }

  const link = typeof info.linkUrl === 'string' ? info.linkUrl : undefined
  const page = tab?.url
  const target = menuItemId === SIMULATOR_OPEN_LINK ? link : link ?? page
  const device = await lastDeviceId()
  if (await tryOpenOverlay(tab, target, device)) return
  await chrome.tabs.create({
    url: simulatorStudioUrl({
      url: target && !isRestrictedCaptureUrl(target) ? target : undefined,
      device,
    }),
  })
}

export async function openSimulatorForTab(tab?: chrome.tabs.Tab): Promise<void> {
  const url = tab?.url && !isRestrictedCaptureUrl(tab.url) ? tab.url : undefined
  const device = await lastDeviceId()
  if (await tryOpenOverlay(tab, url, device)) return
  await chrome.tabs.create({ url: simulatorStudioUrl({ url, device }) })
}

async function tryOpenOverlay(tab: chrome.tabs.Tab | undefined, url: string | undefined, device?: string): Promise<boolean> {
  if (tab?.id == null || !url) return false
  const { canOverlaySimulatorOnTab, openSimulatorOverlay } = await import('./overlay')
  if (!canOverlaySimulatorOnTab(tab.url, url)) return false
  return openSimulatorOverlay(tab, { url, deviceId: device })
}
