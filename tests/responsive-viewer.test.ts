import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildResponsiveViewerFramingRules } from '@/chrome/background/responsiveViewerFraming'
import {
  SIMULATOR_OPEN_PAGE,
  SIMULATOR_PARENT_ID,
  buildSimulatorMenus,
  handleSimulatorMenuClick,
  isSimulatorMenuItem,
  openSimulatorForTab,
} from '@/chrome/background/responsiveViewer/menus'
import {
  canOverlaySimulatorOnTab,
  handleOverlayAction,
  mountSimulatorOverlay,
  SIMULATOR_OVERLAY_ID,
  type SimulatorOverlayConfig,
} from '@/chrome/background/responsiveViewer/overlay'
import { handleOpenOverlayMessage } from '@/chrome/background/responsiveViewer/openSimulator'
import { CHASSIS } from '@/tools/design/responsive-viewer/chassis'
import {
  DEFAULT_DEVICE_ID,
  DEFAULT_SETTINGS,
  DEVICE_BY_ID,
  DEVICES,
  MAX_SIMULTANEOUS_DEVICES,
  breakpointFor,
  findDevice,
  importDeviceProfile,
  kindForWidth,
  normalizeUrl,
  orientedSize,
  parseSettings,
  resolveFrameFinish,
  viewportScale,
} from '@/tools/design/responsive-viewer/devices'
import {
  isSimulatorStudioSearch,
  simulatorStudioHash,
  studioParamsFromSearch,
} from '@/tools/design/responsive-viewer/studioUrl'
import { isSyncMessage } from '@/tools/design/responsive-viewer/sync'
import { mockupFor, mockupOuterSize, mockupSrc, orientedMockupInsets } from '@/tools/design/responsive-viewer/mockups'

