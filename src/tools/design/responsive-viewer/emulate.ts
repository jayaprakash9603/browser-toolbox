import { sendMessage } from '@/core/messaging'
import { orientedSize, type Device } from './devices'

export type NetworkProfile = 'online' | '4g' | 'slow-4g' | '3g' | 'slow-3g' | 'offline'

export async function requestDebuggerPermission(): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.permissions?.request) return false
  try {
    return await chrome.permissions.request({ permissions: ['debugger'] })
  } catch {
    return false
  }
}

export async function requestLiveEmulation(
  tabId: number,
  device: Device,
  rotated: boolean,
  network: NetworkProfile,
): Promise<{ ok: boolean; error?: string }> {
  const granted = await requestDebuggerPermission()
  if (!granted) return { ok: false, error: 'Debugger permission was not granted.' }
  const size = orientedSize(device, rotated)
  const response = await sendMessage<{ ok: boolean; error?: string }>({
    type: 'RV_EMULATE_START',
    tabId,
    width: size.width,
    height: size.height,
    dpr: device.dpr ?? 1,
    mobile: device.kind === 'phone' || device.kind === 'tablet' || device.kind === 'watch',
    userAgent: device.userAgent,
    touch: device.touch !== false,
    network,
  })
  return response ?? { ok: false, error: 'The background worker did not respond.' }
}

export async function stopLiveEmulation(tabId: number): Promise<void> {
  await sendMessage({ type: 'RV_EMULATE_STOP', tabId })
}
