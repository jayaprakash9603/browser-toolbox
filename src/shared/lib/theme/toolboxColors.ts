import type { PaletteId } from '@/shared/lib/theme/palettes'

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

export const TOOLBOX_PALETTE_BRANDS: Record<PaletteId, Record<ColorScheme, ToolboxBrand>> = {
  indigo: {
    light: { primary: '#4f46e5', primaryForeground: '#ffffff', ring: '#4f46e5' },
    dark: { primary: '#818cf8', primaryForeground: '#0b1120', ring: '#818cf8' },
  },
  coral: {
    light: { primary: '#e85d4c', primaryForeground: '#ffffff', ring: '#e85d4c' },
    dark: { primary: '#f18164', primaryForeground: '#21120d', ring: '#f18164' },
  },
  ocean: {
    light: { primary: '#0284c7', primaryForeground: '#ffffff', ring: '#0284c7' },
    dark: { primary: '#38bdf8', primaryForeground: '#0c4a6e', ring: '#38bdf8' },
  },
  emerald: {
    light: { primary: '#059669', primaryForeground: '#ffffff', ring: '#059669' },
    dark: { primary: '#34d399', primaryForeground: '#064e3b', ring: '#34d399' },
  },
  sunset: {
    light: { primary: '#ea580c', primaryForeground: '#ffffff', ring: '#ea580c' },
    dark: { primary: '#fb923c', primaryForeground: '#431407', ring: '#fb923c' },
  },
  graphite: {
    light: { primary: '#475569', primaryForeground: '#ffffff', ring: '#475569' },
    dark: { primary: '#94a3b8', primaryForeground: '#0f172a', ring: '#94a3b8' },
  },
}
