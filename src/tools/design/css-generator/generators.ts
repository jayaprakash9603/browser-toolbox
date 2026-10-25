export type Decl = readonly [property: string, value: string]

export interface CssResult {
  decls: Decl[]
  /** Extra top-level CSS the declarations depend on, such as `@keyframes`. */
  extra?: string
}

export const GENERATOR_IDS = [
  'gradient',
  'shadow',
  'text-shadow',
  'radius',
  'border',
  'glass',
  'filter',
  'transform',
  'clip-path',
  'animation',
  'flexbox',
  'grid',
] as const

export type GeneratorId = (typeof GENERATOR_IDS)[number]

export interface Preset<S> {
  id: string
  patch: Partial<S>
}

let idSeed = 0
export function uid(): string {
  idSeed += 1
  return `l${Date.now().toString(36)}${idSeed}`
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max)
const round = (value: number, digits = 2) => Number(value.toFixed(digits))

export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{6}$/i.test(value.trim())
}

/** `#rrggbb` plus an opacity percentage, as hex when opaque and `rgba()` otherwise. */
export function colorWithOpacity(hex: string, opacity = 100): string {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match) return hex
  const alpha = round(clamp(opacity, 0, 100) / 100)
  if (alpha >= 1) return `#${match[1].toLowerCase()}`
  const n = Number.parseInt(match[1], 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}

// ---------------------------------------------------------------------------
// Gradient

export interface GradientStop {
  id: string
  color: string
  position: number
  opacity: number
}

export interface GradientState {
  kind: 'linear' | 'radial' | 'conic'
  angle: number
  shape: 'circle' | 'ellipse'
  x: number
  y: number
  repeating: boolean
  target: 'background' | 'text'
  stops: GradientStop[]
}

const stops = (...entries: [string, number, number?][]): GradientStop[] =>
  entries.map(([color, position, opacity = 100], index) => ({ id: `s${index}`, color, position, opacity }))

export const gradientDefaults: GradientState = {
  kind: 'linear',
  angle: 135,
  shape: 'circle',
  x: 50,
  y: 50,
  repeating: false,
  target: 'background',
  stops: stops(['#6366f1', 0], ['#ec4899', 100]),
}

export function gradientValue(state: GradientState): string {
  const list = [...state.stops]
    .sort((a, b) => a.position - b.position)
    .map((stop) => `${colorWithOpacity(stop.color, stop.opacity)} ${stop.position}%`)
    .join(', ')
  const prefix = state.repeating ? 'repeating-' : ''
  const at = `at ${state.x}% ${state.y}%`
  if (state.kind === 'radial') return `${prefix}radial-gradient(${state.shape} ${at}, ${list})`
  if (state.kind === 'conic') return `${prefix}conic-gradient(from ${state.angle}deg ${at}, ${list})`
  return `${prefix}linear-gradient(${state.angle}deg, ${list})`
}

export function buildGradient(state: GradientState): CssResult {
  const value = gradientValue(state)
  if (state.target === 'text') {
    return {
      decls: [
        ['background', value],
        ['-webkit-background-clip', 'text'],
        ['background-clip', 'text'],
        ['color', 'transparent'],
      ],
    }
  }
  return { decls: [['background', value]] }
}

export const gradientPresets: Preset<GradientState>[] = [
  { id: 'indigo', patch: { ...gradientDefaults } },
  { id: 'sunset', patch: { kind: 'linear', angle: 120, repeating: false, stops: stops(['#f97316', 0], ['#ec4899', 55], ['#8b5cf6', 100]) } },
  { id: 'ocean', patch: { kind: 'linear', angle: 160, repeating: false, stops: stops(['#06b6d4', 0], ['#3b82f6', 50], ['#1e3a8a', 100]) } },
  { id: 'aurora', patch: { kind: 'linear', angle: 45, repeating: false, stops: stops(['#22c55e', 0], ['#14b8a6', 40], ['#6366f1', 100]) } },
  { id: 'peach', patch: { kind: 'linear', angle: 90, repeating: false, stops: stops(['#fde68a', 0], ['#fca5a5', 100]) } },
  { id: 'midnight', patch: { kind: 'linear', angle: 180, repeating: false, stops: stops(['#0f172a', 0], ['#312e81', 100]) } },
  { id: 'glow', patch: { kind: 'radial', shape: 'circle', x: 50, y: 40, repeating: false, stops: stops(['#a855f7', 0], ['#3b0764', 70], ['#020617', 100]) } },
  { id: 'wheel', patch: { kind: 'conic', angle: 0, x: 50, y: 50, repeating: false, stops: stops(['#ef4444', 0], ['#eab308', 25], ['#22c55e', 50], ['#3b82f6', 75], ['#ef4444', 100]) } },
  { id: 'stripes', patch: { kind: 'linear', angle: 45, repeating: true, stops: stops(['#6366f1', 0], ['#6366f1', 10], ['#a5b4fc', 10], ['#a5b4fc', 20]) } },
]

