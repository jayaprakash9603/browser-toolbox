import { DOWNLOAD_MANAGER_ROUTE } from '@/core/download-manager'
import { getDownloadManagerState } from '@/core/download-manager'
import { setPanelRouteIntent } from '@/core/panel/navigationSession'
import { openExtensionPanel } from '@/platform/panel'

const ICON = 'public/icons/icon128.png'

async function shouldNotify(kind: 'started' | 'completed' | 'failed' | 'queue'): Promise<boolean> {
  const { settings } = await getDownloadManagerState()
  if (!settings.enabled) return false
  switch (kind) {
    case 'started':
      return settings.notifyStarted
    case 'completed':
      return settings.notifyCompleted
    case 'failed':
      return settings.notifyFailed
    case 'queue':
      return settings.notifyQueueDone
  }
}

async function openManager(): Promise<void> {
  await setPanelRouteIntent(DOWNLOAD_MANAGER_ROUTE)
  const win = await chrome.windows.getLastFocused({ windowTypes: ['normal'] }).catch(() => null)
  if (win?.id != null) await openExtensionPanel({ windowId: win.id })
}

export async function notifyDownloadStarted(url: string): Promise<void> {
  if (!(await shouldNotify('started'))) return
  try {
    const id = `dm-start-${Date.now()}`
    await chrome.notifications.create(id, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL(ICON),
      title: 'Download started',
      message: url.length > 120 ? `${url.slice(0, 117)}…` : url,
    })
    chrome.notifications.onClicked.addListener(function handler(clicked) {
      if (clicked !== id) return
      chrome.notifications.onClicked.removeListener(handler)
      void openManager()
    })
  } catch {
    /* notifications blocked */
  }
}

export async function notifyDownloadCompleted(label: string): Promise<void> {
  if (!(await shouldNotify('completed'))) return
  try {
    await chrome.notifications.create(`dm-done-${Date.now()}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL(ICON),
      title: 'Download completed',
      message: label,
    })
  } catch {
    /* */
  }
}

export async function notifyDownloadFailed(url: string, error?: string): Promise<void> {
  if (!(await shouldNotify('failed'))) return
  try {
    await chrome.notifications.create(`dm-fail-${Date.now()}`, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL(ICON),
      title: 'Download failed',
      message: error ? `${error}` : url,
    })
  } catch {
    /* */
  }
}

export async function notifyQueueCompleted(): Promise<void> {
  if (!(await shouldNotify('queue'))) return
  try {
    const id = `dm-queue-${Date.now()}`
    await chrome.notifications.create(id, {
      type: 'basic',
      iconUrl: chrome.runtime.getURL(ICON),
      title: 'Queue finished',
      message: 'All queued downloads have been processed.',
    })
    chrome.notifications.onClicked.addListener(function handler(clicked) {
      if (clicked !== id) return
      chrome.notifications.onClicked.removeListener(handler)
      void openManager()
    })
  } catch {
    /* */
  }
}
