import {
  colorDistance,
  contrastRatio,
  hslToRgb,
  oklchToRgb,
  parseColor,
  rgbToCmyk,
  rgbToHex,
  rgbToHsl,
  rgbToOklch,
  simulateVision,
  type Rgb,
  type VisionMode,
} from '@/core/engines/color'

export const HARMONIES = [
  'analogous',
  'monochromatic',
  'complementary',
  'split',
  'triadic',
  'tetradic',
  'compound',
  'random',
] as const
export type Harmony = (typeof HARMONIES)[number]

export const MIN_COLORS = 3
export const MAX_COLORS = 8
export const DEFAULT_BASE = '#3b82f6'

export interface Swatch {
  id: string
  hex: string
  locked: boolean
}

type Step = readonly [hueOffset: number, saturationDelta: number, lightnessDelta: number]

/** Each recipe lists MAX_COLORS steps; step 0 is always the base color itself. */
const RECIPES: Record<Exclude<Harmony, 'random'>, readonly Step[]> = {
  analogous: [[0, 0, 0], [-30, -4, 6], [30, -4, -6], [-15, -10, 22], [15, 6, -22], [-45, -12, 14], [45, -8, -14], [0, -30, 34]],
  monochromatic: [[0, 0, 0], [0, -6, 18], [0, 4, -16], [0, -14, 32], [0, 6, -28], [0, -20, 40], [0, 8, -36], [0, -10, 10]],
  complementary: [[0, 0, 0], [180, 0, 0], [0, -12, 24], [180, -10, -18], [0, -35, 38], [180, -20, 30], [0, 6, -26], [180, 8, -30]],
  split: [[0, 0, 0], [150, 0, 0], [210, 0, 0], [0, -25, 32], [180, -20, -26], [150, -15, 24], [210, -10, -20], [0, 8, -28]],
  triadic: [[0, 0, 0], [120, 0, 0], [240, 0, 0], [0, -25, 30], [120, -10, -22], [240, -15, 24], [0, 6, -26], [120, -30, 36]],
  tetradic: [[0, 0, 0], [90, 0, 0], [180, 0, 0], [270, 0, 0], [0, -40, 36], [90, -15, -24], [180, -15, 24], [270, -10, -24]],
  compound: [[0, 0, 0], [30, -5, 8], [180, 0, 0], [150, -8, -10], [0, -30, 32], [210, -15, 24], [30, 6, -24], [180, 8, -28]],
}

/** Hue offsets drawn on the harmony wheel. */
export function harmonyAngles(harmony: Harmony): number[] {
  if (harmony === 'random') return [0, 72, 144, 216, 288]
  return [...new Set(RECIPES[harmony].map(([hue]) => ((hue % 360) + 360) % 360))]
}

const clampNumber = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

/** Moves lightness away from the edges by mirroring the offset instead of clipping to white or black. */
function shiftLightness(lightness: number, delta: number): number {
  const next = lightness + delta
  if (next > 95 || next < 8) return clampNumber(lightness - delta, 8, 95)
  return next
}

export function normalizeHex(input: string): string | null {
  const parsed = parseColor(input)
  return parsed.ok ? rgbToHex(parsed.value) : null
}

export function hexToRgb(hex: string): Rgb {
  const parsed = parseColor(hex)
  return parsed.ok ? parsed.value : { r: 0, g: 0, b: 0 }
}

function randomBase(rng: () => number): string {
  return rgbToHex(hslToRgb({ h: Math.round(rng() * 360), s: 48 + Math.round(rng() * 36), l: 40 + Math.round(rng() * 24) }))
}

/**
 * MAX_COLORS colors in harmony with `baseHex`, base first. `rng` adds small variations
 * so regenerating gives fresh results; the default keeps output deterministic.
 */
