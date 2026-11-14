import { loadRecorderSettings } from '@/core/recorder/settings'
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
import { mockupFor, mockupSrc, mockupThumbUrl } from '@/tools/design/responsive-viewer/mockups'
import { simulatorStudioUrl } from '@/tools/design/responsive-viewer/studioUrl'

import { setOverlayTabFraming } from '../responsiveViewerFraming'
import { clearOverlaySession, getOverlaySession, markOverlaySession } from './overlaySession'
import { downloadWithName } from '../downloadNames'
import { startRecorder, stopRecorder } from '../recorder'

import type { ExtensionMessage } from '@/core/messaging/types'
import type { SimulatorOverlayConfig, SimulatorOverlayUiSettings } from './overlayTypes'
import type { ViewerSettings } from '@/tools/design/responsive-viewer/devices'
export { canOverlaySimulatorOnTab } from './overlayTypes'

/** Served from public/inject; must match scripts/build-simulator-overlay.mjs output. */
export const SIMULATOR_OVERLAY_JS = 'inject/simulator-overlay.js'
const SIMULATOR_OVERLAY_MOUNT_KEY = '__TBX_MOUNT_SIMULATOR__'

function overlayUiFromSettings(settings: ViewerSettings): SimulatorOverlayUiSettings {
  return {
    theme: settings.studioTheme === 'dark' ? 'dark' : 'classic',
    showStatusBar: settings.showStatusBar,
    showNavBar: settings.showNavBar,
    mobileUa: settings.mobileUa,
    unblock: settings.unblock,
  }
}

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
    ui: overlayUiFromSettings(settings),
    hostname,
    studioUrl: simulatorStudioUrl({ url, device: device.id }),
    mockupUrl: mockup ? mockupSrc(mockup) : undefined,
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
    ui: {
      theme: 'classic',
      showStatusBar: true,
      showNavBar: true,
      mobileUa: false,
      unblock: true,
    },
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
  let mobileUa: string | undefined
  try {
    config = (await overlayConfigFor(opts.url, opts.deviceId, opts.replace)) ?? fallbackOverlayConfig(opts.url, opts.replace)
    const settings = await readViewerSettings()
    const device =
      findDevice(opts.deviceId ?? settings.lastDevice ?? DEFAULT_DEVICE_ID, settings.custom) ??
      findDevice(DEFAULT_DEVICE_ID)
    mobileUa = settings.mobileUa && device?.userAgent ? device.userAgent : undefined
  } catch (error) {
    console.warn('[simulator] overlay config failed', error)
    config = fallbackOverlayConfig(opts.url, opts.replace)
  }
  await setOverlayTabFraming(tab.id, true, mobileUa)
  try {
    const [probe] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => Boolean(document.getElementById('tbx-simulator-overlay')),
    })
    if (!probe?.result) {
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: [SIMULATOR_OVERLAY_JS],
      })
    }
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
    const ok = Boolean(injection?.result)
    if (ok) {
      await markOverlaySession(tab.id, {
        previewUrl: config.url,
        deviceId: config.deviceId,
        mobileUa,
      })
    } else {
      await clearOverlaySession(tab.id)
      await setOverlayTabFraming(tab.id, false)
    }
    return ok
  } catch (error) {
    console.warn('[simulator] overlay inject failed', error)
    await clearOverlaySession(tab.id)
    await setOverlayTabFraming(tab.id, false)
    return false
  }
}

async function readViewerSettings() {
  const stored = await chrome.storage.local.get(STORAGE_KEY)
  const raw = stored[STORAGE_KEY]
  return parseSettings(typeof raw === 'string' ? raw : raw ? JSON.stringify(raw) : null)
}

async function persistViewerSettings(patch: Partial<ViewerSettings>): Promise<ViewerSettings> {
  const current = await readViewerSettings()
  let presentation = current.presentation
  if (patch.studioTheme === 'dark') {
    presentation = { ...presentation, background: 'dark' }
  } else if (patch.studioTheme === 'light') {
    presentation = { ...presentation, background: 'white' }
  } else if (patch.presentation) {
    presentation = { ...presentation, ...patch.presentation }
  }
  const next: ViewerSettings = { ...current, ...patch, presentation }
  await chrome.storage.local.set({ [STORAGE_KEY]: JSON.stringify(next) })
  return next
}

