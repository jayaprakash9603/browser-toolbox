import { describe, expect, it } from 'vitest'

import {
  DEFAULT_SETTINGS,
  breakpointFor,
  kindForWidth,
  normalizeUrl,
  orientedSize,
  parseSettings,
  viewportScale,
} from '@/tools/design/responsive-viewer/devices'

describe('responsive viewer model', () => {
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
  })
})
