export type PaletteId = 'indigo' | 'coral' | 'ocean' | 'emerald' | 'sunset' | 'graphite'

/** Brand-mark colours; must match the PNGs in `public/icons/themes/<id>/`. */
export interface PaletteLogo {
  from: string
  via: string
  to: string
  accent: string
}

export interface PaletteDefinition {
  id: PaletteId
  labelKey: string
  swatches: [string, string, string]
  logo: PaletteLogo
}

export const PALETTES: PaletteDefinition[] = [
  {
    id: 'indigo',
    labelKey: 'settings.palette.indigo',
    swatches: ['#4F46E5', '#6366F1', '#8B5CF6'],
    logo: { from: '#3730a3', via: '#4f46e5', to: '#8b5cf6', accent: '#f59e0b' },
  },
  {
    id: 'coral',
    labelKey: 'settings.palette.coral',
    swatches: ['#E85D4C', '#F18164', '#F7B9A9'],
    logo: { from: '#b83a2c', via: '#e85d4c', to: '#f59a7f', accent: '#fde68a' },
  },
  {
    id: 'ocean',
    labelKey: 'settings.palette.ocean',
    swatches: ['#0284C7', '#0EA5E9', '#38BDF8'],
    logo: { from: '#075985', via: '#0284c7', to: '#38bdf8', accent: '#f97316' },
  },
  {
    id: 'emerald',
    labelKey: 'settings.palette.emerald',
    swatches: ['#059669', '#10B981', '#34D399'],
    logo: { from: '#065f46', via: '#059669', to: '#34d399', accent: '#fbbf24' },
  },
  {
    id: 'sunset',
    labelKey: 'settings.palette.sunset',
    swatches: ['#EA580C', '#F97316', '#FB923C'],
    logo: { from: '#c2410c', via: '#ea580c', to: '#fb923c', accent: '#fef08a' },
  },
  {
    id: 'graphite',
    labelKey: 'settings.palette.graphite',
    swatches: ['#475569', '#64748B', '#94A3B8'],
    logo: { from: '#1e293b', via: '#475569', to: '#94a3b8', accent: '#f97316' },
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
export function paletteIconPaths(id: PaletteId): Record<'16' | '32' | '48' | '128', string> {
  const dir = `icons/themes/${id}`
  return { 16: `${dir}/icon16.png`, 32: `${dir}/icon32.png`, 48: `${dir}/icon48.png`, 128: `${dir}/icon128.png` }
}