// ---------------------------------------------------------------------------
// Box shadow

export interface ShadowLayer {
  id: string
  x: number
  y: number
  blur: number
  spread: number
  color: string
  opacity: number
  inset: boolean
}

export interface ShadowState {
  layers: ShadowLayer[]
}

const layer = (x: number, y: number, blur: number, spread: number, color: string, opacity: number, inset = false, id = `${x}${y}${blur}`): ShadowLayer => ({
  id,
  x,
  y,
  blur,
  spread,
  color,
  opacity,
  inset,
})

export function newShadowLayer(): ShadowLayer {
  return layer(0, 4, 12, 0, '#000000', 20, false, uid())
}

export const shadowDefaults: ShadowState = { layers: [layer(0, 8, 24, 0, '#000000', 25, false, 'base')] }

export function shadowValue(state: ShadowState): string {
  if (state.layers.length === 0) return 'none'
  return state.layers
    .map((l) => `${l.inset ? 'inset ' : ''}${l.x}px ${l.y}px ${l.blur}px ${l.spread}px ${colorWithOpacity(l.color, l.opacity)}`)
    .join(', ')
}

export function buildShadow(state: ShadowState): CssResult {
  return { decls: [['box-shadow', shadowValue(state)]] }
}

export const shadowPresets: Preset<ShadowState>[] = [
  { id: 'soft', patch: { layers: [layer(0, 2, 8, 0, '#0f172a', 8)] } },
  { id: 'medium', patch: { ...shadowDefaults } },
  { id: 'floating', patch: { layers: [layer(0, 24, 48, -12, '#0f172a', 35)] } },
  { id: 'layered', patch: { layers: [layer(0, 1, 2, 0, '#0f172a', 6), layer(0, 4, 8, 0, '#0f172a', 8), layer(0, 16, 32, 0, '#0f172a', 12)] } },
  { id: 'hard', patch: { layers: [layer(6, 6, 0, 0, '#0f172a', 100)] } },
  { id: 'glow', patch: { layers: [layer(0, 0, 24, 4, '#6366f1', 55)] } },
  { id: 'inset', patch: { layers: [layer(0, 2, 6, 0, '#0f172a', 25, true)] } },
  { id: 'neumorphic', patch: { layers: [layer(8, 8, 16, 0, '#a3b1c6', 60), layer(-8, -8, 16, 0, '#ffffff', 90)] } },
]

// ---------------------------------------------------------------------------
// Text shadow

export interface TextShadowLayer {
  id: string
  x: number
  y: number
  blur: number
  color: string
  opacity: number
}

export interface TextShadowState {
  layers: TextShadowLayer[]
  color: string
  text: string
  size: number
  weight: number
}

const tLayer = (x: number, y: number, blur: number, color: string, opacity = 100): TextShadowLayer => ({
  id: `${x}${y}${blur}${color}`,
  x,
  y,
  blur,
  color,
  opacity,
})

export function newTextShadowLayer(): TextShadowLayer {
  return { ...tLayer(2, 2, 4, '#000000', 30), id: uid() }
}

export const textShadowDefaults: TextShadowState = {
  layers: [tLayer(2, 2, 4, '#000000', 30)],
  color: '#1e293b',
  text: 'Shadow',
  size: 48,
  weight: 800,
}

