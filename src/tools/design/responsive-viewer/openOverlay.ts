import { getActiveBrowserTab } from '@/chrome/contentScriptClient'
import { sendMessage } from '@/core/messaging'
import { requestSiteAccess } from '@/core/permissions/siteAccess'

export async function openSimulatorOverlayFromUi(opts: { url?: string; deviceId?: string } = {}): Promise<'overlay' | 'studio'> {
  const tab = await getActiveBrowserTab().catch(() => undefined)
  const target = opts.url ?? tab?.url
  if (target) await requestSiteAccess(target)
  const result = await sendMessage<{ opened: 'overlay' | 'studio'; reason?: string }>({
    type: 'SIMULATOR_OPEN_OVERLAY',
    url: target,
    deviceId: opts.deviceId,
    tabId: tab?.id,
  })
  const opened = result?.opened ?? 'studio'
  if (opened === 'overlay' && !result?.reason) {
    try {
      window.close()
    } catch {
      /* not running in a closable One Panel surface */
    }
  }
  return opened
}
