import { getChromeMessage } from '@/core/i18n/chromeMessages'
import { DOWNLOAD_MANAGER_ROUTE } from '@/core/download-manager'
import { setPanelRouteIntent } from '@/core/panel/navigationSession'
import { openExtensionPanel } from '@/platform/panel'

import { addUrlToQueue, downloadUrlFromMenu } from './actions'

export const DM_DOWNLOAD_LINK_ID = 'toolbox.download.link'
export const DM_DOWNLOAD_IMAGE_ID = 'toolbox.download.image'
export const DM_SCAN_PAGE_ID = 'toolbox.download.scan'
export const DM_OPEN_MANAGER_ID = 'toolbox.download.open'
export const DM_QUEUE_LINK_ID = 'toolbox.download.queue'

export function buildDownloadManagerMenus(
  create: (properties: chrome.contextMenus.CreateProperties) => void,
): void {
  const parent = 'toolbox.download'
  create({
    id: parent,
    title: getChromeMessage('contextMenuDownloadParent') ?? 'Downloads',
    contexts: ['all'],
  })
  create({
    id: DM_DOWNLOAD_LINK_ID,
    parentId: parent,
    title: getChromeMessage('contextMenuDownloadLink') ?? 'Download this link',
    contexts: ['link'],
  })
  create({
    id: DM_DOWNLOAD_IMAGE_ID,
    parentId: parent,
    title: getChromeMessage('contextMenuDownloadImage') ?? 'Download this image',
    contexts: ['image'],
  })
  create({
    id: DM_SCAN_PAGE_ID,
    parentId: parent,
    title: getChromeMessage('contextMenuDownloadScan') ?? 'Scan page for files',
    contexts: ['page', 'frame'],
  })
  create({
    id: DM_OPEN_MANAGER_ID,
    parentId: parent,
    title: getChromeMessage('contextMenuDownloadOpen') ?? 'Open Download Manager',
    contexts: ['all'],
  })
  create({
    id: DM_QUEUE_LINK_ID,
    parentId: parent,
    title: getChromeMessage('contextMenuDownloadQueue') ?? 'Add link to queue',
    contexts: ['link'],
  })
}

export function isDownloadManagerMenuItem(id: string): boolean {
  return (
    id === DM_DOWNLOAD_LINK_ID ||
    id === DM_DOWNLOAD_IMAGE_ID ||
    id === DM_SCAN_PAGE_ID ||
    id === DM_OPEN_MANAGER_ID ||
    id === DM_QUEUE_LINK_ID
  )
}

export async function handleDownloadManagerMenuClick(
  menuItemId: string,
  info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab,
): Promise<void> {
  if (menuItemId === DM_DOWNLOAD_LINK_ID && info.linkUrl) {
    await downloadUrlFromMenu(info.linkUrl, tab?.url)
    return
  }
  if (menuItemId === DM_DOWNLOAD_IMAGE_ID && info.srcUrl) {
    await downloadUrlFromMenu(info.srcUrl, tab?.url)
    return
  }
  if (menuItemId === DM_QUEUE_LINK_ID && info.linkUrl) {
    await addUrlToQueue(info.linkUrl, tab?.url)
    return
  }
  if (menuItemId === DM_SCAN_PAGE_ID || menuItemId === DM_OPEN_MANAGER_ID) {
    const route =
      menuItemId === DM_SCAN_PAGE_ID ? `${DOWNLOAD_MANAGER_ROUTE}?tab=sniffer` : DOWNLOAD_MANAGER_ROUTE
    await setPanelRouteIntent(route)
    if (tab?.windowId != null) await openExtensionPanel({ windowId: tab.windowId, tabId: tab.id })
  }
}
