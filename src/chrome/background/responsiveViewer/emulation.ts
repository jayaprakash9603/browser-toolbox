import { registerMessageHandler } from '@/core/messaging'
import { createLogger } from '@/core/logging'
import { hasCapability } from '@/platform/capabilities'

const logger = createLogger('rv-emulate')
const attached = new Set<number>()

type NetworkProfile = 'online' | '4g' | 'slow-4g' | '3g' | 'slow-3g' | 'offline'

const NETWORK: Record<NetworkProfile, { offline: boolean; latency: number; download: number; upload: number }> = {
  online: { offline: false, latency: 0, download: -1, upload: -1 },
  '4g': { offline: false, latency: 20, download: (4 * 1024 * 1024) / 8, upload: (3 * 1024 * 1024) / 8 },
  'slow-4g': { offline: false, latency: 150, download: (1.6 * 1024 * 1024) / 8, upload: (750 * 1024) / 8 },
  '3g': { offline: false, latency: 400, download: (750 * 1024) / 8, upload: (250 * 1024) / 8 },
  'slow-3g': { offline: false, latency: 2000, download: (400 * 1024) / 8, upload: (400 * 1024) / 8 },
  offline: { offline: true, latency: 0, download: 0, upload: 0 },
}

async function hasDebugger(): Promise<boolean> {
  if (!hasCapability('debugger')) return false
  try {
    return await chrome.permissions.contains({ permissions: ['debugger'] })
  } catch {
    return false
  }
}

async function restore(tabId: number): Promise<void> {
  if (!attached.has(tabId)) return
  try {
    await chrome.debugger.sendCommand({ tabId }, 'Emulation.clearDeviceMetricsOverride')
    await chrome.debugger.sendCommand({ tabId }, 'Network.emulateNetworkConditions', {
      offline: false,
      latency: 0,
      downloadThroughput: -1,
      uploadThroughput: -1,
    })
  } catch (error) {
    logger.debug('restore commands failed', error)
  }
  try {
    await chrome.debugger.detach({ tabId })
  } catch {
    /* already detached */
  }
  attached.delete(tabId)
}

export function registerResponsiveViewerEmulation(): void {
  registerMessageHandler('RV_EMULATE_START', async (message) => {
    if (message.type !== 'RV_EMULATE_START') return { ok: false, error: 'Bad message' }
    if (!(await hasDebugger())) {
      return { ok: false, error: 'Grant the debugger permission to emulate this tab. Chrome will show a debugging banner.' }
    }
    const { tabId } = message
    try {
      if (!attached.has(tabId)) {
        await chrome.debugger.attach({ tabId }, '1.3')
        attached.add(tabId)
      }
      await chrome.debugger.sendCommand({ tabId }, 'Emulation.setDeviceMetricsOverride', {
        width: message.width,
        height: message.height,
        deviceScaleFactor: message.dpr,
        mobile: message.mobile,
      })
      await chrome.debugger.sendCommand({ tabId }, 'Emulation.setTouchEmulationEnabled', {
        enabled: message.touch,
      })
      if (message.userAgent) {
        await chrome.debugger.sendCommand({ tabId }, 'Emulation.setUserAgentOverride', {
          userAgent: message.userAgent,
        })
      }
      const net = NETWORK[message.network]
      try {
        await chrome.debugger.sendCommand({ tabId }, 'Network.enable')
        await chrome.debugger.sendCommand({ tabId }, 'Network.emulateNetworkConditions', {
          offline: net.offline,
          latency: net.latency,
          downloadThroughput: net.download,
          uploadThroughput: net.upload,
        })
      } catch (error) {
        logger.debug('network emulation unavailable', error)
      }
      return { ok: true }
    } catch (error) {
      logger.warn('emulation failed', error)
      attached.delete(tabId)
      return {
        ok: false,
        error:
          error instanceof Error
            ? `${error.message}. Close DevTools or HTTP Interceptor Deep intercept if they are attached to this tab.`
            : 'Could not attach the debugger.',
      }
    }
  })

  registerMessageHandler('RV_EMULATE_STOP', async (message) => {
    if (message.type !== 'RV_EMULATE_STOP') return { ok: false }
    await restore(message.tabId)
    return { ok: true }
  })

  chrome.debugger?.onDetach.addListener((source) => {
    if (source.tabId != null) attached.delete(source.tabId)
  })
  chrome.tabs.onRemoved.addListener((tabId) => {
    if (attached.has(tabId)) attached.delete(tabId)
  })
}
