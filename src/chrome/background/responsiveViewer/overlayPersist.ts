import { createLogger } from '@/core/logging'
import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'

import { openSimulatorOverlay } from './overlayService'
import { clearOverlaySession, getOverlaySession } from './overlaySession'

const logger = createLogger('simulator-persist')
const VEIL_ID = 'tbx-simulator-veil'
const restoring = new Set<number>()

/** Preview URL is iframe-only; do not mirror host tab navigations into the simulator. */
export function sessionPreviewUrl(tabUrl: string | undefined, sessionUrl: string): string {
  if (!tabUrl || isRestrictedCaptureUrl(tabUrl)) return sessionUrl
  return sessionUrl
}

async function overlayHostPresent(tabId: number): Promise<boolean> {
  try {
    const [row] = await chrome.scripting.executeScript({
      target: { tabId },
      func: () => Boolean(document.getElementById('tbx-simulator-overlay')),
    })
    return Boolean(row?.result)
  } catch {
    return false
  }
}

async function clearStaleSimulatorVeil(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (veilId: string) => {
        document.getElementById(veilId)?.remove()
        delete document.documentElement.dataset.tbxSimVeil
      },
      args: [VEIL_ID],
    })
  } catch (error) {
    logger.debug('veil cleanup skipped', tabId, error)
  }
}

async function restoreOverlay(tabId: number, tab: chrome.tabs.Tab): Promise<void> {
  if (restoring.has(tabId)) return
  const session = await getOverlaySession(tabId)
  if (!session || tab.id == null) return
  if (tab.url && isRestrictedCaptureUrl(tab.url)) {
    await clearOverlaySession(tabId)
    return
  }
  restoring.add(tabId)
  try {
    const url = sessionPreviewUrl(tab.url, session.previewUrl)
    await openSimulatorOverlay(tab, { url, deviceId: session.deviceId, replace: true })
  } catch (error) {
    logger.warn('overlay restore failed', tabId, error)
  } finally {
    restoring.delete(tabId)
  }
}

export function registerSimulatorOverlayPersistence(): void {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    void (async () => {
      const session = await getOverlaySession(tabId)
      if (!session) return
      if (changeInfo.status !== 'complete') return
      if (await overlayHostPresent(tabId)) {
        await clearStaleSimulatorVeil(tabId)
        return
      }
      await restoreOverlay(tabId, tab)
    })()
  })

  chrome.tabs.onRemoved.addListener((tabId) => {
    void clearOverlaySession(tabId)
    restoring.delete(tabId)
  })
}
