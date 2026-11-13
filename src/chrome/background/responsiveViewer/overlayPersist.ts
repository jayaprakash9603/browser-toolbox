import { createLogger } from '@/core/logging'
import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'

import { openSimulatorOverlay } from './overlayService'
import { clearOverlaySession, getOverlaySession, markOverlaySession } from './overlaySession'

const logger = createLogger('simulator-persist')
const VEIL_ID = 'tbx-simulator-veil'
const restoring = new Set<number>()

function previewUrlForTab(tabUrl: string | undefined, sessionUrl: string): string {
  if (!tabUrl || isRestrictedCaptureUrl(tabUrl)) return sessionUrl
  try {
    const live = new URL(tabUrl)
    const saved = new URL(sessionUrl)
    if (live.origin === saved.origin) return live.href
  } catch {
    /* keep session url */
  }
  return sessionUrl
}

async function applySimulatorVeil(tabId: number): Promise<void> {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      injectImmediately: true,
      func: (veilId: string) => {
        if (document.getElementById(veilId)) return
        const veil = document.createElement('div')
        veil.id = veilId
        veil.setAttribute('data-tbx-simulator', 'veil')
        veil.style.cssText =
          'position:fixed;inset:0;z-index:2147483645;background:#eceff3;pointer-events:auto;'
        document.documentElement.style.overflow = 'hidden'
        document.documentElement.dataset.tbxSimVeil = '1'
        document.documentElement.append(veil)
      },
      args: [VEIL_ID],
    })
  } catch (error) {
    logger.debug('veil inject skipped', tabId, error)
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
    const url = previewUrlForTab(tab.url, session.previewUrl)
    if (url !== session.previewUrl) {
      await markOverlaySession(tabId, { ...session, previewUrl: url })
    }
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
      if (changeInfo.status === 'loading') await applySimulatorVeil(tabId)
      if (changeInfo.status === 'complete') await restoreOverlay(tabId, tab)
    })()
  })

  chrome.tabs.onRemoved.addListener((tabId) => {
    void clearOverlaySession(tabId)
    restoring.delete(tabId)
  })
}