export function harmonyHexes(baseHex: string, harmony: Harmony, rng: () => number = () => 0.5): string[] {
  const base = rgbToHsl(hexToRgb(baseHex))
  const jitter = (amount: number) => (rng() - 0.5) * 2 * amount
  if (harmony === 'random') {
    return [
      rgbToHex(hexToRgb(baseHex)),
      ...Array.from({ length: MAX_COLORS - 1 }, () =>
        rgbToHex(hslToRgb({ h: Math.round(rng() * 360), s: 42 + Math.round(rng() * 44), l: 30 + Math.round(rng() * 50) })),
      ),
    ]
  }
  return RECIPES[harmony].map(([hue, sat, light], index) => {
    if (index === 0) return rgbToHex(hexToRgb(baseHex))
    return rgbToHex(
      hslToRgb({
        h: (base.h + hue + jitter(6) + 360) % 360,
        s: clampNumber(base.s + sat + jitter(6), 0, 100),
        l: shiftLightness(base.l, light + jitter(5)),
      }),
    )
  })
}

/** Writes candidates into unlocked slots, keeping slot ids so each column animates in place. */
function fillUnlocked(swatches: Swatch[], candidates: string[]): Swatch[] {
  let next = 0
  return swatches.map((swatch) => (swatch.locked ? swatch : { ...swatch, hex: candidates[next++] ?? swatch.hex }))
}

/** Random mode needs real randomness; every other harmony is deterministic for a given base. */
const defaultRng = (harmony: Harmony) => (harmony === 'random' ? Math.random : () => 0.5)

export function applyHarmony(swatches: Swatch[], baseHex: string, harmony: Harmony, rng = defaultRng(harmony)): Swatch[] {
  const candidates = harmonyHexes(baseHex, harmony, rng)
  const lockedHexes = new Set(swatches.filter((s) => s.locked).map((s) => s.hex))
  return fillUnlocked(swatches, candidates.filter((hex) => !lockedHexes.has(hex)))
}

/** New colors for unlocked slots; the first locked color anchors the harmony. */
export function regenerate(swatches: Swatch[], harmony: Harmony, rng: () => number = Math.random): { swatches: Swatch[]; base: string } {
  const anchor = swatches.find((s) => s.locked)
  const base = anchor?.hex ?? randomBase(rng)
  const candidates = harmonyHexes(base, harmony, rng)
  return { swatches: fillUnlocked(swatches, anchor ? candidates.slice(1) : candidates), base }
}

export function createSwatches(hexes: string[]): Swatch[] {
  return hexes.map((hex) => ({ id: crypto.randomUUID(), hex: normalizeHex(hex) ?? hex, locked: false }))
}

export function initialSwatches(base = DEFAULT_BASE, harmony: Harmony = 'analogous', count = 5): Swatch[] {
  return createSwatches(harmonyHexes(base, harmony, defaultRng(harmony)).slice(0, count))
}

/* ---------- Naming ---------- */

export type HueKey =
  | 'red' | 'orange' | 'amber' | 'yellow' | 'lime' | 'green' | 'teal' | 'cyan'
  | 'sky' | 'blue' | 'indigo' | 'violet' | 'purple' | 'magenta' | 'pink'
  | 'gray' | 'white' | 'black'
export type ToneKey = 'pale' | 'light' | 'vivid' | 'muted' | 'dark' | 'deep'

const HUE_BINS: readonly [number, HueKey][] = [
  [10, 'red'], [38, 'orange'], [50, 'amber'], [64, 'yellow'], [85, 'lime'], [150, 'green'],
  [175, 'teal'], [195, 'cyan'], [210, 'sky'], [240, 'blue'], [255, 'indigo'], [275, 'violet'],
  [295, 'purple'], [322, 'magenta'], [345, 'pink'], [360, 'red'],
]

export function describeColor(hex: string): { hue: HueKey; tone: ToneKey | null } {
  const { h, s, l } = rgbToHsl(hexToRgb(hex))
  if (l >= 96) return { hue: 'white', tone: null }
  if (l <= 7) return { hue: 'black', tone: null }
  if (s < 10) return { hue: 'gray', tone: l > 70 ? 'light' : l < 30 ? 'dark' : null }
  const hue = HUE_BINS.find(([max]) => h < max)?.[1] ?? 'red'
  const tone: ToneKey | null =
    l > 82 ? 'pale' : l > 66 ? 'light' : l < 22 ? 'deep' : l < 36 ? 'dark' : s < 35 ? 'muted' : s > 80 && l >= 40 && l <= 62 ? 'vivid' : null
  return { hue, tone }
}