describe('responsive viewer model', () => {
  it('strips frame-blocking response headers in preview session rules', () => {
    const rules = buildResponsiveViewerFramingRules()
    expect(rules).toHaveLength(2)
    const headers = rules[0].action.responseHeaders?.map((h) => h.header)
    expect(headers).toContain('x-frame-options')
    expect(headers).toContain('cross-origin-resource-policy')
  })

  it('normalizes typed addresses to http(s) URLs', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com/')
    expect(normalizeUrl('  https://cursor.com/dashboard?x=1 ')).toBe('https://cursor.com/dashboard?x=1')
    expect(normalizeUrl('localhost:5173/app')).toBe('http://localhost:5173/app')
    expect(normalizeUrl('chrome://extensions')).toBeNull()
    expect(normalizeUrl('javascript:alert(1)')).toBeNull()
    expect(normalizeUrl('not a url')).toBeNull()
    expect(normalizeUrl('')).toBeNull()
  })

  it('fits a viewport inside both the available width and height', () => {
    expect(viewportScale('fit', { width: 1920, height: 1080 }, { width: 480, maxHeight: 600 })).toBe(0.25)
    expect(viewportScale('fit', { width: 393, height: 852 }, { width: 600, maxHeight: 426 })).toBe(0.5)
    expect(viewportScale('fit', { width: 300, height: 300 }, { width: 900, maxHeight: 900 })).toBe(1)
    expect(viewportScale('fit', { width: 1000, height: 500 }, { width: null, maxHeight: 250 })).toBe(0.5)
    expect(viewportScale('0.75', { width: 1920, height: 1080 }, { width: 100, maxHeight: 100 })).toBe(0.75)
  })

  it('swaps dimensions when rotated and reports breakpoints', () => {
    const device = { id: 'p', label: 'P', kind: 'phone' as const, width: 393, height: 852 }
    expect(orientedSize(device, true)).toEqual({ width: 852, height: 393 })
    expect(breakpointFor(393)).toBe('xs')
    expect(breakpointFor(768)).toBe('md')
    expect(breakpointFor(1920)).toBe('2xl')
    expect(kindForWidth(820)).toBe('tablet')
  })

  it('restores saved settings and drops invalid entries', () => {
    expect(parseSettings(null)).toEqual(DEFAULT_SETTINGS)
    expect(parseSettings('{bad')).toEqual(DEFAULT_SETTINGS)
    const restored = parseSettings(
      JSON.stringify({
        selected: ['iphone', 'gone', 'custom-1'],
        rotated: ['iphone'],
        custom: [
          { id: 'custom-1', label: 'Kiosk', kind: 'desktop', width: 1080, height: 1920 },
          { id: 'custom-2', label: 'Tiny', kind: 'phone', width: 10, height: 10 },
        ],
        zoom: '0.5',
        layout: 'row',
        frame: false,
        unblock: false,
      }),
    )
    expect(restored.selected).toEqual(['iphone', 'custom-1'])
    expect(restored.custom.map((d) => d.id)).toEqual(['custom-1'])
    expect(restored).toMatchObject({ zoom: '0.5', layout: 'row', frame: false, unblock: false, rotated: ['iphone'] })
    expect(restored.lastDevice).toBe('iphone')
    expect(restored.studioLayout).toBe('focus')
    expect(restored.studioTheme).toBe('light')
    expect(restored.mobileUa).toBe(false)
  })

  it('defaults new sessions to iPhone 16 Pro and keeps legacy ids', () => {
    expect(DEFAULT_SETTINGS.selected).toEqual([DEFAULT_DEVICE_ID])
    expect(DEFAULT_DEVICE_ID).toBe('iphone-16-pro')
    for (const id of ['iphone', 'ipad-mini', 'laptop', 'desktop', 'galaxy', 'pixel', 'iphone-16-pro']) {
      expect(DEVICE_BY_ID.has(id)).toBe(true)
    }
    expect(findDevice('iphone-16-pro')?.width).toBe(402)
    expect(findDevice('iphone-16-pro')?.specStatus).toBe('verified')
    expect(findDevice('galaxy-s26')?.specStatus).toBe('approximate')
    expect(DEVICES.length).toBeGreaterThan(40)
    expect(DEFAULT_SETTINGS.studioTheme).toBe('light')
    expect(DEFAULT_SETTINGS.presentation.background).toBe('white')
    expect(DEFAULT_SETTINGS.frameColor).toBe('auto')
    expect(resolveFrameFinish('auto', { frameColor: 'titanium' })).toBe('titanium')
    expect(resolveFrameFinish('black', { frameColor: 'titanium' })).toBe('black')
    expect(CHASSIS.titanium.fill.toLowerCase()).not.toContain('#d7c4ae')
    expect(CHASSIS.titanium.swatch).toBe('#322e38')
  })

  it('applies fold viewports and caps simultaneous devices', () => {
    const fold = findDevice('galaxy-z-fold')
    expect(fold).toBeTruthy()
    expect(orientedSize(fold!, false, true)).toEqual(fold!.folded)
    expect(orientedSize(fold!, false, false)).toEqual(fold!.unfolded)
    expect(MAX_SIMULTANEOUS_DEVICES).toBe(6)
    const restored = parseSettings(JSON.stringify({ selected: ['iphone', 'pixel', 'galaxy', 'ipad', 'laptop', 'desktop', 'iphone-se'] }))
    expect(restored.selected).toHaveLength(6)
  })

  it('imports a custom device profile as a new custom device', () => {
    const imported = importDeviceProfile(
      JSON.stringify({ id: 'iphone', label: 'Mine', kind: 'phone', width: 390, height: 844 }),
    )
    expect(imported?.custom).toBe(true)
    expect(imported?.id).not.toBe('iphone')
    expect(imported?.width).toBe(390)
    expect(importDeviceProfile('{"nope":true}')).toBeNull()
  })
})

