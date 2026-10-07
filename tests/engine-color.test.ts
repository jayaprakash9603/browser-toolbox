import { describe, expect, it } from 'vitest'

import {
  checkContrast,
  cmykToRgb,
  contrastRatio,
  generatePalette,
  hslToRgb,
  hsvToRgb,
  hwbToRgb,
  parseColor,
  rgbToCmyk,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
  rgbToHwb,
} from '@/core/engines/color'

describe('color engine', () => {
  it('parses hex in all sizes', () => {
    expect(parseColor('#3b82f6')).toEqual({ ok: true, value: { r: 59, g: 130, b: 246 } })
    expect(parseColor('3b82f6')).toEqual({ ok: true, value: { r: 59, g: 130, b: 246 } })
    expect(parseColor('#fff')).toEqual({ ok: true, value: { r: 255, g: 255, b: 255 } })
  })

  it('parses rgb and hsl strings and named colors', () => {
    expect(parseColor('rgb(255, 0, 128)')).toEqual({ ok: true, value: { r: 255, g: 0, b: 128 } })
    expect(parseColor('hsl(120, 100%, 50%)')).toEqual({ ok: true, value: { r: 0, g: 255, b: 0 } })
    expect(parseColor('red')).toEqual({ ok: true, value: { r: 255, g: 0, b: 0 } })
  })

  it('rejects invalid input', () => {
    expect(parseColor('').ok).toBe(false)
    expect(parseColor('#12').ok).toBe(false)
    expect(parseColor('rgb(300,0,0)').ok).toBe(false)
    expect(parseColor('banana').ok).toBe(false)
  })

  const roundTrips = (a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) => {
    expect(Math.abs(a.r - b.r)).toBeLessThanOrEqual(1)
    expect(Math.abs(a.g - b.g)).toBeLessThanOrEqual(1)
    expect(Math.abs(a.b - b.b)).toBeLessThanOrEqual(1)
  }

  it('round-trips rgb ↔ hsl', () => {
    const rgb = { r: 59, g: 130, b: 246 }
    const hsl = rgbToHsl(rgb)
    expect(hsl).toEqual({ h: 217, s: 91, l: 60 })
    roundTrips(hslToRgb(hsl), rgb)
  })

  it('round-trips rgb ↔ hsv', () => {
    const rgb = { r: 59, g: 130, b: 246 }
    roundTrips(hsvToRgb(rgbToHsv(rgb)), rgb)
    expect(rgbToHsv({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 100, v: 100 })
  })

  it('round-trips rgb ↔ cmyk', () => {
    const rgb = { r: 59, g: 130, b: 246 }
    roundTrips(cmykToRgb(rgbToCmyk(rgb)), rgb)
    expect(rgbToCmyk({ r: 0, g: 0, b: 0 })).toEqual({ c: 0, m: 0, y: 0, k: 100 })
  })

  it('round-trips rgb ↔ hwb', () => {
    const rgb = { r: 128, g: 128, b: 128 }
    const back = hwbToRgb(rgbToHwb(rgb))
    expect(Math.abs(back.r - rgb.r)).toBeLessThanOrEqual(1)
    expect(Math.abs(back.g - rgb.g)).toBeLessThanOrEqual(1)
    expect(Math.abs(back.b - rgb.b)).toBeLessThanOrEqual(1)
  })

  it('converts rgb to hex', () => {
    expect(rgbToHex({ r: 59, g: 130, b: 246 })).toBe('#3b82f6')
    expect(rgbToHex({ r: 0, g: 0, b: 0 })).toBe('#000000')
  })

  it('computes WCAG contrast ratios', () => {
    expect(contrastRatio({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })).toBe(21)
    const result = checkContrast({ r: 0, g: 0, b: 0 }, { r: 255, g: 255, b: 255 })
    expect(result).toEqual({ ratio: 21, aaNormal: true, aaLarge: true, aaaNormal: true, aaaLarge: true })
  })

  it('fails low contrast pairs', () => {
    const result = checkContrast({ r: 119, g: 119, b: 119 }, { r: 128, g: 128, b: 128 })
    expect(result.aaNormal).toBe(false)
    expect(result.aaLarge).toBe(false)
  })

  it('generates palettes', () => {
    const base = { r: 59, g: 130, b: 246 }
    expect(generatePalette(base, 'complementary')).toHaveLength(2)
    expect(generatePalette(base, 'triadic')).toHaveLength(3)
    expect(generatePalette(base, 'analogous')).toHaveLength(3)
    expect(generatePalette(base, 'monochromatic')).toHaveLength(4)
    const random = generatePalette(base, 'random', () => 0.5)
    expect(random).toHaveLength(5)
  })

  it('complementary rotates hue by 180', () => {
    const [a, b] = generatePalette({ r: 255, g: 0, b: 0 }, 'complementary')
    expect(rgbToHex(a)).toBe('#ff0000')
    expect(rgbToHex(b)).toBe('#00ffff')
  })
})