/* ---------- Formats ---------- */

export const VALUE_FORMATS = ['hex', 'rgb', 'hsl', 'oklch'] as const
export type ValueFormat = (typeof VALUE_FORMATS)[number]

const trim = (value: number, digits: number) => Number(value.toFixed(digits)).toString()

export function formatColor(hex: string, format: ValueFormat): string {
  const rgb = hexToRgb(hex)
  switch (format) {
    case 'hex':
      return rgbToHex(rgb)
    case 'rgb':
      return `rgb(${rgb.r} ${rgb.g} ${rgb.b})`
    case 'hsl': {
      const { h, s, l } = rgbToHsl(rgb)
      return `hsl(${h} ${s}% ${l}%)`
    }
    case 'oklch': {
      const { l, c, h } = rgbToOklch(rgb)
      return `oklch(${trim(l * 100, 1)}% ${trim(c, 3)} ${trim(h, 1)})`
    }
  }
}

export function formatCmyk(hex: string): string {
  const { c, m, y, k } = rgbToCmyk(hexToRgb(hex))
  return `cmyk(${c}% ${m}% ${y}% ${k}%)`
}

/* ---------- Scales ---------- */

export const SCALE_STEPS = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] as const
export type ScaleStep = (typeof SCALE_STEPS)[number]

const SCALE_LIGHTNESS = [0.97, 0.932, 0.882, 0.809, 0.707, 0.623, 0.546, 0.488, 0.424, 0.379, 0.282]
const SCALE_CHROMA = [0.06, 0.13, 0.24, 0.43, 0.67, 0.87, 1, 0.99, 0.81, 0.6, 0.37]

export interface ScaleColor {
  step: ScaleStep
  hex: string
  /** True for the step that holds the source color unchanged. */
  isBase: boolean
}

/** A perceptual 50–950 ramp in OKLCH; the source color replaces its nearest step. */
export function buildScale(hex: string, options: { chroma?: number } = {}): ScaleColor[] {
  const source = rgbToOklch(hexToRgb(hex))
  let nearest = 0
  SCALE_LIGHTNESS.forEach((target, index) => {
    if (Math.abs(target - source.l) < Math.abs(SCALE_LIGHTNESS[nearest] - source.l)) nearest = index
  })
  const peak = options.chroma ?? source.c * Math.min(1 / SCALE_CHROMA[nearest], 1.6)
  return SCALE_STEPS.map((step, index) => {
    const isBase = options.chroma === undefined && index === nearest
    const value = isBase
      ? rgbToHex(hexToRgb(hex))
      : rgbToHex(oklchToRgb({ l: SCALE_LIGHTNESS[index], c: peak * (options.chroma === undefined ? SCALE_CHROMA[index] : 1), h: source.h }))
    return { step, hex: value, isBase }
  })
}

/** Grays tinted toward the given hue, for backgrounds and text in previews. */
export function neutralScale(hex: string): ScaleColor[] {
  return buildScale(hex, { chroma: 0.012 })
}

/* ---------- Contrast ---------- */

export type WcagLevel = 'AAA' | 'AA' | 'AA18' | 'fail'

export function wcagLevel(ratio: number): WcagLevel {
  if (ratio >= 7) return 'AAA'
  if (ratio >= 4.5) return 'AA'
  if (ratio >= 3) return 'AA18'
  return 'fail'
}

export function ratioBetween(a: string, b: string): number {
  return contrastRatio(hexToRgb(a), hexToRgb(b))
}

export const LIGHT_TEXT = '#ffffff'
export const DARK_TEXT = '#0a0a0a'

/** Whichever of near-black or white reads better on the color. */
export function textOn(hex: string): { hex: string; ratio: number } {
  const light = ratioBetween(hex, LIGHT_TEXT)
  const dark = ratioBetween(hex, DARK_TEXT)
  return light >= dark ? { hex: LIGHT_TEXT, ratio: light } : { hex: DARK_TEXT, ratio: dark }
}

export const VISION_MODES: readonly VisionMode[] = ['normal', 'protanopia', 'deuteranopia', 'tritanopia', 'achromatopsia']