export function buildTextShadow(state: TextShadowState): CssResult {
  const value = state.layers.length
    ? state.layers.map((l) => `${l.x}px ${l.y}px ${l.blur}px ${colorWithOpacity(l.color, l.opacity)}`).join(', ')
    : 'none'
  return { decls: [['color', colorWithOpacity(state.color)], ['text-shadow', value]] }
}

export const textShadowPresets: Preset<TextShadowState>[] = [
  { id: 'subtle', patch: { color: '#1e293b', layers: [tLayer(2, 2, 4, '#000000', 30)] } },
  { id: 'glow', patch: { color: '#ffffff', layers: [tLayer(0, 0, 8, '#6366f1'), tLayer(0, 0, 24, '#6366f1', 70)] } },
  { id: 'neon', patch: { color: '#fdf4ff', layers: [tLayer(0, 0, 4, '#ffffff'), tLayer(0, 0, 12, '#ec4899'), tLayer(0, 0, 28, '#ec4899'), tLayer(0, 0, 48, '#a21caf')] } },
  { id: 'retro', patch: { color: '#fbbf24', layers: [tLayer(3, 3, 0, '#ef4444'), tLayer(6, 6, 0, '#1e293b')] } },
  { id: 'outline', patch: { color: '#ffffff', layers: [tLayer(-1, -1, 0, '#0f172a'), tLayer(1, -1, 0, '#0f172a'), tLayer(-1, 1, 0, '#0f172a'), tLayer(1, 1, 0, '#0f172a')] } },
  { id: 'emboss', patch: { color: '#cbd5e1', layers: [tLayer(-1, -1, 0, '#ffffff', 80), tLayer(1, 1, 1, '#0f172a', 50)] } },
]

// ---------------------------------------------------------------------------
// Border radius

export interface RadiusState {
  linked: boolean
  unit: 'px' | '%'
  tl: number
  tr: number
  br: number
  bl: number
}

export const radiusDefaults: RadiusState = { linked: true, unit: 'px', tl: 16, tr: 16, br: 16, bl: 16 }

export function radiusValue(state: RadiusState): string {
  const { tl, tr, br, bl, unit } = state
  if (tl === tr && tr === br && br === bl) return `${tl}${unit}`
  return `${tl}${unit} ${tr}${unit} ${br}${unit} ${bl}${unit}`
}

export function buildRadius(state: RadiusState): CssResult {
  return { decls: [['border-radius', radiusValue(state)]] }
}

const corners = (unit: RadiusState['unit'], tl: number, tr = tl, br = tl, bl = tr): Partial<RadiusState> => ({
  unit,
  tl,
  tr,
  br,
  bl,
  linked: tl === tr && tr === br && br === bl,
})

export const radiusPresets: Preset<RadiusState>[] = [
  { id: 'square', patch: corners('px', 0) },
  { id: 'soft', patch: corners('px', 6) },
  { id: 'rounded', patch: corners('px', 16) },
  { id: 'pill', patch: corners('px', 999) },
  { id: 'circle', patch: corners('%', 50) },
  { id: 'leaf', patch: corners('%', 50, 0, 50, 0) },
  { id: 'drop', patch: corners('%', 50, 50, 0, 50) },
  { id: 'tab', patch: corners('px', 16, 16, 0, 0) },
]

// ---------------------------------------------------------------------------
// Border

export const BORDER_STYLES = ['solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset'] as const
export const BORDER_SIDES = ['all', 'top', 'right', 'bottom', 'left', 'x', 'y'] as const

export interface BorderState {
  width: number
  style: (typeof BORDER_STYLES)[number]
  color: string
  opacity: number
  side: (typeof BORDER_SIDES)[number]
  radius: number
}

export const borderDefaults: BorderState = { width: 2, style: 'solid', color: '#6366f1', opacity: 100, side: 'all', radius: 12 }

