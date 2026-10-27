export const PALETTE_IDS = [
  'berry', 'pink', 'blush', 'rose', 'ruby', 'crimson', 'coral',
  'terracotta', 'copper', 'tangerine', 'sunset', 'amber', 'honey', 'mustard',
  'olive', 'lime', 'forest', 'pine', 'emerald', 'sage', 'teal',
  'cyan', 'arctic', 'ocean', 'azure', 'sapphire', 'midnight',
  'indigo', 'violet', 'lavender', 'amethyst', 'grape', 'orchid', 'plum',
  'graphite', 'ink', 'charcoal', 'stone', 'mocha',
] as const

export type PaletteId = (typeof PALETTE_IDS)[number]

export const PALETTE_FAMILIES = ['red', 'orange', 'green', 'blue', 'purple', 'neutral'] as const
export type PaletteFamily = (typeof PALETTE_FAMILIES)[number]

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

/**
 * Everything one palette paints. `scripts/generate-palettes.mjs` writes the `[data-palette]` blocks
 * in `src/styles/tokens.css` and the toolbar icons from these values; rerun it after editing.
 */
export interface PaletteDefinition {
  id: PaletteId
  labelKey: string
  family: PaletteFamily
  /** Primary, secondary brand and accent brand colors in light mode. */
  swatches: [string, string, string]
  light: {
    primaryForeground: string
    hero: [string, string, string]
    tiles: [string, string, string, string]
  }
  dark: { primary: string; primaryForeground: string }
  logo: PaletteLogo
  logoDark: PaletteLogoDark
}

export const LOGO_DARK_BASE = '#0b0f17'

interface PaletteSpec {
  swatches: [string, string, string]
  /** Deep shade that starts the hero gradient and the logo. */
  deep: string
  /** Fourth tile color, a neighbouring hue. */
  tile: string
  /** Dark mode primary, its foreground, and a pale tint that ends the dark logo gradient. */
  dark: [string, string, string]
  /** Logo status-dot color on light and dark marks. */
  accent: [string, string]
}

function define(id: PaletteId, family: PaletteFamily, spec: PaletteSpec): PaletteDefinition {
  const [primary, , accent] = spec.swatches
  return {
    id,
    labelKey: `settings.palette.${id}`,
    family,
    swatches: spec.swatches,
    light: { primaryForeground: '#ffffff', hero: [spec.deep, primary, accent], tiles: [...spec.swatches, spec.tile] },
    dark: { primary: spec.dark[0], primaryForeground: spec.dark[1] },
    logo: { from: spec.deep, via: primary, to: accent, accent: spec.accent[0] },
    logoDark: { from: spec.dark[0], to: spec.dark[2], accent: spec.accent[1] },
  }
}