async function mobileUaForTab(deviceId: string | undefined, settings: ViewerSettings): Promise<string | undefined> {
  const device =
    findDevice(deviceId ?? settings.lastDevice ?? DEFAULT_DEVICE_ID, settings.custom) ?? findDevice(DEFAULT_DEVICE_ID)
  return settings.mobileUa && device?.userAgent ? device.userAgent : undefined
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
      manufacturer: device.manufacturer ?? 'Other',
      width: device.width,
      height: device.height,
      thumbUrl: mockupThumbUrl(device.id),
    })),
    favorites: settings.favorites,
    recents: settings.recents,
    current: settings.lastDevice,
  }
}

type CaptureRect = { x: number; y: number; width: number; height: number; dpr: number }

async function readSimulatorCaptureRect(tabId: number): Promise<CaptureRect | null> {
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    func: () => {
      const host = document.getElementById('tbx-simulator-overlay')
      const wrap =
        host?.shadowRoot?.querySelector('.sim-pane.is-focus .phone-wrap') ??
        host?.shadowRoot?.querySelector('.phone-wrap')
      if (!wrap) return null
      const rect = wrap.getBoundingClientRect()
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        dpr: window.devicePixelRatio || 1,
      }
    },
  })
  return (injection?.result as CaptureRect | null | undefined) ?? null
}

async function setSimulatorRailVisible(tabId: number, visible: boolean): Promise<void> {
  await chrome.scripting.executeScript({
    target: { tabId },
    func: (show: boolean) => {
      const actions = document.getElementById('tbx-simulator-overlay')?.shadowRoot?.querySelector('.actions') as
        | HTMLElement
        | undefined
      if (!actions) return
      actions.style.visibility = show ? '' : 'hidden'
    },
    args: [visible],
  })
}

async function cropTabCaptureInPage(tabId: number, dataUrl: string, rect: CaptureRect): Promise<string | null> {
  const [injection] = await chrome.scripting.executeScript({
    target: { tabId },
    func: async (url: string, box: CaptureRect) => {
      try {
        const blob = await (await fetch(url)).blob()
        const bitmap = await createImageBitmap(blob)
        const sx = Math.max(0, Math.round(box.x * box.dpr))
        const sy = Math.max(0, Math.round(box.y * box.dpr))
        const sw = Math.max(1, Math.round(box.width * box.dpr))
        const sh = Math.max(1, Math.round(box.height * box.dpr))
        const canvas = document.createElement('canvas')
        canvas.width = sw
        canvas.height = sh
        const ctx = canvas.getContext('2d')
        if (!ctx) return null
        ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, sw, sh)
        bitmap.close()
        return canvas.toDataURL('image/png')
      } catch {
        return null
      }
    },
    args: [dataUrl, rect],
  })
  return (injection?.result as string | null | undefined) ?? null
}

async function captureViewportScreenshot(tab?: chrome.tabs.Tab) {
  if (tab?.windowId == null || tab.id == null) return { ok: false as const, error: 'no-tab' }
  const dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' })
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const filename = `one-panel-screen-${stamp}.png`
  await downloadWithName({ url: dataUrl, filename, saveAs: false })
  return { ok: true as const, dataUrl, filename, kind: 'viewport' as const }
}

