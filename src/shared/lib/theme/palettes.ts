export type PaletteId = 'indigo' | 'coral' | 'ocean' | 'emerald' | 'sunset' | 'graphite'

/** Light brand mark: white window on a palette gradient. Must match `public/icons/themes/<id>/`. */
export interface PaletteLogo {
  from: string
  via: string
  to: string
  accent: string
}

/** Dark brand mark: palette-tinted window on a near-black interior. Must match `public/icons/themes/<id>/dark/`. */
export interface PaletteLogoDark {
  from: string
  to: string
  accent: string
}

export interface PaletteDefinition {
  id: PaletteId
  labelKey: string
  swatches: [string, string, string]
  logo: PaletteLogo
  logoDark: PaletteLogoDark
}

export const LOGO_DARK_BASE = '#0b0f17'

export const PALETTES: PaletteDefinition[] = [
  {
    id: 'indigo',
    labelKey: 'settings.palette.indigo',
    swatches: ['#4F46E5', '#6366F1', '#8B5CF6'],
    logo: { from: '#3730a3', via: '#4f46e5', to: '#8b5cf6', accent: '#f59e0b' },
    logoDark: { from: '#818cf8', to: '#c4b5fd', accent: '#fbbf24' },
  },
  {
    id: 'coral',
    labelKey: 'settings.palette.coral',
    swatches: ['#E85D4C', '#F18164', '#F7B9A9'],
    logo: { from: '#b83a2c', via: '#e85d4c', to: '#f59a7f', accent: '#fde68a' },
    logoDark: { from: '#f18164', to: '#fbc4b4', accent: '#fde68a' },
  },
  {
    id: 'ocean',
    labelKey: 'settings.palette.ocean',
    swatches: ['#0284C7', '#0EA5E9', '#38BDF8'],
    logo: { from: '#075985', via: '#0284c7', to: '#38bdf8', accent: '#f97316' },
    logoDark: { from: '#38bdf8', to: '#a5e3fd', accent: '#fb923c' },
  },
  {
    id: 'emerald',
    labelKey: 'settings.palette.emerald',
    swatches: ['#059669', '#10B981', '#34D399'],
    logo: { from: '#065f46', via: '#059669', to: '#34d399', accent: '#fbbf24' },
    logoDark: { from: '#34d399', to: '#a7f3d0', accent: '#fbbf24' },
  },
  {
    id: 'sunset',
    labelKey: 'settings.palette.sunset',
    swatches: ['#EA580C', '#F97316', '#FB923C'],
    logo: { from: '#c2410c', via: '#ea580c', to: '#fb923c', accent: '#fef08a' },
    logoDark: { from: '#fb923c', to: '#fed7aa', accent: '#fef08a' },
  },
  {
    id: 'graphite',
    labelKey: 'settings.palette.graphite',
    swatches: ['#475569', '#64748B', '#94A3B8'],
    logo: { from: '#1e293b', via: '#475569', to: '#94a3b8', accent: '#f97316' },
    logoDark: { from: '#94a3b8', to: '#e2e8f0', accent: '#fb923c' },
  },
]

export const DEFAULT_PALETTE: PaletteId = 'indigo'

export function isPaletteId(value: string): value is PaletteId {
  return PALETTES.some((palette) => palette.id === value)
}

export function getPalette(id: PaletteId): PaletteDefinition {
  return PALETTES.find((palette) => palette.id === id) ?? PALETTES[0]
}

/** Toolbar icon set for a palette, relative to the extension root (as `chrome.action.setIcon` expects). */
export function paletteIconPaths(id: PaletteId, dark = false): Record<'16' | '32' | '48' | '128', string> {
  const dir = `icons/themes/${id}${dark ? '/dark' : ''}`
  return { 16: `${dir}/icon16.png`, 32: `${dir}/icon32.png`, 48: `${dir}/icon48.png`, 128: `${dir}/icon128.png` }
}
