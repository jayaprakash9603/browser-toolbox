import { STORAGE_KEYS } from '@/core/constants'
import { registerMessageHandler } from '@/core/messaging'
import { createLogger } from '@/core/logging'
import { checkScriptUpdates } from './updates'
import { getScriptStudioIndex, getScriptStudioSettings, setScriptStudioIndex } from '@/core/script-studio'

import { probeUserScripts as probeApi } from './availability'
import { registerGmBridgeListener } from './bridge'
import { registerUserScriptInstallDetection } from './install'
import {
  initScriptStudioRegistration,
  scheduleScriptStudioSync,
  watchScriptStudioStorage,
} from './registration'
import { registerUpdateAlarms } from './updates'
import { clearTabBadge, updateBadgeForTab } from './badge'
import { registerScriptRunTracking } from './runs'

const logger = createLogger('script-studio')

export function registerScriptStudio(): void {
  registerGmBridgeListener()
  watchScriptStudioStorage()
  registerUserScriptInstallDetection()
  registerUpdateAlarms()
  registerScriptRunTracking()

  chrome.tabs.onUpdated.addListener((tabId, info) => {
    if (info.status === 'complete' || info.url) void updateBadgeForTab(tabId)
  })
  chrome.tabs.onRemoved.addListener((tabId) => {
    clearTabBadge(tabId)
  })

  registerMessageHandler('SCRIPT_STUDIO_SYNC', async () => {
    await initScriptStudioRegistration()
    return { synced: true }
  })

  registerMessageHandler('SCRIPT_STUDIO_PROBE', async () => probeApi())

  // The prompt itself needs a user gesture, so pages request the permission and only notify us here.
  registerMessageHandler('SCRIPT_STUDIO_REQUEST_PERMISSION', async () => {
    await initScriptStudioRegistration()
    return probeApi()
  })

  chrome.permissions.onAdded.addListener((permissions) => {
    if (permissions.permissions?.includes('userScripts')) {
      void initScriptStudioRegistration().catch((e) => logger.warn('init after grant failed', e))
    }
  })

  registerMessageHandler('SCRIPT_STUDIO_GET_STATE', async () => {
    const [index, settings] = await Promise.all([getScriptStudioIndex(), getScriptStudioSettings()])
    return { index, settings }
  })

  registerMessageHandler('SCRIPT_STUDIO_CHECK_UPDATES', async (msg) => {
    const ids = 'scriptIds' in msg ? (msg.scriptIds as string[] | undefined) : undefined
    return checkScriptUpdates(ids)
  })

  registerMessageHandler('SCRIPT_STUDIO_SET_GLOBAL', async (msg) => {
    if (!('enabled' in msg)) return null
    const index = await getScriptStudioIndex()
    index.globalEnabled = Boolean(msg.enabled)
    await setScriptStudioIndex(index)
    scheduleScriptStudioSync()
    return index
  })

  void initScriptStudioRegistration().catch((e) => logger.warn('init failed', e))

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEYS.scriptStudioSettings]) {
      scheduleScriptStudioSync()
    }
  })
}

export { scheduleScriptStudioSync, initScriptStudioRegistration }