export function simulateHex(hex: string, mode: VisionMode): string {
  return rgbToHex(simulateVision(hexToRgb(hex), mode))
}

/** Index pairs that become hard to tell apart under the given vision type. */
export function confusablePairs(hexes: string[], mode: VisionMode, threshold = 0.045): [number, number][] {
  const simulated = hexes.map((hex) => simulateVision(hexToRgb(hex), mode))
  const pairs: [number, number][] = []
  for (let a = 0; a < simulated.length; a += 1) {
    for (let b = a + 1; b < simulated.length; b += 1) {
      if (colorDistance(simulated[a], simulated[b]) < threshold) pairs.push([a, b])
    }
  }
  return pairs
}

/* ---------- Roles and export ---------- */

const ROLE_KEYS = ['primary', 'secondary', 'accent', 'highlight', 'support'] as const

export function roleKey(index: number): string {
  return ROLE_KEYS[index] ?? `color-${index + 1}`
}

export const EXPORT_FORMATS = ['css', 'tailwind4', 'tailwind3', 'scss', 'json', 'tokens', 'svg'] as const
export type ExportFormat = (typeof EXPORT_FORMATS)[number]

export const EXPORT_EXTENSIONS: Record<ExportFormat, string> = {
  css: 'css',
  tailwind4: 'css',
  tailwind3: 'js',
  scss: 'scss',
  json: 'json',
  tokens: 'tokens.json',
  svg: 'svg',
}

export interface ExportOptions {
  format: ExportFormat
  value: ValueFormat
  scales: boolean
}

interface Entry {
  name: string
  base: string
  scale: ScaleColor[]
}

function entriesFor(hexes: string[]): Entry[] {
  return hexes.map((hex, index) => ({ name: roleKey(index), base: hex, scale: buildScale(hex) }))
}

function svgExport(hexes: string[]): string {
  const size = 120
  const rects = hexes
    .map((hex, index) => {
      const x = index * size
      return `  <rect x="${x}" y="0" width="${size}" height="${size}" fill="${hex}"/>\n  <text x="${x + size / 2}" y="${size + 24}" text-anchor="middle" font-family="ui-monospace, monospace" font-size="13" fill="#111">${hex}</text>`
    })
    .join('\n')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${hexes.length * size}" height="${size + 36}" viewBox="0 0 ${hexes.length * size} ${size + 36}">\n  <rect width="100%" height="100%" fill="#fff"/>\n${rects}\n</svg>`
}

export function buildExport(hexes: string[], { format, value, scales }: ExportOptions): string {
  const entries = entriesFor(hexes)
  const v = (hex: string) => formatColor(hex, value)
  const lines = (render: (name: string, hex: string) => string) =>
    entries.flatMap((entry) => [
      render(entry.name, entry.base),
      ...(scales ? entry.scale.map((s) => render(`${entry.name}-${s.step}`, s.hex)) : []),
    ])

  switch (format) {
    case 'css':
      return `:root {\n${lines((name, hex) => `  --color-${name}: ${v(hex)};`).join('\n')}\n}`
    case 'tailwind4':
      return `@theme {\n${lines((name, hex) => `  --color-${name}: ${v(hex)};`).join('\n')}\n}`
    case 'scss':
      return lines((name, hex) => `$${name}: ${v(hex)};`).join('\n')
    case 'tailwind3': {
      const body = entries
        .map((entry) => {
          if (!scales) return `        '${entry.name}': '${v(entry.base)}',`
          const steps = entry.scale.map((s) => `          ${s.step}: '${v(s.hex)}',`).join('\n')
          return `        '${entry.name}': {\n          DEFAULT: '${v(entry.base)}',\n${steps}\n        },`
        })
        .join('\n')
      return `/** @type {import('tailwindcss').Config} */\nexport default {\n  theme: {\n    extend: {\n      colors: {\n${body}\n      },\n    },\n  },\n}`
    }
    case 'json': {
      const data = Object.fromEntries(
        entries.map((entry) => [
          entry.name,
          scales ? { DEFAULT: v(entry.base), ...Object.fromEntries(entry.scale.map((s) => [s.step, v(s.hex)])) } : v(entry.base),
        ]),
      )
      return JSON.stringify(data, null, 2)
    }
    case 'tokens': {
      const token = (hex: string) => ({ $type: 'color', $value: v(hex) })
      const data = {
        color: Object.fromEntries(
          entries.map((entry) => [
            entry.name,
            scales
              ? { base: token(entry.base), ...Object.fromEntries(entry.scale.map((s) => [String(s.step), token(s.hex)])) }
              : token(entry.base),
          ]),
        ),
      }
      return JSON.stringify(data, null, 2)
    }
    case 'svg':
      return svgExport(hexes)
  }
}

