import { PALETTES, type PaletteId } from '@/shared/lib/theme/palettes'

export type ColorScheme = 'light' | 'dark'

export interface ToolboxSurface {
  background: string
  foreground: string
  card: string
  cardForeground: string
  popover: string
  popoverForeground: string
  secondary: string
  secondaryForeground: string
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  destructive: string
  destructiveForeground: string
  border: string
  input: string
}

export interface ToolboxBrand {
  primary: string
  primaryForeground: string
  ring: string
}

// Hex copies of `src/styles/tokens.css` for surfaces that cannot read the toolbox stylesheet
// (postman-lite, pages the background injects into). tests/api-client-theme.test.ts fails when
// the two drift apart.
export const TOOLBOX_SURFACES: Record<ColorScheme, ToolboxSurface> = {
  light: {
    background: '#f7f9fc',
    foreground: '#111827',
    card: '#ffffff',
    cardForeground: '#111827',
    popover: '#ffffff',
    popoverForeground: '#111827',
    secondary: '#eef2f7',
    secondaryForeground: '#1e293b',
    muted: '#eef2f7',
    mutedForeground: '#64748b',
    accent: '#e8edf5',
    accentForeground: '#111827',
    destructive: '#dc2626',
    destructiveForeground: '#ffffff',
    border: '#e2e8f0',
    input: '#cbd5e1',
  },
  dark: {
    background: '#0a0a0a',
    foreground: '#f8fafc',
    card: '#1c2022',
    cardForeground: '#f8fafc',
    popover: '#1c2022',
    popoverForeground: '#f8fafc',
    secondary: '#1c2022',
    secondaryForeground: '#f8fafc',
    muted: '#1c2022',
    mutedForeground: '#a1a1aa',
    accent: '#2a3133',
    accentForeground: '#f8fafc',
    destructive: '#f87171',
    destructiveForeground: '#0a0a0a',
    border: '#2a3133',
    input: '#1c2022',
  },
}

export const TOOLBOX_PALETTE_BRANDS = Object.fromEntries(
  PALETTES.map(({ id, swatches, light, dark }) => {
    const primary = swatches[0].toLowerCase()
    return [
      id,
      {
        light: { primary, primaryForeground: light.primaryForeground, ring: primary },
        dark: { primary: dark.primary, primaryForeground: dark.primaryForeground, ring: dark.primary },
      },
    ]
  }),
) as Record<PaletteId, Record<ColorScheme, ToolboxBrand>>
