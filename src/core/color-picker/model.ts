import {
  rgbToCmyk,
  rgbToHex,
  rgbToHsl,
  rgbToHsv,
  rgbToHwb,
  rgbToOklch,
  parseColor,
  type Rgb,
} from '@/core/engines/color'

export const COLOR_PICKER_KEY = 'colorPicker'
export const COLOR_PICKER_TOOL_ID = 'design.color-picker'
export const COLOR_PICKER_ROUTE = '/tools/design/color-picker'
export const COLOR_PICKER_HISTORY_LIMIT = 36

export const COLOR_FORMATS = ['hex', 'rgb', 'hsl', 'hsv', 'hwb', 'cmyk', 'oklch'] as const
export type ColorFormat = (typeof COLOR_FORMATS)[number]

/** Formats the on-page picker can cycle through; the rest are available in the panel. */
export const PAGE_COLOR_FORMATS = ['hex', 'rgb', 'hsl'] as const
export type PageColorFormat = (typeof PAGE_COLOR_FORMATS)[number]

export interface PickedColor {
  hex: string
  at: number
  /** Page the color came from, when it was picked on a page. */
  url?: string
}

export interface ColorPickerState {
  format: ColorFormat
  history: PickedColor[]
}

export const DEFAULT_COLOR_PICKER_STATE: ColorPickerState = { format: 'hex', history: [] }

export function formatColor(rgb: Rgb, format: ColorFormat): string {
  switch (format) {
    case 'rgb':
      return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
    case 'hsl': {
      const { h, s, l } = rgbToHsl(rgb)
      return `hsl(${h}, ${s}%, ${l}%)`
    }
    case 'hsv': {
      const { h, s, v } = rgbToHsv(rgb)
      return `hsv(${h}, ${s}%, ${v}%)`
    }
    case 'hwb': {
      const { h, w, b } = rgbToHwb(rgb)
      return `hwb(${h} ${w}% ${b}%)`
    }
    case 'cmyk': {
      const { c, m, y, k } = rgbToCmyk(rgb)
      return `cmyk(${c}%, ${m}%, ${y}%, ${k}%)`
    }
    case 'oklch': {
      const { l, c, h } = rgbToOklch(rgb)
      return `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})`
    }
    default:
      return rgbToHex(rgb)
  }
}

export function isColorFormat(value: unknown): value is ColorFormat {
  return typeof value === 'string' && (COLOR_FORMATS as readonly string[]).includes(value)
}

/** The page picker only cycles a few formats; anything else falls back to HEX there. */
export function pageFormatFor(format: ColorFormat): PageColorFormat {
  return (PAGE_COLOR_FORMATS as readonly string[]).includes(format) ? (format as PageColorFormat) : 'hex'
}

export function normalizeHex(value: string): string | null {
  const parsed = parseColor(value)
  return parsed.ok ? rgbToHex(parsed.value) : null
}

/** Newest first; re-picking a color moves it to the front instead of duplicating it. */
export function addPickedColor(
  history: PickedColor[],
  hex: string,
  at: number,
  url?: string,
  limit = COLOR_PICKER_HISTORY_LIMIT,
): PickedColor[] {
  const normalized = normalizeHex(hex)
  if (!normalized) return history
  const entry: PickedColor = { hex: normalized, at, ...(url ? { url } : {}) }
  return [entry, ...history.filter((item) => item.hex !== normalized)].slice(0, limit)
}

export function normalizeColorPickerState(raw: unknown): ColorPickerState {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_COLOR_PICKER_STATE, history: [] }
  const source = raw as Partial<ColorPickerState>
  const history = Array.isArray(source.history)
    ? source.history
        .map((item): PickedColor | null => {
          if (!item || typeof item !== 'object') return null
          const hex = normalizeHex(String((item as PickedColor).hex ?? ''))
          if (!hex) return null
          const at = Number((item as PickedColor).at)
          const url = (item as PickedColor).url
          return { hex, at: Number.isFinite(at) ? at : 0, ...(typeof url === 'string' && url ? { url } : {}) }
        })
        .filter((item): item is PickedColor => item !== null)
        .slice(0, COLOR_PICKER_HISTORY_LIMIT)
    : []
  return { format: isColorFormat(source.format) ? source.format : 'hex', history }
}

/** Lightness steps of a color in OKLCH, darkest to lightest, for the shades strip. */
export const SHADE_LIGHTNESS = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.96] as const
