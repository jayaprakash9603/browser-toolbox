import { defaultTheme, type ApiClientTheme, type ApiClientThemeTokens } from 'postman-lite'

import type { ThemeMode } from '@/features/settings/settingsService'
import { DEFAULT_PALETTE, type PaletteId } from '@/shared/lib/theme/palettes'
import { TOOLBOX_PALETTE_BRANDS, TOOLBOX_SURFACES } from '@/shared/lib/theme/toolboxColors'

const TOOLBOX_THEME_ID = 'browser-toolbox'
const TOOLBOX_RADIUS = '0.625rem'
const TOOLBOX_FONT = "'Inter Variable', Inter, ui-sans-serif, system-ui, 'Segoe UI', sans-serif"

type Scheme = 'light' | 'dark'
type BrandToken = 'primary' | 'primaryForeground' | 'ring'
type ColorToken = Exclude<keyof ApiClientThemeTokens, 'radius' | 'fontFamily'>
type SurfaceTokens = Record<Exclude<ColorToken, BrandToken>, string>
type BrandTokens = Record<BrandToken, string>

// postman-lite writes its tokens onto <html> while it is mounted, so the toolbox colours cannot be
// read back from the page; the shared hex tables must cover every postman-lite colour token.
const SURFACES: Record<Scheme, SurfaceTokens> = TOOLBOX_SURFACES
const BRANDS: Record<PaletteId, Record<Scheme, BrandTokens>> = TOOLBOX_PALETTE_BRANDS

export { TOOLBOX_PALETTE_BRANDS, TOOLBOX_SURFACES }

/** `#38bdf8` → `198.4 93.2% 59.6%`, the channel format postman-lite feeds to `hsl()`. */
export function hexToHslChannels(hex: string): string {
  const digits = hex.replace('#', '')
  const full = digits.length === 3 ? [...digits].map((digit) => digit + digit).join('') : digits
  const [r, g, b] = [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16) / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const lightness = (max + min) / 2
  let hue = 0
  let saturation = 0
  if (max !== min) {
    const delta = max - min
    saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min)
    if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0)
    else if (max === g) hue = (b - r) / delta + 2
    else hue = (r - g) / delta + 4
    hue *= 60
  }
  const round = (value: number) => Math.round(value * 10) / 10
  return `${round(hue)} ${round(saturation * 100)}% ${round(lightness * 100)}%`
}

function toolboxTokens(scheme: Scheme, palette: PaletteId): ApiClientThemeTokens {
  const colors = { ...SURFACES[scheme], ...BRANDS[palette][scheme] }
  const channels = Object.fromEntries(
    Object.entries(colors).map(([token, hex]) => [token, hexToHslChannels(hex)]),
  ) as Record<ColorToken, string>
  return { ...defaultTheme[scheme], ...channels, radius: TOOLBOX_RADIUS, fontFamily: TOOLBOX_FONT }
}

export function buildApiClientTheme(
  themeMode: ThemeMode,
  palette: PaletteId = DEFAULT_PALETTE,
): ApiClientTheme {
  return {
    ...defaultTheme,
    id: TOOLBOX_THEME_ID,
    mode: themeMode,
    light: toolboxTokens('light', palette),
    dark: toolboxTokens('dark', palette),
  }
}

export { TOOLBOX_THEME_ID }