export function buildBorder(state: BorderState): CssResult {
  const value = `${state.width}px ${state.style} ${colorWithOpacity(state.color, state.opacity)}`
  const sides: Record<BorderState['side'], string[]> = {
    all: ['border'],
    top: ['border-top'],
    right: ['border-right'],
    bottom: ['border-bottom'],
    left: ['border-left'],
    x: ['border-left', 'border-right'],
    y: ['border-top', 'border-bottom'],
  }
  const decls: Decl[] = sides[state.side].map((property) => [property, value] as const)
  if (state.radius > 0) decls.push(['border-radius', `${state.radius}px`])
  return { decls }
}

export const borderPresets: Preset<BorderState>[] = [
  { id: 'thin', patch: { width: 1, style: 'solid', side: 'all', color: '#cbd5e1', opacity: 100, radius: 8 } },
  { id: 'accent', patch: { ...borderDefaults } },
  { id: 'dashed', patch: { width: 2, style: 'dashed', side: 'all', color: '#64748b', opacity: 100, radius: 12 } },
  { id: 'dotted', patch: { width: 3, style: 'dotted', side: 'all', color: '#0ea5e9', opacity: 100, radius: 12 } },
  { id: 'double', patch: { width: 6, style: 'double', side: 'all', color: '#0f172a', opacity: 100, radius: 4 } },
  { id: 'callout', patch: { width: 4, style: 'solid', side: 'left', color: '#f59e0b', opacity: 100, radius: 0 } },
  { id: 'underline', patch: { width: 3, style: 'solid', side: 'bottom', color: '#ec4899', opacity: 100, radius: 0 } },
]

// ---------------------------------------------------------------------------
// Glass

export interface GlassState {
  blur: number
  saturation: number
  tint: string
  tintOpacity: number
  borderOpacity: number
  radius: number
  shadow: boolean
}

export const glassDefaults: GlassState = { blur: 12, saturation: 160, tint: '#ffffff', tintOpacity: 18, borderOpacity: 30, radius: 16, shadow: true }

export function buildGlass(state: GlassState): CssResult {
  const filter = `blur(${state.blur}px) saturate(${state.saturation}%)`
  const decls: Decl[] = [
    ['background', colorWithOpacity(state.tint, state.tintOpacity)],
    ['-webkit-backdrop-filter', filter],
    ['backdrop-filter', filter],
    ['border', `1px solid ${colorWithOpacity('#ffffff', state.borderOpacity)}`],
    ['border-radius', `${state.radius}px`],
  ]
  if (state.shadow) decls.push(['box-shadow', '0 8px 32px rgba(15, 23, 42, 0.18)'])
  return { decls }
}

export const glassPresets: Preset<GlassState>[] = [
  { id: 'frosted', patch: { ...glassDefaults } },
  { id: 'clear', patch: { blur: 4, saturation: 120, tint: '#ffffff', tintOpacity: 8, borderOpacity: 25 } },
  { id: 'heavy', patch: { blur: 24, saturation: 180, tint: '#ffffff', tintOpacity: 35, borderOpacity: 45 } },
  { id: 'dark', patch: { blur: 16, saturation: 140, tint: '#0f172a', tintOpacity: 45, borderOpacity: 12 } },
  { id: 'tinted', patch: { blur: 14, saturation: 170, tint: '#6366f1', tintOpacity: 25, borderOpacity: 30 } },
]

// ---------------------------------------------------------------------------
// Filter

export interface FilterState {
  blur: number
  brightness: number
  contrast: number
  grayscale: number
  hueRotate: number
  invert: number
  saturate: number
  sepia: number
  opacity: number
}

export const filterDefaults: FilterState = {
  blur: 0,
  brightness: 100,
  contrast: 100,
  grayscale: 0,
  hueRotate: 0,
  invert: 0,
  saturate: 100,
  sepia: 0,
  opacity: 100,
}

export function filterValue(state: FilterState): string {
  const parts: string[] = []
  if (state.blur) parts.push(`blur(${state.blur}px)`)
  if (state.brightness !== 100) parts.push(`brightness(${state.brightness}%)`)
  if (state.contrast !== 100) parts.push(`contrast(${state.contrast}%)`)
  if (state.grayscale) parts.push(`grayscale(${state.grayscale}%)`)
  if (state.hueRotate) parts.push(`hue-rotate(${state.hueRotate}deg)`)
  if (state.invert) parts.push(`invert(${state.invert}%)`)
  if (state.saturate !== 100) parts.push(`saturate(${state.saturate}%)`)
  if (state.sepia) parts.push(`sepia(${state.sepia}%)`)
  if (state.opacity !== 100) parts.push(`opacity(${state.opacity}%)`)
  return parts.join(' ') || 'none'
}