const ORIGINAL: PaletteDefinition[] = [
  {
    id: 'indigo',
    labelKey: 'settings.palette.indigo',
    family: 'purple',
    swatches: ['#4F46E5', '#6366F1', '#8B5CF6'],
    light: { primaryForeground: '#ffffff', hero: ['#4f46e5', '#6366f1', '#8b5cf6'], tiles: ['#4f46e5', '#6366f1', '#8b5cf6', '#0ea5e9'] },
    dark: { primary: '#818cf8', primaryForeground: '#0b1120' },
    logo: { from: '#3730a3', via: '#4f46e5', to: '#8b5cf6', accent: '#f59e0b' },
    logoDark: { from: '#818cf8', to: '#c4b5fd', accent: '#fbbf24' },
  },
  {
    id: 'coral',
    labelKey: 'settings.palette.coral',
    family: 'red',
    swatches: ['#E85D4C', '#F18164', '#F7B9A9'],
    light: { primaryForeground: '#ffffff', hero: ['#e85d4c', '#f18164', '#f7b9a9'], tiles: ['#e85d4c', '#f18164', '#ea580c', '#f59e0b'] },
    dark: { primary: '#f18164', primaryForeground: '#21120d' },
    logo: { from: '#b83a2c', via: '#e85d4c', to: '#f59a7f', accent: '#fde68a' },
    logoDark: { from: '#f18164', to: '#fbc4b4', accent: '#fde68a' },
  },
  {
    id: 'ocean',
    labelKey: 'settings.palette.ocean',
    family: 'blue',
    swatches: ['#0284C7', '#0EA5E9', '#38BDF8'],
    light: { primaryForeground: '#ffffff', hero: ['#0369a1', '#0284c7', '#38bdf8'], tiles: ['#0284c7', '#0ea5e9', '#38bdf8', '#06b6d4'] },
    dark: { primary: '#38bdf8', primaryForeground: '#0c4a6e' },
    logo: { from: '#075985', via: '#0284c7', to: '#38bdf8', accent: '#f97316' },
    logoDark: { from: '#38bdf8', to: '#a5e3fd', accent: '#fb923c' },
  },
  {
    id: 'emerald',
    labelKey: 'settings.palette.emerald',
    family: 'green',
    swatches: ['#059669', '#10B981', '#34D399'],
    light: { primaryForeground: '#ffffff', hero: ['#047857', '#059669', '#34d399'], tiles: ['#059669', '#10b981', '#34d399', '#14b8a6'] },
    dark: { primary: '#34d399', primaryForeground: '#064e3b' },
    logo: { from: '#065f46', via: '#059669', to: '#34d399', accent: '#fbbf24' },
    logoDark: { from: '#34d399', to: '#a7f3d0', accent: '#fbbf24' },
  },
  {
    id: 'sunset',
    labelKey: 'settings.palette.sunset',
    family: 'orange',
    swatches: ['#EA580C', '#F97316', '#FB923C'],
    light: { primaryForeground: '#ffffff', hero: ['#c2410c', '#ea580c', '#fb923c'], tiles: ['#ea580c', '#f97316', '#fb923c', '#f59e0b'] },
    dark: { primary: '#fb923c', primaryForeground: '#431407' },
    logo: { from: '#c2410c', via: '#ea580c', to: '#fb923c', accent: '#fef08a' },
    logoDark: { from: '#fb923c', to: '#fed7aa', accent: '#fef08a' },
  },
  {
    id: 'graphite',
    labelKey: 'settings.palette.graphite',
    family: 'neutral',
    swatches: ['#475569', '#64748B', '#94A3B8'],
    light: { primaryForeground: '#ffffff', hero: ['#334155', '#475569', '#64748b'], tiles: ['#475569', '#64748b', '#94a3b8', '#cbd5e1'] },
    dark: { primary: '#94a3b8', primaryForeground: '#0f172a' },
    logo: { from: '#1e293b', via: '#475569', to: '#94a3b8', accent: '#f97316' },
    logoDark: { from: '#94a3b8', to: '#e2e8f0', accent: '#fb923c' },
  },
]

