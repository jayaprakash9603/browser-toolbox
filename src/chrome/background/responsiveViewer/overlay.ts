import { isRestrictedCaptureUrl } from '@/core/screenshot/restricted'
import { CHASSIS } from '@/tools/design/responsive-viewer/chassis'
import { simulatorStudioUrl } from '@/tools/design/responsive-viewer/studioUrl'
import type { FrameColor, FrameStyle, NavBarStyle, NotchStyle, StatusBarStyle } from '@/tools/design/responsive-viewer/devices'

export const SIMULATOR_OVERLAY_ID = 'tbx-simulator-overlay'

export interface SimulatorOverlayFinish {
  fill: string
  ring: string
  button: string
}

export interface SimulatorOverlayConfig {
  url: string
  label: string
  deviceId: string
  width: number
  height: number
  color: FrameColor
  finish: SimulatorOverlayFinish
  notch: NotchStyle
  navBar: NavBarStyle
  statusBar: StatusBarStyle
  frameStyle: FrameStyle
  showSafari: boolean
  hostname: string
  studioUrl: string
}

export function canOverlaySimulatorOnTab(tabUrl: string | undefined, targetUrl: string): boolean {
  if (!tabUrl || isRestrictedCaptureUrl(tabUrl) || isRestrictedCaptureUrl(targetUrl)) return false
  if (!/^https?:/i.test(tabUrl) || !/^https?:/i.test(targetUrl)) return false
  try {
    return new URL(tabUrl).origin === new URL(targetUrl).origin
  } catch {
    return false
  }
}

/**
 * Injected into the top frame. Must stay self-contained: only `config` crosses the
 * executeScript boundary, nothing from this module.
 */