export function buildFilter(state: FilterState): CssResult {
  return { decls: [['filter', filterValue(state)]] }
}

export const filterPresets: Preset<FilterState>[] = [
  { id: 'original', patch: { ...filterDefaults } },
  { id: 'vintage', patch: { ...filterDefaults, sepia: 45, contrast: 110, brightness: 95, saturate: 80 } },
  { id: 'noir', patch: { ...filterDefaults, grayscale: 100, contrast: 130, brightness: 90 } },
  { id: 'vivid', patch: { ...filterDefaults, saturate: 180, contrast: 115 } },
  { id: 'cool', patch: { ...filterDefaults, hueRotate: 200, saturate: 120 } },
  { id: 'warm', patch: { ...filterDefaults, sepia: 25, saturate: 140, hueRotate: 345 } },
  { id: 'faded', patch: { ...filterDefaults, contrast: 75, brightness: 115, saturate: 70 } },
  { id: 'inverted', patch: { ...filterDefaults, invert: 100, hueRotate: 180 } },
  { id: 'soft-focus', patch: { ...filterDefaults, blur: 3, brightness: 105 } },
]

// ---------------------------------------------------------------------------
// Transform

export const TRANSFORM_ORIGINS = [
  'center',
  'top left',
  'top',
  'top right',
  'left',
  'right',
  'bottom left',
  'bottom',
  'bottom right',
] as const

export interface TransformState {
  perspective: number
  translateX: number
  translateY: number
  rotate: number
  rotateX: number
  rotateY: number
  scale: number
  skewX: number
  skewY: number
  origin: (typeof TRANSFORM_ORIGINS)[number]
}

export const transformDefaults: TransformState = {
  perspective: 0,
  translateX: 0,
  translateY: 0,
  rotate: 0,
  rotateX: 0,
  rotateY: 0,
  scale: 100,
  skewX: 0,
  skewY: 0,
  origin: 'center',
}

export function transformValue(state: TransformState): string {
  const parts: string[] = []
  if (state.perspective) parts.push(`perspective(${state.perspective}px)`)
  if (state.translateX || state.translateY) parts.push(`translate(${state.translateX}px, ${state.translateY}px)`)
  if (state.rotate) parts.push(`rotate(${state.rotate}deg)`)
  if (state.rotateX) parts.push(`rotateX(${state.rotateX}deg)`)
  if (state.rotateY) parts.push(`rotateY(${state.rotateY}deg)`)
  if (state.scale !== 100) parts.push(`scale(${round(state.scale / 100)})`)
  if (state.skewX || state.skewY) parts.push(`skew(${state.skewX}deg, ${state.skewY}deg)`)
  return parts.join(' ') || 'none'
}

export function buildTransform(state: TransformState): CssResult {
  const decls: Decl[] = [['transform', transformValue(state)]]
  if (state.origin !== 'center') decls.push(['transform-origin', state.origin])
  return { decls }
}

export const transformPresets: Preset<TransformState>[] = [
  { id: 'reset', patch: { ...transformDefaults } },
  { id: 'lift', patch: { ...transformDefaults, translateY: -8, scale: 105 } },
  { id: 'tilt', patch: { ...transformDefaults, rotate: -6 } },
  { id: 'card-3d', patch: { ...transformDefaults, perspective: 800, rotateX: 12, rotateY: -18 } },
  { id: 'flip', patch: { ...transformDefaults, perspective: 600, rotateY: 180 } },
  { id: 'skew', patch: { ...transformDefaults, skewX: -12 } },
  { id: 'shrink', patch: { ...transformDefaults, scale: 75 } },
]

// ---------------------------------------------------------------------------
// Clip path