/* ---------- Image extraction ---------- */

/** Dominant colors from RGBA pixels via k-means, most common first. */
export function extractPalette(data: Uint8ClampedArray, count: number): string[] {
  const points: [number, number, number][] = []
  for (let i = 0; i + 3 < data.length; i += 4) {
    if (data[i + 3] >= 128) points.push([data[i], data[i + 1], data[i + 2]])
  }
  if (points.length === 0) return []
  const dist = (a: readonly number[], b: readonly number[]) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2

  // Farthest-point seeding keeps results deterministic and spreads seeds across the image.
  const centroids: number[][] = [points[Math.floor(points.length / 2)].slice()]
  while (centroids.length < count) {
    let best = -1
    let bestIndex = 0
    points.forEach((point, index) => {
      const nearest = Math.min(...centroids.map((c) => dist(point, c)))
      if (nearest > best) {
        best = nearest
        bestIndex = index
      }
    })
    if (best <= 0) break
    centroids.push(points[bestIndex].slice())
  }

  let sizes = centroids.map(() => 0)
  for (let iteration = 0; iteration < 10; iteration += 1) {
    const sums = centroids.map(() => [0, 0, 0])
    sizes = centroids.map(() => 0)
    for (const point of points) {
      let nearest = 0
      for (let c = 1; c < centroids.length; c += 1) {
        if (dist(point, centroids[c]) < dist(point, centroids[nearest])) nearest = c
      }
      sums[nearest][0] += point[0]
      sums[nearest][1] += point[1]
      sums[nearest][2] += point[2]
      sizes[nearest] += 1
    }
    centroids.forEach((centroid, c) => {
      if (sizes[c] === 0) return
      centroid[0] = sums[c][0] / sizes[c]
      centroid[1] = sums[c][1] / sizes[c]
      centroid[2] = sums[c][2] / sizes[c]
    })
  }

  return centroids
    .map((centroid, index) => ({ hex: rgbToHex({ r: centroid[0], g: centroid[1], b: centroid[2] }), size: sizes[index] }))
    .filter((cluster) => cluster.size > 0)
    .sort((a, b) => b.size - a.size)
    .map((cluster) => cluster.hex)
}

/* ---------- Persistence ---------- */

export interface SavedPalette {
  id: string
  name: string
  colors: string[]
  createdAt: number
}

const SAVED_KEY = 'palette-generator:saved'
const SESSION_KEY = 'palette-generator:session'

export function loadSaved(): SavedPalette[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]')
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (item): item is SavedPalette =>
        !!item && typeof item.id === 'string' && typeof item.name === 'string' && Array.isArray(item.colors),
    )
  } catch {
    return []
  }
}

export function storeSaved(list: SavedPalette[]): void {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(list))
  } catch {
    // Storage can be full or unavailable; saved palettes simply won't persist.
  }
}

export interface Session {
  base: string
  swatches: Swatch[]
}

export function loadSession(): Session | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') as Session | null
    if (!parsed || !Array.isArray(parsed.swatches)) return null
    const swatches = parsed.swatches.filter((s) => typeof s?.hex === 'string' && normalizeHex(s.hex))
    if (swatches.length < MIN_COLORS || swatches.length > MAX_COLORS) return null
    return {
      base: normalizeHex(parsed.base) ?? swatches[0].hex,
      swatches: swatches.map((s) => ({ id: crypto.randomUUID(), hex: normalizeHex(s.hex)!, locked: !!s.locked })),
    }
  } catch {
    return null
  }
}

export function storeSession(session: Session): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Non-critical; the next visit starts from the default palette.
  }
}
