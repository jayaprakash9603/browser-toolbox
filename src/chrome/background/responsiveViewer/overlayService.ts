import { DEFAULT_RECORDER_SETTINGS } from '@/core/recorder/settings'
import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'
import { CHASSIS } from '@/tools/design/responsive-viewer/chassis'
import {
  DEFAULT_DEVICE_ID,
  DEVICES,
  findDevice,
  orientedSize,
  parseSettings,
  rememberDevice,
  STORAGE_KEY,
} from '@/tools/design/responsive-viewer/devices'
import { mockupFor, mockupSrc } from '@/tools/design/responsive-viewer/mockups'
import { simulatorStudioUrl } from '@/tools/design/responsive-viewer/studioUrl'

import { downloadWithName } from '../downloadNames'
import { startRecorder } from '../recorder'

import type { ExtensionMessage } from '@/core/messaging/types'
import type { SimulatorOverlayConfig } from './overlayTypes'
export { canOverlaySimulatorOnTab } from './overlayTypes'

/** Served from public/inject; must match scripts/build-simulator-overlay.mjs output. */
export const SIMULATOR_OVERLAY_JS = 'inject/simulator-overlay.js'
const SIMULATOR_OVERLAY_MOUNT_KEY = '__TBX_MOUNT_SIMULATOR__'

async function overlayConfigFor(
  url: string,
  deviceId?: string,
  replace = false,
): Promise<SimulatorOverlayConfig | null> {
  const settings = await readViewerSettings()
  const device =
    findDevice(deviceId ?? settings.lastDevice ?? DEFAULT_DEVICE_ID, settings.custom) ?? findDevice(DEFAULT_DEVICE_ID)
  if (!device) return null
  const size = orientedSize(device, false)
  const color = device.frameColor ?? 'silver'
  const finish = CHASSIS[color]
  const mockup = mockupFor(device.id)
  let hostname = url
  try {
    hostname = new URL(url).host
  } catch {
    /* keep raw */
  }
  return {
    url,
    label: device.label,
    deviceId: device.id,
    width: size.width,
    height: size.height,
    color,
    finish: { fill: finish.fill, ring: finish.ring, button: finish.button },
    notch: device.notch ?? 'none',
    navBar: device.navBar ?? 'none',
    statusBar: device.statusBar ?? 'none',
    frameStyle: device.frameStyle ?? 'iphone',
    showSafari: device.frameStyle === 'iphone' || device.frameStyle === 'iphone-home',
    hostname,
    studioUrl: simulatorStudioUrl({ url, device: device.id }),
    mockupUrl: mockup ? mockupSrc(mockup.file) : undefined,
    mockupInsets: mockup
      ? { left: mockup.left, top: mockup.top, right: mockup.right, bottom: mockup.bottom }
      : undefined,
    replace,
  }
}

function fallbackOverlayConfig(url: string, replace = false): SimulatorOverlayConfig {
  const finish = CHASSIS.silver
  let hostname = url
  try {
    hostname = new URL(url).host
  } catch {
    /* keep raw */
  }
  return {
    url,
    label: 'iPhone 16 Pro',
    deviceId: 'iphone-16-pro',
    width: 402,
    height: 874,
    color: 'titanium',
    finish: { fill: finish.fill, ring: finish.ring, button: finish.button },
    notch: 'island',
    navBar: 'home-indicator',
    statusBar: 'ios',
    frameStyle: 'iphone',
    showSafari: true,
    hostname,
    studioUrl: simulatorStudioUrl({ url, device: 'iphone-16-pro' }),
    replace,
  }
}

export async function openSimulatorOverlay(
  tab: chrome.tabs.Tab,
  opts: { url: string; deviceId?: string; replace?: boolean },
): Promise<boolean> {
  if (tab.id == null) return false
  let config: SimulatorOverlayConfig
  try {
    config = (await overlayConfigFor(opts.url, opts.deviceId, opts.replace)) ?? fallbackOverlayConfig(opts.url, opts.replace)
  } catch (error) {
    console.warn('[simulator] overlay config failed', error)
    config = fallbackOverlayConfig(opts.url, opts.replace)
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: [SIMULATOR_OVERLAY_JS],
    })
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: (mountKey: string, cfg: SimulatorOverlayConfig) => {
        const mount = (globalThis as unknown as Record<string, unknown>)[mountKey] as
          | ((c: SimulatorOverlayConfig) => boolean)
          | undefined
        return mount?.(cfg) ?? false
      },
      args: [SIMULATOR_OVERLAY_MOUNT_KEY, config],
    })
    return Boolean(injection?.result)
  } catch (error) {
    console.warn('[simulator] overlay inject failed', error)
    return false
  }
}

async function readViewerSettings() {
  const stored = await chrome.storage.local.get(STORAGE_KEY)
  const raw = stored[STORAGE_KEY]
  return parseSettings(typeof raw === 'string' ? raw : raw ? JSON.stringify(raw) : null)
}

async function persistLastDevice(id: string): Promise<void> {
  const settings = rememberDevice(await readViewerSettings(), id)
  await chrome.storage.local.set({ [STORAGE_KEY]: JSON.stringify(settings) })
}

async function listOverlayDevices() {
  const settings = await readViewerSettings()
  return {
    devices: [...DEVICES, ...settings.custom].map((device) => ({
      id: device.id,
      label: device.label,
      kind: device.kind,
      width: device.width,
      height: device.height,
    })),
    favorites: settings.favorites,
    recents: settings.recents,
    current: settings.lastDevice,
  }
}

async function captureOverlayScreenshot(tab?: chrome.tabs.Tab) {
  if (tab?.windowId == null) return { ok: false as const, error: 'no-tab' }
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' })
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  await downloadWithName({ url: dataUrl, filename: `one-panel-simulator-${stamp}.png`, saveAs: false })
  return { ok: true as const }
}

async function startOverlayRecording(tab?: chrome.tabs.Tab) {
  await startRecorder('tab', { ...DEFAULT_RECORDER_SETTINGS, countdown: false, mic: false }, tab)
  return { ok: true as const }
}

export async function handleOverlayAction(
  message: ExtensionMessage,
  sender: chrome.runtime.MessageSender,
): Promise<unknown> {
  if (message.type !== 'SIMULATOR_OVERLAY_ACTION') return null
  const tab = sender.tab
  const url = message.url ?? tab?.url
  switch (message.action) {
    case 'listDevices':
      return listOverlayDevices()
    case 'setDevice': {
      if (!tab || !message.deviceId || !url) return { ok: false, error: 'no-tab' }
      await persistLastDevice(message.deviceId)
      return { ok: await openSimulatorOverlay(tab, { url, deviceId: message.deviceId, replace: true }) }
    }
    case 'screenshot':
      return captureOverlayScreenshot(tab)
    case 'record':
      return startOverlayRecording(tab)
    case 'compare':
    case 'expand': {
      await chrome.tabs.create({
        url: simulatorStudioUrl({
          url: url && !isRestrictedCaptureUrl(url) ? url : undefined,
          device: message.deviceId,
          layout: message.action === 'compare' ? 'grid' : undefined,
        }),
      })
      return { ok: true }
    }
    default:
      return { ok: false }
  }
}