export const CLIP_POLYGONS = {
  triangle: '50% 0%, 100% 100%, 0% 100%',
  trapezoid: '20% 0%, 80% 0%, 100% 100%, 0% 100%',
  parallelogram: '25% 0%, 100% 0%, 75% 100%, 0% 100%',
  rhombus: '50% 0%, 100% 50%, 50% 100%, 0% 50%',
  pentagon: '50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%',
  hexagon: '25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%',
  octagon: '30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%',
  star: '50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%',
  cross: '35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%',
  arrow: '0% 20%, 60% 20%, 60% 0%, 100% 50%, 60% 100%, 60% 80%, 0% 80%',
  chevron: '75% 0%, 100% 50%, 75% 100%, 0% 100%, 25% 50%, 0% 0%',
  message: '0% 0%, 100% 0%, 100% 75%, 75% 75%, 75% 100%, 50% 75%, 0% 75%',
} as const

export type ClipShape = 'circle' | 'ellipse' | 'inset' | keyof typeof CLIP_POLYGONS

export interface ClipPathState {
  shape: ClipShape
  size: number
  inset: number
  round: number
}

export const clipPathDefaults: ClipPathState = { shape: 'hexagon', size: 50, inset: 10, round: 16 }

export function clipPathValue(state: ClipPathState): string {
  if (state.shape === 'circle') return `circle(${state.size}% at 50% 50%)`
  if (state.shape === 'ellipse') return `ellipse(${state.size}% ${Math.round(state.size * 0.66)}% at 50% 50%)`
  if (state.shape === 'inset') return `inset(${state.inset}% round ${state.round}px)`
  return `polygon(${CLIP_POLYGONS[state.shape]})`
}

export function buildClipPath(state: ClipPathState): CssResult {
  return { decls: [['clip-path', clipPathValue(state)]] }
}

export const clipPathPresets: Preset<ClipPathState>[] = (
  ['circle', 'ellipse', 'inset', ...(Object.keys(CLIP_POLYGONS) as (keyof typeof CLIP_POLYGONS)[])] as ClipShape[]
).map((shape) => ({ id: shape, patch: { shape } }))

// ---------------------------------------------------------------------------
// Animation

export const ANIMATION_KEYFRAMES = {
  'fade-in': ['from { opacity: 0; }', 'to { opacity: 1; }'],
  'slide-up': ['from { opacity: 0; transform: translateY(24px); }', 'to { opacity: 1; transform: translateY(0); }'],
  'slide-in': ['from { opacity: 0; transform: translateX(-32px); }', 'to { opacity: 1; transform: translateX(0); }'],
  'zoom-in': ['from { opacity: 0; transform: scale(0.6); }', 'to { opacity: 1; transform: scale(1); }'],
  bounce: [
    '0%, 100% { transform: translateY(0); animation-timing-function: cubic-bezier(0.8, 0, 1, 1); }',
    '50% { transform: translateY(-25%); animation-timing-function: cubic-bezier(0, 0, 0.2, 1); }',
  ],
  pulse: ['0%, 100% { transform: scale(1); }', '50% { transform: scale(1.08); }'],
  spin: ['from { transform: rotate(0deg); }', 'to { transform: rotate(360deg); }'],
  shake: [
    '0%, 100% { transform: translateX(0); }',
    '20%, 60% { transform: translateX(-8px); }',
    '40%, 80% { transform: translateX(8px); }',
  ],
  swing: [
    '20% { transform: rotate(15deg); }',
    '40% { transform: rotate(-10deg); }',
    '60% { transform: rotate(5deg); }',
    '80% { transform: rotate(-5deg); }',
    '100% { transform: rotate(0deg); }',
  ],
  heartbeat: [
    '0%, 100% { transform: scale(1); }',
    '14% { transform: scale(1.15); }',
    '28% { transform: scale(1); }',
    '42% { transform: scale(1.15); }',
    '70% { transform: scale(1); }',
  ],
  flip: ['from { transform: perspective(400px) rotateY(0); }', 'to { transform: perspective(400px) rotateY(360deg); }'],
  float: ['0%, 100% { transform: translateY(0); }', '50% { transform: translateY(-10px); }'],
} as const