async function captureSimulatorScreenshot(tab?: chrome.tabs.Tab) {
  if (tab?.windowId == null || tab.id == null) return { ok: false as const, error: 'no-tab' }
  const rect = await readSimulatorCaptureRect(tab.id)
  if (!rect || rect.width < 2 || rect.height < 2) return { ok: false as const, error: 'no-frame' }
  await setSimulatorRailVisible(tab.id, false)
  let dataUrl: string
  try {
    dataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, { format: 'png' })
  } finally {
    await setSimulatorRailVisible(tab.id, true)
  }
  const cropped = await cropTabCaptureInPage(tab.id, dataUrl, rect)
  if (!cropped) return { ok: false as const, error: 'crop-failed' }
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  const filename = `one-panel-simulator-${stamp}.png`
  await downloadWithName({ url: cropped, filename, saveAs: false })
  return { ok: true as const, dataUrl: cropped, filename, kind: 'simulator' as const }
}

async function startOverlayRecording(tab?: chrome.tabs.Tab) {
  const settings = await loadRecorderSettings()
  await startRecorder('tab', { ...settings, mic: false, countdown: settings.countdown !== false }, tab)
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
    case 'getSettings': {
      const settings = await readViewerSettings()
      return { ok: true, ...overlayUiFromSettings(settings) }
    }
    case 'patchSettings': {
      const patch = message.patch
      if (!patch) return { ok: false, error: 'no-patch' }
      const viewerPatch: Partial<ViewerSettings> = {}
      if (patch.theme === 'classic' || patch.theme === 'dark') {
        viewerPatch.studioTheme = patch.theme === 'dark' ? 'dark' : 'light'
      }
      if (typeof patch.showStatusBar === 'boolean') viewerPatch.showStatusBar = patch.showStatusBar
      if (typeof patch.showNavBar === 'boolean') viewerPatch.showNavBar = patch.showNavBar
      if (typeof patch.mobileUa === 'boolean') viewerPatch.mobileUa = patch.mobileUa
      if (typeof patch.unblock === 'boolean') viewerPatch.unblock = patch.unblock
      const settings = await persistViewerSettings(viewerPatch)
      const ui = overlayUiFromSettings(settings)
      if (tab?.id != null && (patch.mobileUa !== undefined || patch.unblock !== undefined)) {
        const mobileUa = await mobileUaForTab(message.deviceId ?? settings.lastDevice, settings)
        await setOverlayTabFraming(tab.id, true, mobileUa)
        const prev = await getOverlaySession(tab.id)
        await markOverlaySession(tab.id, {
          previewUrl: prev?.previewUrl ?? url ?? tab.url ?? '',
          deviceId: message.deviceId ?? prev?.deviceId ?? settings.lastDevice,
          mobileUa,
        })
      }
      return { ok: true, ...ui }
    }
    case 'setDevice': {
      if (!tab || !message.deviceId || !url) return { ok: false, error: 'no-tab' }
      await persistLastDevice(message.deviceId)
      return { ok: await openSimulatorOverlay(tab, { url, deviceId: message.deviceId, replace: true }) }
    }
    case 'screenshot':
      return message.captureMode === 'viewport' ? captureViewportScreenshot(tab) : captureSimulatorScreenshot(tab)
    case 'record':
      return startOverlayRecording(tab)
    case 'recordStop':
      await stopRecorder()
      return { ok: true as const }
    case 'closed': {
      if (tab?.id != null) {
        await setOverlayTabFraming(tab.id, false)
        await clearOverlaySession(tab.id)
      }
      return { ok: true }
    }
    case 'compare':
    case 'expand': {
      await chrome.tabs.create({
        url: simulatorStudioUrl({
          url: url && !isRestrictedCaptureUrl(url) ? url : undefined,
          device: message.deviceId,
          layout: message.action === 'compare' ? 'grid' : 'focus',
        }),
      })
      if (message.action === 'expand' && tab?.id != null) {
        await setOverlayTabFraming(tab.id, false)
        await clearOverlaySession(tab.id)
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => {
            const host = document.getElementById('tbx-simulator-overlay') as
              | (HTMLElement & { __tbxSimDispose?: () => void })
              | null
            host?.__tbxSimDispose?.()
            document.getElementById('tbx-simulator-veil')?.remove()
            document.documentElement.style.overflow = ''
          },
        }).catch(() => undefined)
      }
      return { ok: true }
    }
    default:
      return { ok: false }
  }
}
