import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildResponsiveViewerFramingRules } from '@/chrome/background/responsiveViewerFraming'
import {
  SIMULATOR_OPEN_LINK,
  SIMULATOR_OPEN_PAGE,
  SIMULATOR_PARENT_ID,
  buildSimulatorMenus,
  handleSimulatorMenuClick,
  isSimulatorMenuItem,
} from '@/chrome/background/responsiveViewer/menus'
import {
  canOverlaySimulatorOnTab,
  mountSimulatorOverlay,
  SIMULATOR_OVERLAY_ID,
  type SimulatorOverlayConfig,
} from '@/chrome/background/responsiveViewer/overlay'
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
    expect(studioParamsFromSearch('?studio=1&url=https://example.com&device=pixel')).toEqual({
      url: 'https://example.com',
      device: 'pixel',
    })
  })

  it('can set a shared iframe User-Agent on framing rules', () => {
    const rules = buildResponsiveViewerFramingRules('Mozilla/5.0 (iPhone)')
    expect(rules[0].action.requestHeaders?.some((header) => header.header === 'user-agent')).toBe(true)
  })

  it('registers stable simulator context-menu ids', () => {
    const created: chrome.contextMenus.CreateProperties[] = []
    buildSimulatorMenus((properties) => {
      created.push(properties)
    })
    expect(created[0]?.id).toBe(SIMULATOR_PARENT_ID)
    expect(created.map((item) => item.id)).toEqual(
      expect.arrayContaining([SIMULATOR_OPEN_PAGE, SIMULATOR_OPEN_LINK, SIMULATOR_PARENT_ID]),
    )
    expect(isSimulatorMenuItem(SIMULATOR_OPEN_PAGE)).toBe(true)
    expect(isSimulatorMenuItem('toolbox.screenshot')).toBe(false)
  })

  it('ignores unrelated frame postMessages', () => {
    expect(isSyncMessage({ source: 'tbx-rv-sync', type: 'scroll', from: 'a', x: 0, y: 1 })).toBe(true)
    expect(isSyncMessage({ source: 'other', type: 'scroll' })).toBe(false)
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
    expect(getComputedStyle(root).backgroundColor === 'rgb(255, 255, 255)' || root.className).toBeTruthy()
    const mockup = host?.shadowRoot?.querySelector('.mockup-img') as HTMLImageElement
    expect(mockup?.hidden).toBe(false)
    expect(mockup?.getAttribute('src')).toContain('iphone-16-pro.webp')
    expect(root.classList.contains('has-mockup')).toBe(true)
    mountSimulatorOverlay(config)
    expect(document.getElementById(SIMULATOR_OVERLAY_ID)).toBeNull()
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
      const run = injection as { func?: (config: SimulatorOverlayConfig) => boolean; args?: [SimulatorOverlayConfig] }
      const result = run.func && run.args ? run.func(run.args[0]) : false
      return [{ result }] as unknown as chrome.scripting.InjectionResult[]
    })
    await handleSimulatorMenuClick(
      SIMULATOR_OPEN_PAGE,
      { menuItemId: SIMULATOR_OPEN_PAGE } as chrome.contextMenus.OnClickData,
      { id: 7, url: 'https://example.com/tools' } as chrome.tabs.Tab,
    )
    expect(chrome.scripting.executeScript).toHaveBeenCalled()
    expect(chrome.tabs.create).not.toHaveBeenCalled()
    expect(document.getElementById(SIMULATOR_OVERLAY_ID)).toBeTruthy()
    const injection = vi.mocked(chrome.scripting.executeScript).mock.calls[0]?.[0] as {
      args?: [{ mockupUrl?: string; deviceId?: string }]
    }
    expect(injection.args?.[0].deviceId).toBe('iphone-16-pro')
    expect(injection.args?.[0].mockupUrl).toContain('iphone-16-pro.webp')
  })

  it('falls back to a studio tab on restricted pages', async () => {
    vi.mocked(chrome.tabs.create).mockClear()
    await handleSimulatorMenuClick(
      SIMULATOR_OPEN_PAGE,
      { menuItemId: SIMULATOR_OPEN_PAGE } as chrome.contextMenus.OnClickData,
      { id: 8, url: 'chrome://extensions' } as chrome.tabs.Tab,
    )
    expect(chrome.tabs.create).toHaveBeenCalled()
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