export type AnimationName = keyof typeof ANIMATION_KEYFRAMES

export const EASINGS = {
  ease: 'ease',
  'ease-in': 'ease-in',
  'ease-out': 'ease-out',
  'ease-in-out': 'ease-in-out',
  linear: 'linear',
  smooth: 'cubic-bezier(0.22, 1, 0.36, 1)',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  anticipate: 'cubic-bezier(0.68, -0.6, 0.32, 1.6)',
} as const

export const ANIMATION_DIRECTIONS = ['normal', 'reverse', 'alternate', 'alternate-reverse'] as const
export const ANIMATION_FILLS = ['none', 'forwards', 'backwards', 'both'] as const

export interface AnimationState {
  name: AnimationName
  duration: number
  delay: number
  easing: keyof typeof EASINGS
  iterations: number
  infinite: boolean
  direction: (typeof ANIMATION_DIRECTIONS)[number]
  fill: (typeof ANIMATION_FILLS)[number]
}

export const animationDefaults: AnimationState = {
  name: 'bounce',
  duration: 1000,
  delay: 0,
  easing: 'ease',
  iterations: 1,
  infinite: true,
  direction: 'normal',
  fill: 'both',
}

export function animationValue(state: AnimationState): string {
  const count = state.infinite ? 'infinite' : String(state.iterations)
  return `${state.name} ${state.duration}ms ${EASINGS[state.easing]} ${state.delay}ms ${count} ${state.direction} ${state.fill}`
}

export function keyframesCss(name: AnimationName): string {
  return `@keyframes ${name} {\n${ANIMATION_KEYFRAMES[name].map((line) => `  ${line}`).join('\n')}\n}`
}

export function buildAnimation(state: AnimationState): CssResult {
  return { decls: [['animation', animationValue(state)]], extra: keyframesCss(state.name) }
}

export const animationPresets: Preset<AnimationState>[] = (Object.keys(ANIMATION_KEYFRAMES) as AnimationName[]).map(
  (name) => ({ id: name, patch: { name } }),
)

// ---------------------------------------------------------------------------
// Flexbox

export const FLEX_DIRECTIONS = ['row', 'row-reverse', 'column', 'column-reverse'] as const
export const FLEX_WRAPS = ['nowrap', 'wrap', 'wrap-reverse'] as const
export const FLEX_JUSTIFY = ['flex-start', 'center', 'flex-end', 'space-between', 'space-around', 'space-evenly'] as const
export const FLEX_ALIGN = ['stretch', 'flex-start', 'center', 'flex-end', 'baseline'] as const

export interface FlexState {
  direction: (typeof FLEX_DIRECTIONS)[number]
  wrap: (typeof FLEX_WRAPS)[number]
  justify: (typeof FLEX_JUSTIFY)[number]
  align: (typeof FLEX_ALIGN)[number]
  gap: number
  items: number
}

export const flexDefaults: FlexState = { direction: 'row', wrap: 'nowrap', justify: 'center', align: 'center', gap: 12, items: 4 }

export function buildFlex(state: FlexState): CssResult {
  return {
    decls: [
      ['display', 'flex'],
      ['flex-direction', state.direction],
      ['flex-wrap', state.wrap],
      ['justify-content', state.justify],
      ['align-items', state.align],
      ['gap', `${state.gap}px`],
    ],
  }
}

export const flexPresets: Preset<FlexState>[] = [
  { id: 'center', patch: { ...flexDefaults } },
  { id: 'between', patch: { direction: 'row', wrap: 'nowrap', justify: 'space-between', align: 'center' } },
  { id: 'stack', patch: { direction: 'column', wrap: 'nowrap', justify: 'flex-start', align: 'stretch' } },
  { id: 'wrap', patch: { direction: 'row', wrap: 'wrap', justify: 'flex-start', align: 'flex-start', items: 8 } },
  { id: 'end', patch: { direction: 'row', wrap: 'nowrap', justify: 'flex-end', align: 'flex-end' } },
]

// ---------------------------------------------------------------------------
// Grid

export const GRID_MODES = ['fixed', 'auto-fit', 'auto-fill'] as const
export const GRID_ALIGN = ['stretch', 'start', 'center', 'end'] as const

