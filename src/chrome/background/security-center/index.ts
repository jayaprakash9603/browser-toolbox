import { registerMessageHandler } from '@/core/messaging'
import { STORAGE_KEYS } from '@/core/constants'
import { getSecurityCenterSettings, syncCscDynamicRules } from '@/core/security-center'
import { createLogger } from '@/core/logging'

import { clearNetworkLog, getNetworkLog, isCapturePaused, registerSecurityNetlog, setCapturePaused } from './networkObserver'
import { getPauseSnapshot, pauseProtection, registerPauseAlarm, resumeProtection } from './pause'

const logger = createLogger('security-center')

async function syncRules(): Promise<{ errors: string[] }> {
  const settings = await getSecurityCenterSettings()
  return syncCscDynamicRules({
    httpsUpgrade: settings.httpsUpgrade,
    blocklist: settings.blocklist,
  })
}

export function registerSecurityCenter(): void {
  registerSecurityNetlog()
  registerPauseAlarm()

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes[STORAGE_KEYS.securityCenterSettings]) void syncRules()
  })

  registerMessageHandler('SECURITY_GET_NETWORK_LOG', (message) => {
    if (message.type !== 'SECURITY_GET_NETWORK_LOG') return []
    return getNetworkLog(message.tabId)
  })
  registerMessageHandler('SECURITY_CLEAR_NETWORK_LOG', (message) => {
    if (message.type !== 'SECURITY_CLEAR_NETWORK_LOG') return null
    clearNetworkLog(message.tabId)
    return { cleared: true }
  })
  registerMessageHandler('SECURITY_SET_CAPTURE', (message) => {
    if (message.type !== 'SECURITY_SET_CAPTURE') return null
    setCapturePaused(message.paused)
    return { paused: isCapturePaused() }
  })
  registerMessageHandler('SECURITY_PAUSE_PROTECTION', () => pauseProtection())
  registerMessageHandler('SECURITY_RESUME_PROTECTION', () => resumeProtection())
  registerMessageHandler('SECURITY_GET_PAUSE', () => getPauseSnapshot())
  registerMessageHandler('SECURITY_SYNC_RULES', () => syncRules())

  void syncRules().catch((error) => logger.warn('initial rule sync failed', error))
}
