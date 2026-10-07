export interface Rgb {
  r: number
  g: number
  b: number
}

export interface Hsl {
  h: number
  s: number
  l: number
}

export interface Hsv {
  h: number
  s: number
  v: number
}

export interface Cmyk {
  c: number
  m: number
  y: number
  k: number
}

export interface Hwb {
  h: number
  w: number
  b: number
}

export type ColorResult<T> = { ok: true; value: T } | { ok: false; error: string }

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const round = (value: number) => Math.round(value)

const NAMED_COLORS: Record<string, string> = {
  black: '#000000',
  white: '#ffffff',
  red: '#ff0000',
  green: '#008000',
  blue: '#0000ff',
  yellow: '#ffff00',
  cyan: '#00ffff',
  magenta: '#ff00ff',
  orange: '#ffa500',
  purple: '#800080',
  pink: '#ffc0cb',
  gray: '#808080',
  grey: '#808080',
  transparent: '#00000000',
}

export function parseColor(input: string): ColorResult<Rgb> {
  const raw = input.trim().toLowerCase()
  if (!raw) return { ok: false, error: 'Input is empty.' }
  const named = NAMED_COLORS[raw]
  const text = named ?? raw

  const hexMatch = /^#?([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/.exec(text)
  if (hexMatch) {
    let hex = hexMatch[1]
    if (hex.length === 3 || hex.length === 4) hex = [...hex].map((char) => char + char).join('')
    return {
      ok: true,
      value: {
        r: parseInt(hex.slice(0, 2), 16),
        g: parseInt(hex.slice(2, 4), 16),
        b: parseInt(hex.slice(4, 6), 16),
      },
    }
  }

  const rgbMatch = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)$/.exec(text)
  if (rgbMatch) {
    const r = Number(rgbMatch[1])
    const g = Number(rgbMatch[2])
    const b = Number(rgbMatch[3])
    if (r > 255 || g > 255 || b > 255) return { ok: false, error: 'RGB channels must be 0–255.' }
    return { ok: true, value: { r, g, b } }
  }

  const hslMatch = /^hsla?\(\s*(-?\d{1,3})(?:deg)?\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%(?:\s*,\s*[\d.]+)?\s*\)$/.exec(text)
  if (hslMatch) {
    const h = Number(hslMatch[1])
    const s = Number(hslMatch[2])
    const l = Number(hslMatch[3])
    if (s > 100 || l > 100) return { ok: false, error: 'HSL saturation and lightness must be 0–100%.' }
    return { ok: true, value: hslToRgb({ h, s, l }) }
  }

  return { ok: false, error: 'Unrecognized color format. Try HEX, rgb(...) or hsl(...).' }
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((channel) => clamp(round(channel), 0, 255).toString(16).padStart(2, '0')).join('')}`
}

export function rgbToHsl({ r, g, b }: Rgb): Hsl {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1))
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6)
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2)
    else h = 60 * ((rn - gn) / delta + 4)
  }
  return { h: round((h + 360) % 360), s: round(s * 100), l: round(l * 100) }
}

export function hslToRgb({ h, s, l }: Hsl): Rgb {
  const sn = clamp(s, 0, 100) / 100
  const ln = clamp(l, 0, 100) / 100
  const c = (1 - Math.abs(2 * ln - 1)) * sn
  const hp = (((h % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  const segment = Math.min(Math.floor(hp), 5)
  const [rn, gn, bn]: [number, number, number] =
    segment === 0 ? [c, x, 0]
    : segment === 1 ? [x, c, 0]
    : segment === 2 ? [0, c, x]
    : segment === 3 ? [0, x, c]
    : segment === 4 ? [x, 0, c]
    : [c, 0, x]
  const m = ln - c / 2
  return { r: round((rn + m) * 255), g: round((gn + m) * 255), b: round((bn + m) * 255) }
}

export function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  let h = 0
  if (delta !== 0) {
    if (max === rn) h = 60 * (((gn - bn) / delta) % 6)
    else if (max === gn) h = 60 * ((bn - rn) / delta + 2)
    else h = 60 * ((rn - gn) / delta + 4)
  }
  return {
    h: round((h + 360) % 360),
    s: max === 0 ? 0 : round((delta / max) * 100),
    v: round(max * 100),
  }
}

export function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const sn = clamp(s, 0, 100) / 100
  const vn = clamp(v, 0, 100) / 100
  const c = vn * sn
  const hp = (((h % 360) + 360) % 360) / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  const segment = Math.min(Math.floor(hp), 5)
  const [rn, gn, bn]: [number, number, number] =
    segment === 0 ? [c, x, 0]
    : segment === 1 ? [x, c, 0]
    : segment === 2 ? [0, c, x]
    : segment === 3 ? [0, x, c]
    : segment === 4 ? [x, 0, c]
    : [c, 0, x]
  const m = vn - c
  return { r: round((rn + m) * 255), g: round((gn + m) * 255), b: round((bn + m) * 255) }
}

export function rgbToCmyk({ r, g, b }: Rgb): Cmyk {
  const rn = r / 255
  const gn = g / 255
  const bn = b / 255
  const k = 1 - Math.max(rn, gn, bn)
  if (k === 1) return { c: 0, m: 0, y: 0, k: 100 }
  return {
    c: round(((1 - rn - k) / (1 - k)) * 100),
    m: round(((1 - gn - k) / (1 - k)) * 100),
    y: round(((1 - bn - k) / (1 - k)) * 100),
    k: round(k * 100),
  }
}

export function cmykToRgb({ c, m, y, k }: Cmyk): Rgb {
  const factor = 1 - clamp(k, 0, 100) / 100
  return {
    r: round(255 * (1 - clamp(c, 0, 100) / 100) * factor),
    g: round(255 * (1 - clamp(m, 0, 100) / 100) * factor),
    b: round(255 * (1 - clamp(y, 0, 100) / 100) * factor),
  }
}

export function rgbToHwb(rgb: Rgb): Hwb {
  const { h } = rgbToHsv(rgb)
  const max = Math.max(rgb.r, rgb.g, rgb.b) / 255
  const min = Math.min(rgb.r, rgb.g, rgb.b) / 255
  return { h, w: round(min * 100), b: round((1 - max) * 100) }
}

export function hwbToRgb({ h, w, b }: Hwb): Rgb {
  const whiteness = clamp(w, 0, 100) / 100
  const blackness = clamp(b, 0, 100) / 100
  if (whiteness + blackness >= 1) {
    const gray = round((whiteness / (whiteness + blackness)) * 255)
    return { r: gray, g: gray, b: gray }
  }
  const base = hslToRgb({ h, s: 100, l: 50 })
  const mix = (channel: number) =>
    round(((channel / 255) * (1 - whiteness - blackness) + whiteness) * 255)
  return { r: mix(base.r), g: mix(base.g), b: mix(base.b) }
}

function channelToLinear(channel: number): number {
  const normalized = channel / 255
  return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4)
}

export function relativeLuminance({ r, g, b }: Rgb): number {
  return 0.2126 * channelToLinear(r) + 0.7152 * channelToLinear(g) + 0.0722 * channelToLinear(b)
}

export function contrastRatio(foreground: Rgb, background: Rgb): number {
  const lighter = Math.max(relativeLuminance(foreground), relativeLuminance(background))
  const darker = Math.min(relativeLuminance(foreground), relativeLuminance(background))
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100
}

export interface ContrastResult {
  ratio: number
  aaNormal: boolean
  aaLarge: boolean
  aaaNormal: boolean
  aaaLarge: boolean
}

export function checkContrast(foreground: Rgb, background: Rgb): ContrastResult {
  const ratio = contrastRatio(foreground, background)
  return {
    ratio,
    aaNormal: ratio >= 4.5,
    aaLarge: ratio >= 3,
    aaaNormal: ratio >= 7,
    aaaLarge: ratio >= 4.5,
  }
}

export type PaletteMode = 'complementary' | 'analogous' | 'triadic' | 'monochromatic' | 'random'

export function generatePalette(base: Rgb, mode: PaletteMode, random: () => number = Math.random): Rgb[] {
  const hsl = rgbToHsl(base)
  const rotate = (degrees: number): Rgb => hslToRgb({ ...hsl, h: (hsl.h + degrees + 360) % 360 })
  switch (mode) {
    case 'complementary':
      return [base, rotate(180)]
    case 'analogous':
      return [rotate(-30), base, rotate(30)]
    case 'triadic':
      return [base, rotate(120), rotate(240)]
    case 'monochromatic':
      return [20, 40, 60, 80].map((l) => hslToRgb({ ...hsl, l }))
    case 'random':
      return Array.from({ length: 5 }, () =>
        hslToRgb({ h: round(random() * 360), s: 45 + round(random() * 40), l: 35 + round(random() * 40) }),
      )
  }
}