export interface GridState {
  mode: (typeof GRID_MODES)[number]
  columns: number
  minWidth: number
  rowHeight: number
  columnGap: number
  rowGap: number
  items: number
  justifyItems: (typeof GRID_ALIGN)[number]
  alignItems: (typeof GRID_ALIGN)[number]
}

export const gridDefaults: GridState = {
  mode: 'fixed',
  columns: 3,
  minWidth: 80,
  rowHeight: 0,
  columnGap: 12,
  rowGap: 12,
  items: 6,
  justifyItems: 'stretch',
  alignItems: 'stretch',
}

export function buildGrid(state: GridState): CssResult {
  const columns =
    state.mode === 'fixed'
      ? `repeat(${state.columns}, minmax(0, 1fr))`
      : `repeat(${state.mode}, minmax(${state.minWidth}px, 1fr))`
  const decls: Decl[] = [
    ['display', 'grid'],
    ['grid-template-columns', columns],
  ]
  if (state.rowHeight > 0) decls.push(['grid-auto-rows', `${state.rowHeight}px`])
  decls.push(['gap', state.rowGap === state.columnGap ? `${state.rowGap}px` : `${state.rowGap}px ${state.columnGap}px`])
  if (state.justifyItems !== 'stretch') decls.push(['justify-items', state.justifyItems])
  if (state.alignItems !== 'stretch') decls.push(['align-items', state.alignItems])
  return { decls }
}

export const gridPresets: Preset<GridState>[] = [
  { id: 'two', patch: { mode: 'fixed', columns: 2, items: 4 } },
  { id: 'three', patch: { ...gridDefaults } },
  { id: 'four', patch: { mode: 'fixed', columns: 4, items: 8, rowHeight: 0 } },
  { id: 'cards', patch: { mode: 'auto-fit', minWidth: 96, items: 6 } },
  { id: 'gallery', patch: { mode: 'auto-fill', minWidth: 64, rowHeight: 64, items: 10, columnGap: 6, rowGap: 6 } },
]

// ---------------------------------------------------------------------------
// Output formats

export const OUTPUT_FORMATS = ['css', 'tailwind', 'react'] as const
export type OutputFormat = (typeof OUTPUT_FORMATS)[number]

export function toCss(result: CssResult, selector = '.element'): string {
  const body = result.decls.map(([property, value]) => `  ${property}: ${value};`).join('\n')
  const block = `${selector} {\n${body}\n}`
  return result.extra ? `${block}\n\n${result.extra}` : block
}

export function toTailwind(result: CssResult): string {
  const classes = result.decls
    .map(([property, value]) => `[${property}:${value.replace(/_/g, '\\_').replace(/\s+/g, '_')}]`)
    .join(' ')
  return result.extra ? `${classes}\n\n/* Add to your global CSS */\n${result.extra}` : classes
}

export function reactProperty(property: string): string {
  return property
    .replace(/^-(webkit|moz)-/, (_, vendor: string) => `${vendor[0].toUpperCase()}${vendor.slice(1)}-`)
    .replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
}

export function toReact(result: CssResult): string {
  const lines = result.decls.map(([property, value]) => `  ${reactProperty(property)}: '${value.replace(/'/g, "\\'")}',`)
  const style = `const style = {\n${lines.join('\n')}\n}`
  return result.extra ? `${style}\n\n/* Add to your global CSS */\n${result.extra}` : style
}

export function formatResult(result: CssResult, format: OutputFormat): string {
  if (format === 'tailwind') return toTailwind(result)
  if (format === 'react') return toReact(result)
  return toCss(result)
}

/** Declarations as a React style object, for the live preview. */
export function toStyle(result: CssResult): Record<string, string> {
  const style: Record<string, string> = {}
  for (const [property, value] of result.decls) style[reactProperty(property)] = value
  return style
}

export function presetMatches(state: object, patch: object): boolean {
  const current = state as Record<string, unknown>
  return Object.entries(patch).every(([key, value]) => JSON.stringify(current[key]) === JSON.stringify(value))
}