export function mountSimulatorOverlay(config: SimulatorOverlayConfig): boolean {
  const HOST_ID = 'tbx-simulator-overlay'
  if (window !== window.top) return false

  const escapeHtml = (value: string) =>
    value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char)
  const iconClose =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>'
  const iconRotate =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/></svg>'
  const iconRefresh =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12a9 9 0 1 1-3.2-6.9"/><path d="M21 3v6h-6"/></svg>'
  const iconExpand =
    '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>'
  const iconSignal =
    '<svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor"><rect x="0" y="7" width="2" height="3" rx="0.5"/><rect x="4" y="5" width="2" height="5" rx="0.5"/><rect x="8" y="3" width="2" height="7" rx="0.5"/><rect x="12" y="1" width="2" height="9" rx="0.5" opacity="0.45"/></svg>'
  const iconWifi =
    '<svg width="13" height="10" viewBox="0 0 13 10" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M1.4 4.2a7 7 0 0 1 10.2 0"/><path d="M3.2 6a4.4 4.4 0 0 1 6.6 0"/><circle cx="6.5" cy="8.4" r="0.9" fill="currentColor" stroke="none"/></svg>'
  const iconBattery =
    '<svg width="22" height="10" viewBox="0 0 22 10" fill="none"><rect x="0.6" y="1.2" width="18" height="7.6" rx="1.6" stroke="currentColor" stroke-width="1.2"/><rect x="2" y="2.6" width="13" height="4.8" rx="0.6" fill="currentColor"/><rect x="19.2" y="3.2" width="1.8" height="3.6" rx="0.6" fill="currentColor"/></svg>'
  const iconBack =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>'
  const iconForward =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>'
  const iconShare =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="m16 6-4-4-4 4"/><path d="M12 2v13"/></svg>'
  const iconBook =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>'
  const iconTabs =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="7" y="7" width="14" height="14" rx="2"/><path d="M3 17V5a2 2 0 0 1 2-2h12"/></svg>'

  type Host = HTMLElement & { __tbxSimDispose?: () => void }
  const existing = document.getElementById(HOST_ID) as Host | null
  if (existing) {
    existing.__tbxSimDispose?.()
    existing.remove()
    return true
  }

  const host = document.createElement('div') as Host
  host.id = HOST_ID
  host.setAttribute('data-tbx-simulator', 'overlay')
  host.style.cssText =
    'all:initial;position:fixed;inset:0;z-index:2147483646;pointer-events:none;font-family:system-ui,-apple-system,Segoe UI,sans-serif;'

  const shadow = host.attachShadow({ mode: 'open' })
  const previousOverflow = document.documentElement.style.overflow
  document.documentElement.style.overflow = 'hidden'

  const state = { rotated: false }

  const style = document.createElement('style')
  style.textContent = `
    :host { all: initial; }
    * { box-sizing: border-box; }
    button { font: inherit; }
    .root {
      pointer-events: auto;
      position: fixed;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      color: #111827;
    }
    .stage {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      max-width: 100%;
      max-height: 100%;
      padding: 16px 72px 16px 16px;
    }
    .phone-wrap { position: relative; }
    .chassis {
      position: relative;
      padding: 10px;
      border-radius: 50px;
      background: var(--tbx-fill);
      box-shadow: 0 1px 0 var(--tbx-ring), 0 28px 64px rgba(15,23,42,0.18), 0 2px 10px rgba(15,23,42,0.1);
    }
    .side {
      position: absolute;
      width: 3px;
      border-radius: 1px;
      background: var(--tbx-button);
    }
    .screen {
      position: relative;
      overflow: hidden;
      background: #000;
      border-radius: 40px;
    }
    iframe {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      border: 0;
      background: #fff;
    }
    .status {
      pointer-events: none;
      position: absolute;
      inset: 0 0 auto 0;
      z-index: 3;
      display: flex;
      align-items: center;
      justify-content: space-between;
      height: 34px;
      padding: 0 22px;
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      mix-blend-mode: difference;
    }
    .status-icons { display: flex; align-items: center; gap: 6px; }
    .island, .notch, .punch, .pill, .home, .android-nav { pointer-events: none; position: absolute; z-index: 4; background: #0a0a0a; }
    .island {
      top: 11px; left: 50%; transform: translateX(-50%);
      width: 36%; height: 14px; border-radius: 999px;
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.08);
    }
    .notch {
      top: 0; left: 50%; transform: translateX(-50%);
      width: 34%; height: 20px; border-radius: 0 0 16px 16px;
    }
    .punch {
      top: 10px; left: 50%; transform: translateX(-50%);
      width: 9px; height: 9px; border-radius: 999px;
    }
    .pill {
      top: 8px; left: 50%; transform: translateX(-50%);
      width: 22%; height: 6px; border-radius: 999px;
    }
    .home {
      bottom: 7px; left: 50%; transform: translateX(-50%);
      width: 33%; height: 5px; border-radius: 999px; background: rgba(255,255,255,0.92);
    }
    .safari:not([hidden]) ~ .home {
      background: #3a3a3c;
    }
    .android-nav {
      inset: auto 0 0 0; height: 28px; background: transparent;
      display: flex; align-items: center; justify-content: space-evenly;
      color: rgba(255,255,255,0.8); mix-blend-mode: difference;
    }
    .safari {
      pointer-events: none;
      position: absolute;
      left: 0; right: 0; bottom: 0;
      z-index: 3;
      padding: 6px 12px 18px;
      background: linear-gradient(180deg, rgba(247,247,248,0.92) 0%, #f4f4f5 40%, #f4f4f5 100%);
      color: #111827;
    }
    .url-pill {
      display: flex; align-items: center; gap: 8px;
      height: 36px; padding: 0 10px; border-radius: 12px; background: #fff;
      box-shadow: 0 0 0 1px rgba(15,23,42,0.06);
      font-size: 12px;
    }
    .url-pill .host { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; text-align: center; color: #374151; }
    .safari-tools {
      display: flex; align-items: center; justify-content: space-between;
      margin-top: 4px; padding: 4px 10px 0; color: #0b84ff;
    }
    .safari-tools svg { width: 22px; height: 22px; }
    .actions {
      position: absolute;
      right: 16px; top: 50%; transform: translateY(-50%);
      display: flex; flex-direction: column; gap: 10px;
    }
    .round, .close-x {
      display: flex; align-items: center; justify-content: center;
      width: 40px; height: 40px; border-radius: 999px;
      border: 1px solid #e5e7eb; background: #fff; color: #111827;
      box-shadow: 0 8px 20px rgba(15,23,42,0.12);
      cursor: pointer;
    }
    .round:hover, .close-x:hover { background: #f8fafc; }
    .round:focus-visible, .close-x:focus-visible { outline: 2px solid #4f46e5; outline-offset: 2px; }
    .close-x { position: absolute; top: 16px; right: 16px; }
    .blocked {
      position: absolute; inset: 0; z-index: 5;
      display: none; flex-direction: column; align-items: center; justify-content: center;
      gap: 8px; padding: 16px; text-align: center;
      background: #f4f4f5; color: #52525b; font-size: 12px;
    }
    .blocked a { color: #4f46e5; }
    .landscape .island { top: 50%; left: 8px; transform: translateY(-50%); width: 14px; height: 36%; }
    .landscape .notch { top: 50%; left: 0; transform: translateY(-50%); width: 16px; height: 22%; border-radius: 0 16px 16px 0; }
    .landscape .punch { top: 50%; left: 10px; transform: translateY(-50%); }
    .landscape .home { bottom: auto; left: auto; right: 8px; top: 50%; transform: translateY(-50%); width: 5px; height: 22%; }
    .landscape .safari { display: none; }
    .landscape .status { padding: 0 16px; height: 28px; }
  `
  shadow.append(style)

  const root = document.createElement('div')
  root.className = 'root'
  root.setAttribute('role', 'dialog')
  root.setAttribute('aria-modal', 'true')
  root.setAttribute('aria-label', `${config.label} mobile simulator`)
  root.style.setProperty('--tbx-fill', config.finish.fill)
  root.style.setProperty('--tbx-ring', config.finish.ring)
  root.style.setProperty('--tbx-button', config.finish.button)

  root.innerHTML = `
    <button type="button" class="close-x" aria-label="Close simulator">${iconClose}</button>
    <div class="stage">
      <div class="phone-wrap">
        <span class="side" style="top:16%;left:-3px;height:7%;border-radius:1px 0 0 1px;"></span>
        <span class="side" style="top:26%;left:-3px;height:11%;border-radius:1px 0 0 1px;"></span>
        <span class="side" style="top:39%;left:-3px;height:11%;border-radius:1px 0 0 1px;"></span>
        <span class="side" style="top:22%;right:-3px;height:14%;border-radius:0 1px 1px 0;"></span>
        <div class="chassis">
          <div class="screen">
            <iframe title="${escapeHtml(config.label)}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-modals" referrerpolicy="no-referrer-when-downgrade"></iframe>
            <div class="status" aria-hidden="true">
              <span class="clock"></span>
              <span class="status-icons">${iconSignal}${iconWifi}${iconBattery}</span>
            </div>
            <div class="cutout"></div>
            <div class="safari" hidden>
              <div class="url-pill">
                <span aria-hidden="true">AA</span>
                <span class="host"></span>
                ${iconRefresh}
              </div>
              <div class="safari-tools" aria-hidden="true">
                ${iconBack}${iconForward}${iconShare}${iconBook}${iconTabs}
              </div>
            </div>
            <div class="home" hidden></div>
            <div class="android-nav" hidden>
              <span style="width:10px;height:10px;border:1px solid currentColor;border-radius:2px;"></span>
              <span style="width:10px;height:10px;border:1px solid currentColor;border-radius:999px;"></span>
              <span style="width:10px;height:2px;background:currentColor;border-radius:999px;"></span>
            </div>
            <div class="blocked">This site blocked the in-page preview.<br/><a class="studio-link" target="_blank" rel="noopener noreferrer">Open full simulator</a></div>
          </div>
        </div>
      </div>
    </div>
    <div class="actions">
      <button type="button" class="round" data-act="rotate" aria-label="Rotate">${iconRotate}</button>
      <button type="button" class="round" data-act="reload" aria-label="Reload">${iconRefresh}</button>
      <a class="round studio-link" data-act="studio" target="_blank" rel="noopener noreferrer" aria-label="Open full simulator">${iconExpand}</a>
    </div>
  `
  shadow.append(root)

  const screen = shadow.querySelector('.screen') as HTMLElement
  const iframe = shadow.querySelector('iframe') as HTMLIFrameElement
  const clock = shadow.querySelector('.clock') as HTMLElement
  const cutout = shadow.querySelector('.cutout') as HTMLElement
  const safari = shadow.querySelector('.safari') as HTMLElement
  const home = shadow.querySelector('.home') as HTMLElement
  const androidNav = shadow.querySelector('.android-nav') as HTMLElement
  const blocked = shadow.querySelector('.blocked') as HTMLElement
  const hostLabel = shadow.querySelector('.host') as HTMLElement
  const chassis = shadow.querySelector('.chassis') as HTMLElement
  const status = shadow.querySelector('.status') as HTMLElement

  hostLabel.textContent = config.hostname
  iframe.src = config.url
  for (const link of shadow.querySelectorAll<HTMLAnchorElement>('.studio-link')) {
    link.href = config.studioUrl
  }

  const tick = () => {
    clock.textContent = new Date().toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
  }
  tick()
  const clockId = window.setInterval(tick, 30_000)

  const layout = () => {
    const width = state.rotated ? config.height : config.width
    const height = state.rotated ? config.width : config.height
    const pad = 20
    const maxW = Math.max(160, window.innerWidth - 120)
    const maxH = Math.max(160, window.innerHeight - 32)
    const scale = Math.min(1, maxW / (width + pad), maxH / (height + pad))
    screen.style.width = `${Math.round(width * scale)}px`
    screen.style.height = `${Math.round(height * scale)}px`
    chassis.classList.toggle('landscape', state.rotated)
    root.classList.toggle('landscape', state.rotated)
    const notchClass = config.notch === 'punch-hole' ? 'punch' : config.notch
    cutout.className = config.notch === 'none' ? 'cutout' : `cutout ${notchClass}`
    safari.hidden = !config.showSafari || state.rotated
    home.hidden = config.navBar !== 'home-indicator'
    androidNav.hidden = config.navBar !== 'android' || state.rotated
    status.style.display = config.statusBar === 'none' ? 'none' : ''
  }
  layout()

  iframe.addEventListener('load', () => {
    try {
      const href = iframe.contentWindow?.location.href ?? ''
      if (href.startsWith('chrome-error:') || href.includes('chromewebdata')) {
        blocked.style.display = 'flex'
      }
    } catch {
      /* cross-origin success */
    }
  })

  const onResize = () => layout()
  window.addEventListener('resize', onResize)

  const onKey = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      dispose()
    }
  }

  const dispose = () => {
    window.clearInterval(clockId)
    window.removeEventListener('resize', onResize)
    document.removeEventListener('keydown', onKey, true)
    document.documentElement.style.overflow = previousOverflow
    host.remove()
  }
  host.__tbxSimDispose = dispose
  document.addEventListener('keydown', onKey, true)

  shadow.querySelector('.close-x')?.addEventListener('click', () => dispose())
  shadow.querySelector('[data-act="rotate"]')?.addEventListener('click', () => {
    state.rotated = !state.rotated
    layout()
  })
  shadow.querySelector('[data-act="reload"]')?.addEventListener('click', () => {
    blocked.style.display = 'none'
    iframe.src = config.url
  })

  document.documentElement.append(host)
  ;(shadow.querySelector('.close-x') as HTMLButtonElement | null)?.focus({ preventScroll: true })
  return true
}

export async function openSimulatorOverlay(
  tab: chrome.tabs.Tab,
  opts: { url: string; deviceId?: string },
): Promise<boolean> {
  if (tab.id == null) return false
  const { findDevice, DEFAULT_DEVICE_ID, orientedSize } = await import('@/tools/design/responsive-viewer/devices')
  const device = findDevice(opts.deviceId ?? DEFAULT_DEVICE_ID) ?? findDevice(DEFAULT_DEVICE_ID)
  if (!device) return false
  const size = orientedSize(device, false)
  const color = device.frameColor ?? 'black'
  const finish = CHASSIS[color]
  let hostname = opts.url
  try {
    hostname = new URL(opts.url).host
  } catch {
    /* keep raw */
  }
  const config: SimulatorOverlayConfig = {
    url: opts.url,
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
    studioUrl: simulatorStudioUrl({ url: opts.url, device: device.id }),
  }
  try {
    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id, frameIds: [0] },
      func: mountSimulatorOverlay,
      args: [config],
    })
    return Boolean(injection?.result)
  } catch {
    return false
  }
}
