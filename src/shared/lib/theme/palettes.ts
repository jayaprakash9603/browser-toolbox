export type PaletteId = 'indigo' | 'coral' | 'ocean' | 'emerald' | 'sunset' | 'graphite'

export interface PaletteDefinition {
  id: PaletteId
  labelKey: string
  swatches: [string, string, string]
}

export const PALETTES: PaletteDefinition[] = [
  {
    id: 'indigo',
    labelKey: 'settings.palette.indigo',
    swatches: ['#4F46E5', '#6366F1', '#8B5CF6'],
  },
  {
    id: 'coral',
    labelKey: 'settings.palette.coral',
    swatches: ['#E85D4C', '#F18164', '#F7B9A9'],
  },
  {
    id: 'ocean',
    labelKey: 'settings.palette.ocean',
    swatches: ['#0284C7', '#0EA5E9', '#38BDF8'],
  },
  {
    id: 'emerald',
    labelKey: 'settings.palette.emerald',
    swatches: ['#059669', '#10B981', '#34D399'],
  },
  {
    id: 'sunset',
    labelKey: 'settings.palette.sunset',
    swatches: ['#EA580C', '#F97316', '#FB923C'],
  },
  {
    id: 'graphite',
    labelKey: 'settings.palette.graphite',
    swatches: ['#475569', '#64748B', '#94A3B8'],
  },
]

export const DEFAULT_PALETTE: PaletteId = 'indigo'

export function isPaletteId(value: string): value is PaletteId {
  return PALETTES.some((palette) => palette.id === value)
}