// Light primaries keep at least 4.5:1 against white text; dark primaries pair with a deep foreground.
const ADDED: PaletteDefinition[] = [
  define('berry', 'red', { swatches: ['#a3195b', '#c2185b', '#ec4899'], deep: '#701a43', tile: '#8b5cf6', dark: ['#f9a8d4', '#500724', '#fce7f3'], accent: ['#fbbf24', '#fde68a'] }),
  define('pink', 'red', { swatches: ['#be185d', '#db2777', '#f472b6'], deep: '#831843', tile: '#a855f7', dark: ['#f472b6', '#500724', '#fbcfe8'], accent: ['#fde047', '#fef08a'] }),
  define('blush', 'red', { swatches: ['#c2416b', '#e0738f', '#f4b4c4'], deep: '#8e2a4b', tile: '#f59e0b', dark: ['#f4a3b8', '#3d0f1e', '#fde2ea'], accent: ['#fcd34d', '#fde68a'] }),
  define('rose', 'red', { swatches: ['#e11d48', '#f43f5e', '#fb7185'], deep: '#9f1239', tile: '#f97316', dark: ['#fb7185', '#4c0519', '#fecdd3'], accent: ['#fde68a', '#fde68a'] }),
  define('ruby', 'red', { swatches: ['#dc2626', '#ef4444', '#f87171'], deep: '#991b1b', tile: '#f97316', dark: ['#f87171', '#450a0a', '#fecaca'], accent: ['#fde047', '#fef08a'] }),
  define('crimson', 'red', { swatches: ['#b91c1c', '#be123c', '#f43f5e'], deep: '#7f1d1d', tile: '#f59e0b', dark: ['#fca5a5', '#450a0a', '#ffe4e6'], accent: ['#fbbf24', '#fde68a'] }),
  define('terracotta', 'orange', { swatches: ['#b8492f', '#d9694c', '#eda48e'], deep: '#7f2f1d', tile: '#e0a24a', dark: ['#f0977c', '#2d0f08', '#fbd5c8'], accent: ['#fde68a', '#fde68a'] }),
  define('copper', 'orange', { swatches: ['#b45a32', '#cd7a4f', '#e6a57e'], deep: '#7a3a1f', tile: '#d4a017', dark: ['#e8a27a', '#2b1309', '#f7d9c4'], accent: ['#fde68a', '#fde68a'] }),
  define('tangerine', 'orange', { swatches: ['#c2410c', '#ea580c', '#fb923c'], deep: '#7c2d12', tile: '#f43f5e', dark: ['#fdba74', '#431407', '#ffedd5'], accent: ['#fde047', '#fef08a'] }),
  define('amber', 'orange', { swatches: ['#b45309', '#d97706', '#f59e0b'], deep: '#78350f', tile: '#ef4444', dark: ['#fbbf24', '#451a03', '#fde68a'], accent: ['#fecaca', '#fca5a5'] }),
  define('honey', 'orange', { swatches: ['#a16207', '#ca8a04', '#eab308'], deep: '#713f12', tile: '#f97316', dark: ['#facc15', '#422006', '#fef08a'], accent: ['#fb7185', '#fda4af'] }),
  define('mustard', 'orange', { swatches: ['#8a6d0b', '#b58f14', '#e0b93a'], deep: '#5c4808', tile: '#65a30d', dark: ['#e9c64a', '#2a2004', '#f8eab0'], accent: ['#f87171', '#fca5a5'] }),
  define('olive', 'green', { swatches: ['#5c6b1e', '#7d8f2b', '#b5c25a'], deep: '#3b4512', tile: '#ca8a04', dark: ['#c3d06a', '#1f2507', '#e9efb8'], accent: ['#f97316', '#fdba74'] }),
  define('lime', 'green', { swatches: ['#4d7c0f', '#65a30d', '#a3e635'], deep: '#365314', tile: '#10b981', dark: ['#a3e635', '#1a2e05', '#d9f99d'], accent: ['#f97316', '#fdba74'] }),
  define('forest', 'green', { swatches: ['#15803d', '#16a34a', '#4ade80'], deep: '#14532d', tile: '#84cc16', dark: ['#4ade80', '#052e16', '#bbf7d0'], accent: ['#fbbf24', '#fde68a'] }),
  define('pine', 'green', { swatches: ['#166534', '#15803d', '#22c55e'], deep: '#052e16', tile: '#0d9488', dark: ['#86efac', '#052e16', '#dcfce7'], accent: ['#facc15', '#fde047'] }),
  define('sage', 'green', { swatches: ['#4f7a5e', '#6b9a7b', '#a7c4b1'], deep: '#2f4d3a', tile: '#84a98c', dark: ['#9cc5a9', '#10241a', '#d8ebdf'], accent: ['#f4a261', '#f6bd8a'] }),
  define('teal', 'green', { swatches: ['#0f766e', '#0d9488', '#2dd4bf'], deep: '#134e4a', tile: '#06b6d4', dark: ['#2dd4bf', '#042f2e', '#99f6e4'], accent: ['#fb923c', '#fdba74'] }),
  define('cyan', 'blue', { swatches: ['#0e7490', '#0891b2', '#22d3ee'], deep: '#155e75', tile: '#14b8a6', dark: ['#22d3ee', '#083344', '#a5f3fc'], accent: ['#f97316', '#fb923c'] }),
  define('arctic', 'blue', { swatches: ['#0369a1', '#0ea5e9', '#7dd3fc'], deep: '#0c4a6e', tile: '#6366f1', dark: ['#7dd3fc', '#082f49', '#e0f2fe'], accent: ['#f472b6', '#f9a8d4'] }),
  define('azure', 'blue', { swatches: ['#2563eb', '#3b82f6', '#60a5fa'], deep: '#1e40af', tile: '#06b6d4', dark: ['#60a5fa', '#0b1a3a', '#bfdbfe'], accent: ['#f59e0b', '#fbbf24'] }),
  define('sapphire', 'blue', { swatches: ['#1d4ed8', '#2563eb', '#6366f1'], deep: '#1e3a8a', tile: '#0ea5e9', dark: ['#93c5fd', '#172554', '#dbeafe'], accent: ['#facc15', '#fde047'] }),
  define('midnight', 'blue', { swatches: ['#1e3a8a', '#3730a3', '#6366f1'], deep: '#172554', tile: '#0ea5e9', dark: ['#a5b4fc', '#1e1b4b', '#e0e7ff'], accent: ['#fbbf24', '#fde68a'] }),
  define('violet', 'purple', { swatches: ['#7c3aed', '#8b5cf6', '#a78bfa'], deep: '#5b21b6', tile: '#ec4899', dark: ['#a78bfa', '#1e1035', '#ddd6fe'], accent: ['#fbbf24', '#fde68a'] }),
  define('lavender', 'purple', { swatches: ['#6d5bd0', '#8b7cf6', '#c4b5fd'], deep: '#4c3d9e', tile: '#f0abfc', dark: ['#b4a9fb', '#1f1a3d', '#ede9fe'], accent: ['#f9a8d4', '#fbcfe8'] }),
  define('amethyst', 'purple', { swatches: ['#9333ea', '#a855f7', '#c084fc'], deep: '#6b21a8', tile: '#6366f1', dark: ['#c084fc', '#2e1065', '#e9d5ff'], accent: ['#22d3ee', '#67e8f9'] }),
  define('grape', 'purple', { swatches: ['#6d28d9', '#7e22ce', '#c026d3'], deep: '#4c1d95', tile: '#f43f5e', dark: ['#c4b5fd', '#2e1065', '#f5d0fe'], accent: ['#fbbf24', '#fde68a'] }),
  define('orchid', 'purple', { swatches: ['#c026d3', '#d946ef', '#e879f9'], deep: '#86198f', tile: '#8b5cf6', dark: ['#e879f9', '#3b0764', '#f5d0fe'], accent: ['#facc15', '#fde047'] }),
  define('plum', 'purple', { swatches: ['#86198f', '#a21caf', '#d946ef'], deep: '#4a044e', tile: '#f43f5e', dark: ['#f0abfc', '#4a044e', '#fae8ff'], accent: ['#fcd34d', '#fde68a'] }),
  define('ink', 'neutral', { swatches: ['#1f2a44', '#2f3e63', '#5b6b94'], deep: '#0f172a', tile: '#64748b', dark: ['#a3b1d6', '#0f172a', '#e2e8f0'], accent: ['#22d3ee', '#67e8f9'] }),
  define('charcoal', 'neutral', { swatches: ['#27272a', '#3f3f46', '#71717a'], deep: '#09090b', tile: '#a1a1aa', dark: ['#d4d4d8', '#18181b', '#f4f4f5'], accent: ['#f97316', '#fb923c'] }),
  define('stone', 'neutral', { swatches: ['#57534e', '#78716c', '#a8a29e'], deep: '#292524', tile: '#d6d3d1', dark: ['#d6d3d1', '#1c1917', '#f5f5f4'], accent: ['#f59e0b', '#fbbf24'] }),
  define('mocha', 'neutral', { swatches: ['#6f4e37', '#8b6b4f', '#c0a080'], deep: '#3f2a1d', tile: '#d6a76c', dark: ['#d2b48c', '#2a1b11', '#efe1cf'], accent: ['#fbbf24', '#fde68a'] }),
]

const BY_ID = new Map<PaletteId, PaletteDefinition>([...ORIGINAL, ...ADDED].map((palette) => [palette.id, palette]))

/** Every palette in hue order (reds through neutrals), as the picker shows them. */
export const PALETTES: PaletteDefinition[] = PALETTE_IDS.map((id) => BY_ID.get(id)!)

export const DEFAULT_PALETTE: PaletteId = 'indigo'

export function isPaletteId(value: string): value is PaletteId {
  return BY_ID.has(value as PaletteId)
}

export function getPalette(id: PaletteId): PaletteDefinition {
  return BY_ID.get(id) ?? BY_ID.get(DEFAULT_PALETTE)!
}

/** Toolbar icon set for a palette, relative to the extension root (as `chrome.action.setIcon` expects). */
export function paletteIconPaths(id: PaletteId, dark = false): Record<'16' | '32' | '48' | '128', string> {
  const dir = `icons/themes/${id}${dark ? '/dark' : ''}`
  return { 16: `${dir}/icon16.png`, 32: `${dir}/icon32.png`, 48: `${dir}/icon48.png`, 128: `${dir}/icon128.png` }
}