describe('mobile simulator studio helpers', () => {
  afterEach(() => {
    document.getElementById(SIMULATOR_OVERLAY_ID)?.remove()
    document.documentElement.style.overflow = ''
  })

  it('builds a chromeless studio hash and reads studio params', () => {
    expect(isSimulatorStudioSearch('studio=1&url=https%3A%2F%2Fexample.com')).toBe(true)
    expect(isSimulatorStudioSearch('')).toBe(false)
    expect(simulatorStudioHash({ url: 'https://example.com/', device: 'iphone-16-pro' })).toBe(
      '/tools/design/responsive-viewer?studio=1&url=https%3A%2F%2Fexample.com%2F&device=iphone-16-pro',
    )
    expect(simulatorStudioHash({ url: 'https://example.com/', layout: 'grid' })).toContain('layout=grid')
    expect(studioParamsFromSearch('?studio=1&url=https://example.com&device=pixel')).toEqual({
      url: 'https://example.com',
      device: 'pixel',
      layout: null,
    })
    expect(studioParamsFromSearch('?studio=1&layout=grid')).toMatchObject({ layout: 'grid' })
  })

  it('can set a shared iframe User-Agent on framing rules', () => {
    const rules = buildResponsiveViewerFramingRules('Mozilla/5.0 (iPhone)')
    expect(rules[0].action.requestHeaders?.some((header) => header.header === 'user-agent')).toBe(true)
  })

  it('registers a single clickable Mobile Simulator menu item', () => {
    const created: chrome.contextMenus.CreateProperties[] = []
    buildSimulatorMenus((properties) => {
      created.push(properties)
    })
    expect(created).toHaveLength(1)
    expect(created[0]?.id).toBe(SIMULATOR_PARENT_ID)
    expect(created[0]?.parentId).toBeUndefined()
    expect(created[0]?.contexts).toEqual(['all'])
    expect(isSimulatorMenuItem(SIMULATOR_PARENT_ID)).toBe(true)
    expect(isSimulatorMenuItem(SIMULATOR_OPEN_PAGE)).toBe(true)
    expect(isSimulatorMenuItem('toolbox.screenshot')).toBe(false)
  })

  it('ignores unrelated frame postMessages', () => {
    expect(isSyncMessage({ source: 'tbx-rv-sync', type: 'scroll', from: 'a', x: 0, y: 1 })).toBe(true)
    expect(isSyncMessage({ source: 'other', type: 'scroll' })).toBe(false)
  })

  it('remembers an active overlay per tab until close', async () => {
    const { markOverlaySession, getOverlaySession, clearOverlaySession } = await import(
      '@/chrome/background/responsiveViewer/overlaySession'
    )
    await markOverlaySession(12, { previewUrl: 'https://example.com/app', deviceId: 'iphone-16-pro' })
    await expect(getOverlaySession(12)).resolves.toMatchObject({
      previewUrl: 'https://example.com/app',
      deviceId: 'iphone-16-pro',
    })
    await clearOverlaySession(12)
    await expect(getOverlaySession(12)).resolves.toBeNull()
  })

  it('can strip frame headers for subframes in an overlay tab', async () => {
    const { setOverlayTabFraming, RV_OVERLAY_TAB_FRAMING_RULE_ID } = await import(
      '@/chrome/background/responsiveViewerFraming'
    )
    await setOverlayTabFraming(42, true)
    expect(chrome.declarativeNetRequest.updateSessionRules).toHaveBeenCalledWith(
      expect.objectContaining({
        addRules: expect.arrayContaining([
          expect.objectContaining({
            id: RV_OVERLAY_TAB_FRAMING_RULE_ID,
            condition: expect.objectContaining({ tabIds: [42], resourceTypes: ['sub_frame'] }),
          }),
        ]),
      }),
    )
    vi.mocked(chrome.declarativeNetRequest.updateSessionRules).mockClear()
    await setOverlayTabFraming(42, false)
    expect(chrome.declarativeNetRequest.updateSessionRules).toHaveBeenCalledWith({
      removeRuleIds: [RV_OVERLAY_TAB_FRAMING_RULE_ID],
      addRules: [],
    })
  })

  it('covers same-origin pages in an overlay and skips restricted or cross-origin targets', () => {
    expect(canOverlaySimulatorOnTab('https://example.com/a', 'https://example.com/b')).toBe(true)
    expect(canOverlaySimulatorOnTab('https://example.com/', 'https://other.example/')).toBe(false)
    expect(canOverlaySimulatorOnTab('chrome://extensions', 'https://example.com/')).toBe(false)
  })

  it('mounts a white on-page overlay using the device chassis color', () => {
    const config = overlayFixture()
    expect(mountSimulatorOverlay(config)).toBe(true)
    const host = document.getElementById(SIMULATOR_OVERLAY_ID)
    expect(host).toBeTruthy()
    const root = host?.shadowRoot?.querySelector('.root') as HTMLElement
    expect(root.style.getPropertyValue('--tbx-fill')).toBe(config.finish.fill)
    expect(host?.shadowRoot?.querySelector('iframe')?.src).toContain('https://example.com/tools')
    expect(root.classList.contains('drawer-open')).toBe(false)
    expect(host?.shadowRoot?.querySelector('[data-panel="devices"]')?.classList.contains('open')).toBe(false)
    const mockup = host?.shadowRoot?.querySelector('.mockup-img') as HTMLImageElement
    expect(mockup?.hidden).toBe(false)
    expect(mockup?.getAttribute('src')).toContain('iphone-16-pro.webp')
    expect(root.classList.contains('has-mockup')).toBe(true)
    const acts = [...(host?.shadowRoot?.querySelectorAll('[data-act]') ?? [])].map((el) => el.getAttribute('data-act'))
    expect(acts).toEqual(
      expect.arrayContaining(['devices', 'rotate', 'reload', 'screenshot', 'record', 'compare', 'settings', 'expand']),
    )
    expect(host?.shadowRoot?.querySelector('[data-panel="devices"]')).toBeTruthy()
    expect(host?.shadowRoot?.querySelector('[data-panel="settings"]')).toBeTruthy()
    mountSimulatorOverlay(config)
    expect(document.getElementById(SIMULATOR_OVERLAY_ID)).toBeNull()
  })

  it('updates the overlay in place when replace is set', () => {
    const config = overlayFixture()
    expect(mountSimulatorOverlay(config)).toBe(true)
    const host = document.getElementById(SIMULATOR_OVERLAY_ID)
    const pixel = mockupFor('pixel')
    expect(pixel).toBeTruthy()
    expect(
      mountSimulatorOverlay({
        ...config,
        replace: true,
        deviceId: 'pixel',
        label: 'Pixel 8',
        mockupUrl: mockupSrc(pixel!.file),
        mockupInsets: pixel ?? undefined,
        width: 412,
        height: 915,
        showSafari: false,
      }),
    ).toBe(true)
    expect(document.getElementById(SIMULATOR_OVERLAY_ID)).toBe(host)
    expect(host?.shadowRoot?.querySelector('.root')?.getAttribute('aria-label')).toBe('Pixel 8 mobile simulator')
    expect((host?.shadowRoot?.querySelector('.mockup-img') as HTMLImageElement | null)?.getAttribute('src')).toContain(
      'pixel-8.webp',
    )
  })

  it('maps catalog phones onto MIT mockup frames and leaves Galaxy on the CSS chassis', () => {
    const pro = mockupFor('iphone-16-pro')
    expect(pro?.file).toBe('iphone-16-pro.webp')
    expect(mockupFor('iphone-17-pro')?.file).toBe('iphone-16-pro.webp')
    expect(mockupFor('pixel')?.file).toBe('pixel-8.webp')
    expect(mockupFor('galaxy')).toBeNull()
    expect(mockupFor('iphone-se')).toBeNull()
    const rotated = orientedMockupInsets(pro!, true)
    expect(rotated.left).toBe(pro!.bottom)
    expect(rotated.top).toBe(pro!.left)
    const outer = mockupOuterSize({ width: 402, height: 874 }, pro!)
    expect(outer.width).toBeGreaterThan(402)
    expect(outer.height).toBeGreaterThan(874)
  })

  it('injects the overlay from the context menu instead of opening a studio tab', async () => {
    vi.mocked(chrome.tabs.create).mockClear()
    vi.mocked(chrome.scripting.executeScript).mockImplementation(async (injection) => {
      const run = injection as {
        files?: string[]
        func?: ((config: SimulatorOverlayConfig) => boolean) | ((key: string, config: SimulatorOverlayConfig) => boolean)
        args?: [SimulatorOverlayConfig] | [string, SimulatorOverlayConfig]
      }
      if (run.files?.length) return [] as unknown as chrome.scripting.InjectionResult[]
      if (run.func && run.args) {
        const cfg = typeof run.args[0] === 'string' ? run.args[1] : run.args[0]
        const result = cfg ? mountSimulatorOverlay(cfg) : false
        return [{ result }] as unknown as chrome.scripting.InjectionResult[]
      }
      return [{ result: false }] as unknown as chrome.scripting.InjectionResult[]
    })
    await handleSimulatorMenuClick(
      SIMULATOR_PARENT_ID,
      { menuItemId: SIMULATOR_PARENT_ID } as chrome.contextMenus.OnClickData,
      { id: 7, url: 'https://example.com/tools' } as chrome.tabs.Tab,
    )
    expect(chrome.scripting.executeScript).toHaveBeenCalled()
    expect(chrome.tabs.create).not.toHaveBeenCalled()
    expect(document.getElementById(SIMULATOR_OVERLAY_ID)).toBeTruthy()
    const mountCall = vi.mocked(chrome.scripting.executeScript).mock.calls.find((call) => {
      const run = call[0] as { func?: unknown; args?: unknown[] }
      return Boolean(run.func && run.args && typeof run.args[0] === 'string')
    })?.[0] as { args?: [string, SimulatorOverlayConfig] }
    expect(mountCall?.args?.[1].deviceId).toBe('iphone-16-pro')
    expect(mountCall?.args?.[1].mockupUrl).toContain('iphone-16-pro.webp')
  })

  it('falls back to a studio tab on restricted pages', async () => {
    vi.mocked(chrome.tabs.create).mockClear()
    await handleSimulatorMenuClick(
      SIMULATOR_PARENT_ID,
      { menuItemId: SIMULATOR_PARENT_ID } as chrome.contextMenus.OnClickData,
      { id: 8, url: 'chrome://extensions' } as chrome.tabs.Tab,
    )
    expect(chrome.tabs.create).toHaveBeenCalledWith({ url: expect.stringContaining('studio=1') })
  })

  it('keeps the current tab when overlay inject fails instead of opening studio', async () => {
    vi.mocked(chrome.tabs.create).mockClear()
    vi.mocked(chrome.scripting.executeScript).mockRejectedValueOnce(new Error('Cannot access contents of the page'))
    const result = await openSimulatorForTab(
      { id: 11, url: 'https://example.com/tools' } as chrome.tabs.Tab,
      { url: 'https://example.com/tools', replace: true },
    )
    expect(chrome.tabs.create).not.toHaveBeenCalled()
    expect(result.reason).toBe('inject-failed')
  })

  it('opens the overlay from Compact Viewer messages and reports fallback reasons', async () => {
    vi.mocked(chrome.tabs.create).mockClear()
    vi.mocked(chrome.scripting.executeScript).mockImplementation(async (injection) => {
      const run = injection as {
        files?: string[]
        func?: ((config: SimulatorOverlayConfig) => boolean) | ((key: string, config: SimulatorOverlayConfig) => boolean)
        args?: [SimulatorOverlayConfig] | [string, SimulatorOverlayConfig]
      }
      if (run.files?.length) return [] as unknown as chrome.scripting.InjectionResult[]
      if (run.func && run.args) {
        const cfg = typeof run.args[0] === 'string' ? run.args[1] : run.args[0]
        const result = cfg ? mountSimulatorOverlay(cfg) : false
        return [{ result }] as unknown as chrome.scripting.InjectionResult[]
      }
      return [{ result: false }] as unknown as chrome.scripting.InjectionResult[]
    })
    const overlay = await handleOpenOverlayMessage(
      { type: 'SIMULATOR_OPEN_OVERLAY', url: 'https://example.com/tools', tabId: 7 },
      {},
    )
    expect(overlay).toEqual({ opened: 'overlay' })
    expect(chrome.tabs.create).not.toHaveBeenCalled()

    const studio = await handleOpenOverlayMessage(
      { type: 'SIMULATOR_OPEN_OVERLAY', url: 'chrome://extensions', tabId: 8 },
      { tab: { id: 8, url: 'chrome://extensions' } as chrome.tabs.Tab },
    )
    expect(studio).toMatchObject({ opened: 'studio', reason: 'restricted' })

    vi.mocked(chrome.tabs.create).mockClear()
    const command = await openSimulatorForTab({ id: 9, url: 'https://example.com/' } as chrome.tabs.Tab, {
      url: 'https://other.example/',
    })
    expect(command).toMatchObject({ opened: 'overlay', reason: 'cross-origin' })
    expect(chrome.tabs.create).not.toHaveBeenCalled()
  })

  it('lists catalog devices and opens comparison studio from overlay actions', async () => {
    vi.mocked(chrome.tabs.create).mockClear()
    const list = (await handleOverlayAction({ type: 'SIMULATOR_OVERLAY_ACTION', action: 'listDevices' }, {})) as {
      devices: { id: string }[]
      current: string
    }
    expect(list.devices.some((device) => device.id === 'iphone-16-pro')).toBe(true)
    expect(list.current).toBe('iphone-16-pro')

    await handleOverlayAction(
      {
        type: 'SIMULATOR_OVERLAY_ACTION',
        action: 'compare',
        url: 'https://example.com/tools',
        deviceId: 'iphone-16-pro',
      },
      {},
    )
    expect(chrome.tabs.create).toHaveBeenCalledWith({
      url: expect.stringMatching(/studio=1.*layout=grid/),
    })
  })

  it('keeps the device catalog out of the service worker static overlay registrar', () => {
    const menus = readFileSync(resolve('src/chrome/background/responsiveViewer/menus.ts'), 'utf8')
    const messages = readFileSync(resolve('src/chrome/background/responsiveViewer/messages.ts'), 'utf8')
    const index = readFileSync(resolve('src/chrome/background/index.ts'), 'utf8')
    expect(messages).toMatch(/from ['"]\.\/openSimulator['"]/)
    expect(messages).toMatch(/from ['"]\.\/overlayService['"]/)
    expect(messages).not.toMatch(/await import\(/)
    expect(menus).not.toMatch(/from ['"]\.\/overlayService['"]/)
    expect(menus).not.toMatch(/await import\(/)
    expect(index).not.toMatch(/responsive-viewer\/(devices|catalog|overlay)/)
    expect(index).toContain('registerSimulatorOverlayMessages')
    const tool = readFileSync(resolve('src/tools/design/responsive-viewer/Tool.tsx'), 'utf8')
    expect(tool).toContain('openSimulatorOverlayFromUi')
    expect(tool).not.toContain('openSimulatorStudio')
  })
})

function overlayFixture(): SimulatorOverlayConfig {
  return {
    url: 'https://example.com/tools',
    label: 'iPhone 16 Pro',
    deviceId: 'iphone-16-pro',
    width: 402,
    height: 874,
    color: 'titanium',
    finish: { fill: CHASSIS.titanium.fill, ring: CHASSIS.titanium.ring, button: CHASSIS.titanium.button },
    notch: 'island',
    navBar: 'home-indicator',
    statusBar: 'ios',
    frameStyle: 'iphone',
    showSafari: true,
    hostname: 'example.com',
    studioUrl: 'index.html#/tools/design/responsive-viewer?studio=1',
    mockupUrl: mockupSrc('iphone-16-pro.webp'),
    mockupInsets: mockupFor('iphone-16-pro') ?? undefined,
  }
}
