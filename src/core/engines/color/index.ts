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

  const rgbMatch =
    /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})(?:\s*,\s*[\d.]+)?\s*\)$/.exec(text)
  if (rgbMatch) {
    const r = Number(rgbMatch[1])
    const g = Number(rgbMatch[2])
    const b = Number(rgbMatch[3])
    if (r > 255 || g > 255 || b > 255) return { ok: false, error: 'RGB channels must be 0–255.' }
    return { ok: true, value: { r, g, b } }
  }

  const hslMatch =
    /^hsla?\(\s*(-?\d{1,3})(?:deg)?\s*,\s*(\d{1,3})%\s*,\s*(\d{1,3})%(?:\s*,\s*[\d.]+)?\s*\)$/.exec(
      text,
    )
  if (hslMatch) {
    const h = Number(hslMatch[1])
    const s = Number(hslMatch[2])
    const l = Number(hslMatch[3])
    if (s > 100 || l > 100)
      return { ok: false, error: 'HSL saturation and lightness must be 0–100%.' }
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
    segment === 0
      ? [c, x, 0]
      : segment === 1
        ? [x, c, 0]
        : segment === 2
          ? [0, c, x]
          : segment === 3
            ? [0, x, c]
            : segment === 4
              ? [x, 0, c]
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
    segment === 0
      ? [c, x, 0]
      : segment === 1
        ? [x, c, 0]
        : segment === 2
          ? [0, c, x]
          : segment === 3
            ? [0, x, c]
            : segment === 4
              ? [x, 0, c]
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

export interface Oklch {
  /** Perceptual lightness, 0–1. */
  l: number
  /** Chroma, roughly 0–0.37 inside sRGB. */
  c: number
  /** Hue in degrees. */
  h: number
}

function linearToChannel(value: number): number {
  const v = value <= 0.0031308 ? 12.92 * value : 1.055 * Math.pow(value, 1 / 2.4) - 0.055
  return v * 255
}

export function rgbToOklch({ r, g, b }: Rgb): Oklch {
  const lr = channelToLinear(r)
  const lg = channelToLinear(g)
  const lb = channelToLinear(b)
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb)
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb)
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb)
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  const c = Math.sqrt(A * A + B * B)
  const h = c < 1e-4 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360
  return { l: L, c, h }
}

function oklchToLinear({ l, c, h }: Oklch): [number, number, number] {
  const rad = (h * Math.PI) / 180
  const A = c * Math.cos(rad)
  const B = c * Math.sin(rad)
  const l_ = Math.pow(l + 0.3963377774 * A + 0.2158037573 * B, 3)
  const m_ = Math.pow(l - 0.1055613458 * A - 0.0638541728 * B, 3)
  const s_ = Math.pow(l - 0.0894841775 * A - 1.291485548 * B, 3)
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ]
}

const inGamut = (channels: [number, number, number]) => channels.every((v) => v >= -1e-4 && v <= 1 + 1e-4)

/** Converts to sRGB, lowering chroma until the color fits so hue and lightness are kept. */
export function oklchToRgb(color: Oklch): Rgb {
  let linear = oklchToLinear(color)
  if (!inGamut(linear)) {
    let low = 0
    let high = color.c
    for (let step = 0; step < 18; step += 1) {
      const mid = (low + high) / 2
      if (inGamut(oklchToLinear({ ...color, c: mid }))) low = mid
      else high = mid
    }
    linear = oklchToLinear({ ...color, c: low })
  }
  const [r, g, b] = linear.map((v) => clamp(round(linearToChannel(clamp(v, 0, 1))), 0, 255))
  return { r, g, b }
}

/** Distance in OKLab; below ~0.04 two colors are hard to tell apart. */
export function colorDistance(a: Rgb, b: Rgb): number {
  const toLab = (rgb: Rgb) => {
    const { l, c, h } = rgbToOklch(rgb)
    const rad = (h * Math.PI) / 180
    return [l, c * Math.cos(rad), c * Math.sin(rad)]
  }
  const [l1, a1, b1] = toLab(a)
  const [l2, a2, b2] = toLab(b)
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2)
}

export type VisionMode = 'normal' | 'protanopia' | 'deuteranopia' | 'tritanopia' | 'achromatopsia'

/** Machado et al. (2009) full-severity matrices, applied in linear RGB. */
const VISION_MATRICES: Record<Exclude<VisionMode, 'normal' | 'achromatopsia'>, number[][]> = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
}

export function simulateVision(rgb: Rgb, mode: VisionMode): Rgb {
  if (mode === 'normal') return rgb
  const linear = [channelToLinear(rgb.r), channelToLinear(rgb.g), channelToLinear(rgb.b)]
  const out =
    mode === 'achromatopsia'
      ? Array(3).fill(relativeLuminance(rgb))
      : VISION_MATRICES[mode].map((row) => row[0] * linear[0] + row[1] * linear[1] + row[2] * linear[2])
  const [r, g, b] = out.map((v) => clamp(round(linearToChannel(clamp(v, 0, 1))), 0, 255))
  return { r, g, b }
}

export type PaletteMode = 'complementary' | 'analogous' | 'triadic' | 'monochromatic' | 'random'

export function generatePalette(
  base: Rgb,
  mode: PaletteMode,
  random: () => number = Math.random,
): Rgb[] {
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
        hslToRgb({
          h: round(random() * 360),
          s: 45 + round(random() * 40),
          l: 35 + round(random() * 40),
        }),
      )
  }
}
