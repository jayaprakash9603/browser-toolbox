import { createLogger } from '@/core/logging'
import { originPatternForUrl, requestPermissions } from '@/core/permissions/siteAccess'
import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'
import { STORAGE_KEY } from '@/tools/design/responsive-viewer/storageKey'
import { simulatorStudioUrl } from '@/tools/design/responsive-viewer/studioUrl'

export { buildSimulatorMenus } from './menuItem'
export {
  SIMULATOR_CAPTURE,
  SIMULATOR_OPEN_DEVICE,
  SIMULATOR_OPEN_LINK,
  SIMULATOR_OPEN_PAGE,
  SIMULATOR_PANEL,
  SIMULATOR_PARENT_ID,
  isSimulatorMenuItem,
} from './ids'

const logger = createLogger('simulator')

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

async function resolveTab(tab?: chrome.tabs.Tab): Promise<chrome.tabs.Tab | undefined> {
  if (tab?.id != null) {
    if (tab.url) return tab
    try {
      return await chrome.tabs.get(tab.id)
    } catch {
      return tab
    }
  }
  try {
    const [active] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    return active ?? tab
  } catch {
    return tab
  }
}

export type SimulatorOpenResult = { opened: 'overlay' | 'studio'; reason?: string }

export async function handleSimulatorMenuClick(
  _menuItemId: string,
  _info: chrome.contextMenus.OnClickData,
  tab?: chrome.tabs.Tab,
): Promise<void> {
  const target = await resolveTab(tab)
  const pageUrl = target?.url && !isRestrictedCaptureUrl(target.url) ? target.url : undefined
  await openSimulatorForTab(target, { url: pageUrl, replace: true })
}

export async function openSimulatorForTab(
  tab?: chrome.tabs.Tab,
  opts: { url?: string; deviceId?: string; replace?: boolean } = {},
): Promise<SimulatorOpenResult> {
  const target = await resolveTab(tab)
  const pageUrl = target?.url && !isRestrictedCaptureUrl(target.url) ? target.url : undefined
  const url = opts.url && !isRestrictedCaptureUrl(opts.url) ? opts.url : pageUrl
  const device = opts.deviceId ?? (await lastDeviceId())

  const restricted =
    (typeof opts.url === 'string' && isRestrictedCaptureUrl(opts.url)) ||
    (typeof target?.url === 'string' && isRestrictedCaptureUrl(target.url))
  if (restricted) {
    await chrome.tabs.create({
      url: simulatorStudioUrl({ device, url: pageUrl ?? url }),
    })
    return { opened: 'studio', reason: 'restricted' }
  }

  const overlay = await tryOpenOverlay(target, url, device, opts.replace ?? true)
  if (overlay.ok) return { opened: 'overlay' }
  logger.warn('overlay unavailable on this tab', overlay.reason, url)
  return { opened: 'overlay', reason: overlay.reason }
}

async function tryOpenOverlay(
  tab: chrome.tabs.Tab | undefined,
  url: string | undefined,
  device?: string,
  replace = true,
): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (tab?.id == null) return { ok: false, reason: 'no-tab' }
  if (!url) return { ok: false, reason: 'no-url' }
  const pattern = originPatternForUrl(url)
  if (pattern) await requestPermissions({ origins: [pattern] })
  const { canOverlaySimulatorOnTab, openSimulatorOverlay } = await import('./overlay')
  const pageUrl = tab.url && !isRestrictedCaptureUrl(tab.url) ? tab.url : url
  if (!canOverlaySimulatorOnTab(pageUrl, url)) return { ok: false, reason: 'cross-origin' }
  if (await openSimulatorOverlay(tab, { url, deviceId: device, replace })) return { ok: true }
  return { ok: false, reason: 'inject-failed' }
}
