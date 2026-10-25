import { colorWithOpacity as alpha, type CssResult, type Decl, type Preset, type Rule } from './generators'

// ---------------------------------------------------------------------------
// Helpers

const rgb = (hex: string) => {
  const n = Number.parseInt(hex.replace('#', '').slice(0, 6), 16) || 0
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/** Blend two `#rrggbb` colours; `t` is the share of `b`. */
export function mix(a: string, b: string, t: number): string {
  const A = rgb(a)
  const B = rgb(b)
  return `#${A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join('')}`
}

/** Black or white, whichever reads better on the colour. */
export function readableOn(hex: string): string {
  const [r, g, b] = rgb(hex).map((v) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? '#000000' : '#ffffff'
}

const px = (n: number) => `${Math.round(n)}px`

/** Declarations where a later entry for the same property replaces the earlier value in place. */
function merge(...lists: Decl[][]): Decl[] {
  const map = new Map<string, string>()
  for (const list of lists) for (const [property, value] of list) map.set(property, value)
  return [...map]
}

const keyframes = (name: string, lines: string[]) => `@keyframes ${name} {\n${lines.map((line) => `  ${line}`).join('\n')}\n}`

const reducedMotion = (body = 'animation: none;') =>
  `@media (prefers-reduced-motion: reduce) {\n  &,\n  &::before,\n  &::after {\n    ${body}\n  }\n}`

const property = (name: string, syntax: string, initial: string) =>
  `@property ${name} {\n  syntax: '${syntax}';\n  initial-value: ${initial};\n  inherits: false;\n}`

const rule = (selector: string, decls: Decl[]): Rule => ({ selector, decls })

const svgUrl = (svg: string) => `url("data:image/svg+xml,${svg.replace(/"/g, "'").replace(/</g, '%3C').replace(/>/g, '%3E').replace(/#/g, '%23')}")`

// ---------------------------------------------------------------------------
// UI styles: a complete card and button in one design language

export const UI_STYLES = [
  'liquid-glass',
  'glass',
  'neumorphism',
  'soft-ui',
  'claymorphism',
  'skeuomorphism',
  'neo-brutalism',
  'brutalism',
  'minimal',
  'material',
  'aurora',
  'holographic',
  'neon',
  'retro',
] as const

export type UiStyleId = (typeof UI_STYLES)[number]

/** Styles that always render on their own backdrop, so light/dark does not apply. */
export const FIXED_MODE_STYLES: UiStyleId[] = ['liquid-glass', 'glass', 'aurora', 'holographic', 'neon', 'retro']

export interface UiStyleState {
  style: UiStyleId
  accent: string
  mode: 'light' | 'dark'
  radius: number
  padding: number
  intensity: number
}

export const uiStyleDefaults: UiStyleState = { style: 'liquid-glass', accent: '#6366f1', mode: 'light', radius: 28, padding: 24, intensity: 60 }

const STYLE_RADIUS: Record<UiStyleId, number> = {
  'liquid-glass': 28,
  glass: 20,
  neumorphism: 24,
  'soft-ui': 20,
  claymorphism: 28,
  skeuomorphism: 12,
  'neo-brutalism': 8,
  brutalism: 0,
  minimal: 12,
  material: 16,
  aurora: 20,
  holographic: 20,
  neon: 12,
  retro: 0,
}

export const uiStylePresets: Preset<UiStyleState>[] = UI_STYLES.map((style) => ({ id: style, patch: { style, radius: STYLE_RADIUS[style] } }))

interface StyleParts {
  card: Decl[]
  title?: Decl[]
  text?: Decl[]
  button: Decl[]
  hover?: Decl[]
  active?: Decl[]
  before?: Decl[]
  extra?: string[]
}

const glassFallback = (dark: boolean) =>
  `@media (prefers-reduced-transparency: reduce) {\n  & {\n    background: ${dark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(30, 41, 59, 0.92)'};\n    -webkit-backdrop-filter: none;\n    backdrop-filter: none;\n  }\n}`

function styleParts(s: UiStyleState): StyleParts {
  const A = s.accent
  const i = s.intensity / 100
  const dark = s.mode === 'dark'
  const ink = dark ? '#f8fafc' : '#0f172a'
  const muted = dark ? '#cbd5e1' : '#475569'
  const r = s.radius

  switch (s.style) {
    case 'glass': {
      const blur = `blur(${px(6 + 18 * i)}) saturate(160%)`
      return {
        card: [
          ['background', alpha('#ffffff', Math.round(14 + 20 * i))],
          ['-webkit-backdrop-filter', blur],
          ['backdrop-filter', blur],
          ['border', `1px solid ${alpha('#ffffff', 40)}`],
          ['box-shadow', `0 8px 32px ${alpha('#0f172a', Math.round(18 + 15 * i))}`],
          ['color', '#ffffff'],
        ],
        text: [['color', alpha('#ffffff', 85)]],
        button: [
          ['background', alpha('#ffffff', 22)],
          ['border', `1px solid ${alpha('#ffffff', 45)}`],
          ['border-radius', px(Math.max(r - 8, 8))],
          ['color', '#ffffff'],
        ],
        hover: [['background', alpha('#ffffff', 34)]],
        extra: [glassFallback(false)],
      }
    }
    case 'liquid-glass': {
      const blur = `blur(${px(10 + 14 * i)}) saturate(180%)`
      return {
        card: [
          ['background', `linear-gradient(135deg, ${alpha('#ffffff', Math.round(18 + 18 * i))}, ${alpha('#ffffff', Math.round(4 + 6 * i))})`],
          ['-webkit-backdrop-filter', blur],
          ['backdrop-filter', blur],
          ['border', `1px solid ${alpha('#ffffff', 45)}`],
          [
            'box-shadow',
            `inset 0 1px 0 ${alpha('#ffffff', 70)}, inset 0 -1px 0 ${alpha('#ffffff', 15)}, inset 0 0 ${px(12 + 16 * i)} ${alpha('#ffffff', 15)}, 0 12px 40px ${alpha('#0f172a', 25)}`,
          ],
          ['overflow', 'hidden'],
          ['isolation', 'isolate'],
          ['color', '#ffffff'],
        ],
        before: [
          ['content', '""'],
          ['position', 'absolute'],
          ['inset', '0'],
          ['z-index', '-1'],
          ['border-radius', 'inherit'],
          ['background', `radial-gradient(120% 70% at 15% 0%, ${alpha('#ffffff', 45)}, transparent 55%)`],
          ['pointer-events', 'none'],
        ],
        text: [['color', alpha('#ffffff', 85)]],
        button: [
          ['background', `linear-gradient(180deg, ${alpha('#ffffff', 40)}, ${alpha('#ffffff', 12)})`],
          ['border', `1px solid ${alpha('#ffffff', 55)}`],
          ['border-radius', '999px'],
          ['box-shadow', `inset 0 1px 0 ${alpha('#ffffff', 80)}, 0 4px 12px ${alpha('#0f172a', 20)}`],
          ['color', '#ffffff'],
        ],
        hover: [['transform', 'translateY(-1px) scale(1.02)']],
        active: [['transform', 'scale(0.98)']],
        extra: [glassFallback(false)],
      }
    }
    case 'neumorphism': {
      const surface = dark ? '#1f2633' : '#e4e9f0'
      const light = mix(surface, '#ffffff', dark ? 0.08 : 0.7)
      const shade = mix(surface, '#000000', dark ? 0.45 : 0.18)
      const d = 4 + 10 * i
      return {
        card: [
          ['background', surface],
          ['box-shadow', `${px(d)} ${px(d)} ${px(2 * d)} ${shade}, ${px(-d)} ${px(-d)} ${px(2 * d)} ${light}`],
          ['color', ink],
        ],
        text: [['color', muted]],
        button: [
          ['background', surface],
          ['border', 'none'],
          ['border-radius', px(Math.max(r - 8, 10))],
          ['box-shadow', `${px(d / 2)} ${px(d / 2)} ${px(d)} ${shade}, ${px(-d / 2)} ${px(-d / 2)} ${px(d)} ${light}`],
          ['color', A],
        ],
        active: [['box-shadow', `inset ${px(d / 2)} ${px(d / 2)} ${px(d)} ${shade}, inset ${px(-d / 2)} ${px(-d / 2)} ${px(d)} ${light}`]],
        extra: [`/* Use ${surface} as the page background so the shadows blend in */`],
      }
    }
    case 'soft-ui':
      return {
        card: [
          ['background', dark ? '#111827' : '#ffffff'],
          ['border', `1px solid ${dark ? alpha('#ffffff', 8) : '#eef2f7'}`],
          ['box-shadow', `0 ${px(10 + 14 * i)} ${px(30 + 30 * i)} -12px ${alpha(A, Math.round(25 + 20 * i))}`],
          ['color', ink],
        ],
        text: [['color', muted]],
        button: [
          ['background', `linear-gradient(135deg, ${A}, ${mix(A, '#ffffff', 0.3)})`],
          ['border', 'none'],
          ['border-radius', '12px'],
          ['box-shadow', `0 8px 20px -6px ${alpha(A, 60)}`],
          ['color', readableOn(A)],
        ],
        hover: [
          ['transform', 'translateY(-2px)'],
          ['box-shadow', `0 12px 24px -6px ${alpha(A, 70)}`],
        ],
      }
    case 'claymorphism': {
      const a = 4 + 6 * i
      return {
        card: [
          ['background', dark ? mix(A, '#0f172a', 0.72) : mix(A, '#ffffff', 0.78)],
          [
            'box-shadow',
            `inset ${px(-a)} ${px(-a)} ${px(2 * a)} ${alpha('#000000', dark ? 30 : 10)}, inset ${px(a)} ${px(a)} ${px(2 * a)} ${alpha('#ffffff', dark ? 10 : 75)}, ${px(8 + 10 * i)} ${px(12 + 12 * i)} ${px(20 + 16 * i)} ${alpha(mix(A, '#000000', 0.3), 30)}`,
          ],
          ['color', ink],
        ],
        text: [['color', muted]],
        button: [
          ['background', A],
          ['border', 'none'],
          ['border-radius', '999px'],
          ['box-shadow', `inset -3px -3px 6px ${alpha('#000000', 20)}, inset 3px 3px 6px ${alpha('#ffffff', 35)}, 0 6px 14px ${alpha(A, 40)}`],
          ['color', readableOn(A)],
          ['transition', 'transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)'],
        ],
        hover: [['transform', 'translateY(-2px) scale(1.03)']],
        active: [['transform', 'scale(0.97)']],
      }
    }
    case 'skeuomorphism': {
      const surface = dark ? '#2a2f3a' : '#eceff3'
      return {
        card: [
          ['background', `linear-gradient(180deg, ${mix(surface, '#ffffff', dark ? 0.08 : 0.6)}, ${mix(surface, '#000000', dark ? 0.25 : 0.06)})`],
          ['border', `1px solid ${mix(surface, '#000000', dark ? 0.5 : 0.2)}`],
          ['box-shadow', `inset 0 1px 0 ${alpha('#ffffff', dark ? 10 : 90)}, 0 1px 2px ${alpha('#000000', 25)}, 0 ${px(6 + 10 * i)} ${px(12 + 16 * i)} ${alpha('#000000', Math.round(12 + 10 * i))}`],
          ['color', ink],
        ],
        title: [['text-shadow', `0 1px 0 ${dark ? alpha('#000000', 60) : alpha('#ffffff', 90)}`]],
        text: [['color', muted]],
        button: [
          ['background', `linear-gradient(180deg, ${mix(A, '#ffffff', 0.25)}, ${mix(A, '#000000', 0.18)})`],
          ['border', `1px solid ${mix(A, '#000000', 0.35)}`],
          ['border-radius', '8px'],
          ['box-shadow', `inset 0 1px 0 ${alpha('#ffffff', 45)}, 0 2px 3px ${alpha('#000000', 25)}`],
          ['color', '#ffffff'],
          ['text-shadow', `0 -1px 0 ${alpha('#000000', 35)}`],
        ],
        active: [
          ['background', `linear-gradient(180deg, ${mix(A, '#000000', 0.18)}, ${mix(A, '#ffffff', 0.1)})`],
          ['box-shadow', `inset 0 2px 4px ${alpha('#000000', 35)}`],
        ],
      }
    }
    case 'neo-brutalism': {
      const line = dark ? '#ffffff' : '#000000'
      const o = 3 + 5 * i
      return {
        card: [
          ['background', dark ? '#1c1c1c' : '#fff8dc'],
          ['border', `3px solid ${line}`],
          ['box-shadow', `${px(o)} ${px(o)} 0 ${line}`],
          ['color', ink],
        ],
        title: [
          ['font-weight', '800'],
          ['letter-spacing', '-0.01em'],
        ],
        button: [
          ['background', A],
          ['border', `3px solid ${line}`],
          ['border-radius', px(Math.min(r, 8))],
          ['box-shadow', `${px(Math.max(o - 2, 2))} ${px(Math.max(o - 2, 2))} 0 ${line}`],
          ['color', readableOn(A)],
          ['font-weight', '800'],
          ['transition', 'transform 0.1s ease, box-shadow 0.1s ease'],
        ],
        hover: [
          ['transform', 'translate(-2px, -2px)'],
          ['box-shadow', `${px(o)} ${px(o)} 0 ${line}`],
        ],
        active: [
          ['transform', 'translate(2px, 2px)'],
          ['box-shadow', `0 0 0 ${line}`],
        ],
      }
    }
    case 'brutalism': {
      const bg = dark ? '#000000' : '#ffffff'
      const line = dark ? '#ffffff' : '#000000'
      return {
        card: [
          ['background', bg],
          ['border', `2px solid ${line}`],
          ['color', line],
          ['font-family', 'ui-monospace, "Courier New", monospace'],
        ],
        title: [
          ['text-transform', 'uppercase'],
          ['letter-spacing', '0.04em'],
        ],
        button: [
          ['background', line],
          ['border', `2px solid ${line}`],
          ['border-radius', '0'],
          ['color', bg],
          ['text-transform', 'uppercase'],
        ],
        hover: [
          ['background', A],
          ['border-color', A],
          ['color', readableOn(A)],
        ],
      }
    }
    case 'minimal': {
      const bg = dark ? '#0a0a0b' : '#ffffff'
      return {
        card: [
          ['background', bg],
          ['border', `1px solid ${dark ? '#27272a' : '#e4e4e7'}`],
          ['box-shadow', i > 0.5 ? `0 1px 2px ${alpha('#000000', 6)}` : 'none'],
          ['color', ink],
        ],
        text: [['color', dark ? '#a1a1aa' : '#71717a']],
        button: [
          ['background', ink],
          ['border', 'none'],
          ['border-radius', px(Math.max(r - 6, 6))],
          ['color', bg],
        ],
        hover: [['opacity', '0.88']],
      }
    }
    case 'material':
      return {
        card: [
          ['background', dark ? '#1e1f24' : '#ffffff'],
          ['box-shadow', `0 1px 3px ${alpha('#000000', Math.round(12 + 6 * i))}, 0 ${px(4 + 8 * i)} ${px(8 + 16 * i)} ${alpha('#000000', Math.round(8 + 8 * i))}`],
          ['color', ink],
        ],
        text: [['color', muted]],
        button: [
          ['background', A],
          ['border', 'none'],
          ['border-radius', '999px'],
          ['box-shadow', `0 1px 2px ${alpha('#000000', 20)}`],
          ['color', readableOn(A)],
          ['letter-spacing', '0.01em'],
        ],
        hover: [
          ['background', mix(A, '#ffffff', 0.08)],
          ['box-shadow', `0 2px 6px ${alpha('#000000', 25)}`],
        ],
      }
    case 'aurora':
      return {
        card: [
          [
            'background',
            `radial-gradient(at 0% 0%, ${alpha(A, Math.round(55 + 35 * i))} 0, transparent 55%), radial-gradient(at 100% 0%, ${alpha('#22d3ee', Math.round(40 + 30 * i))} 0, transparent 50%), radial-gradient(at 50% 100%, ${alpha('#a855f7', Math.round(40 + 30 * i))} 0, transparent 55%), #0b1020`,
          ],
          ['border', `1px solid ${alpha('#ffffff', 10)}`],
          ['color', '#f8fafc'],
        ],
        text: [['color', alpha('#ffffff', 80)]],
        button: [
          ['background', '#ffffff'],
          ['border', 'none'],
          ['border-radius', '999px'],
          ['color', '#0b1020'],
        ],
        hover: [['box-shadow', `0 0 0 4px ${alpha('#ffffff', 20)}`]],
      }
    case 'holographic': {
      const speed = Math.round(14 - 8 * i)
      return {
        card: [
          ['background', 'linear-gradient(125deg, #ffd6f5, #c7e9ff, #d8ffd1, #fff3c4, #e5d4ff, #ffd6f5)'],
          ['background-size', '300% 300%'],
          ['animation', `holo-shift ${speed}s ease infinite`],
          ['border', `1px solid ${alpha('#ffffff', 70)}`],
          ['box-shadow', `0 10px 30px ${alpha('#6d28d9', 18)}`],
          ['overflow', 'hidden'],
          ['color', '#1e1b4b'],
        ],
        before: [
          ['content', '""'],
          ['position', 'absolute'],
          ['inset', '0'],
          ['border-radius', 'inherit'],
          ['background', `linear-gradient(115deg, transparent 35%, ${alpha('#ffffff', 55)} 50%, transparent 65%)`],
          ['background-size', '250% 100%'],
          ['animation', `holo-sheen ${Math.max(speed - 2, 3)}s linear infinite`],
          ['pointer-events', 'none'],
        ],
        text: [['color', '#3730a3']],
        button: [
          ['background', '#1e1b4b'],
          ['border', 'none'],
          ['border-radius', '999px'],
          ['color', '#ffffff'],
        ],
        hover: [['transform', 'translateY(-1px)']],
        extra: [
          keyframes('holo-shift', ['0%, 100% { background-position: 0% 50%; }', '50% { background-position: 100% 50%; }']),
          keyframes('holo-sheen', ['from { background-position: 150% 0; }', 'to { background-position: -100% 0; }']),
          reducedMotion(),
        ],
      }
    }
    case 'neon':
      return {
        card: [
          ['background', '#07020f'],
          ['border', `1px solid ${alpha(A, 80)}`],
          ['box-shadow', `0 0 ${px(8 + 20 * i)} ${alpha(A, 55)}, inset 0 0 ${px(6 + 14 * i)} ${alpha(A, 30)}`],
          ['color', '#f5f3ff'],
        ],
        title: [
          ['color', mix(A, '#ffffff', 0.3)],
          ['text-shadow', `0 0 6px ${alpha(A, 90)}, 0 0 ${px(12 + 16 * i)} ${alpha(A, 60)}`],
        ],
        text: [['color', alpha('#ffffff', 75)]],
        button: [
          ['background', 'transparent'],
          ['border', `1px solid ${A}`],
          ['border-radius', px(Math.min(r, 10))],
          ['box-shadow', `0 0 10px ${alpha(A, 50)}, inset 0 0 8px ${alpha(A, 30)}`],
          ['color', mix(A, '#ffffff', 0.25)],
          ['text-shadow', `0 0 6px ${alpha(A, 80)}`],
        ],
        hover: [
          ['background', A],
          ['box-shadow', `0 0 20px ${alpha(A, 80)}`],
          ['color', '#07020f'],
          ['text-shadow', 'none'],
        ],
      }
    case 'retro': {
      const bevel = 'inset -1px -1px 0 #808080, inset 1px 1px 0 #dfdfdf'
      return {
        card: [
          ['background', '#c0c0c0'],
          ['border', '2px solid'],
          ['border-color', '#ffffff #404040 #404040 #ffffff'],
          ['box-shadow', bevel],
          ['color', '#000000'],
          ['font-family', 'Tahoma, "MS Sans Serif", ui-sans-serif, sans-serif'],
        ],
        title: [
          ['margin', `-${px(s.padding - 3)} -${px(s.padding - 3)} 12px`],
          ['padding', '4px 8px'],
          ['background', `linear-gradient(90deg, #000080, ${A})`],
          ['color', '#ffffff'],
          ['font-size', '13px'],
        ],
        text: [['color', '#000000']],
        button: [
          ['background', '#c0c0c0'],
          ['border', '2px solid'],
          ['border-color', '#ffffff #404040 #404040 #ffffff'],
          ['border-radius', '0'],
          ['box-shadow', bevel],
          ['color', '#000000'],
          ['font-weight', '400'],
        ],
        active: [
          ['border-color', '#404040 #ffffff #ffffff #404040'],
          ['box-shadow', 'inset 1px 1px 0 #808080'],
        ],
      }
    }
  }
}

export function buildUiStyle(s: UiStyleState): CssResult {
  const parts = styleParts(s)
  const square = s.style === 'brutalism' || s.style === 'retro'
  const card = merge(
    [
      ['position', 'relative'],
      ['padding', px(s.padding)],
      ['border-radius', square ? '0' : px(s.radius)],
    ],
    parts.card,
  )
  const rules: Rule[] = []
  if (parts.before) rules.push(rule('&::before', parts.before))
  rules.push(
    rule('& .title', merge([['margin', '0 0 6px'], ['font-size', '18px'], ['font-weight', '700']], parts.title ?? [])),
    rule('& .text', merge([['margin', '0 0 16px'], ['font-size', '14px'], ['line-height', '1.5']], parts.text ?? [])),
    rule(
      '& .button',
      merge(
        [
          ['display', 'inline-flex'],
          ['align-items', 'center'],
          ['justify-content', 'center'],
          ['padding', '10px 18px'],
          ['font-family', 'inherit'],
          ['font-size', '14px'],
          ['font-weight', '600'],
          ['line-height', '1'],
          ['cursor', 'pointer'],
          ['transition', 'transform 0.2s ease, box-shadow 0.2s ease, background 0.2s ease, color 0.2s ease'],
        ],
        parts.button,
      ),
    ),
  )
  if (parts.hover) rules.push(rule('& .button:hover', parts.hover))
  if (parts.active) rules.push(rule('& .button:active', parts.active))
  rules.push(rule('& .button:focus-visible', [['outline', `2px solid ${s.style === 'retro' ? '#000000' : s.accent}`], ['outline-offset', '3px']]))
  const extra = ['/* Markup: put <h3 class="title">, <p class="text"> and <button class="button"> inside the element */', ...(parts.extra ?? [])]
  return { decls: card, rules, extra: extra.join('\n\n') }
}

// ---------------------------------------------------------------------------
// Background effects

export const BG_KINDS = [
  'aurora',
  'animated-gradient',
  'mesh',
  'blobs',
  'conic-spin',
  'dot-grid',
  'grid-lines',
  'stripes',
  'starfield',
  'waves',
  'noise',
  'spotlight',
] as const

export type BgKind = (typeof BG_KINDS)[number]
export const STATIC_BG: BgKind[] = ['mesh', 'noise', 'spotlight']
export const SIZED_BG: BgKind[] = ['dot-grid', 'grid-lines', 'stripes', 'starfield', 'waves', 'noise']

export interface BgEffectState {
  kind: BgKind
  c1: string
  c2: string
  c3: string
  base: string
  speed: number
  size: number
  intensity: number
  animate: boolean
}

export const bgEffectDefaults: BgEffectState = {
  kind: 'aurora',
  c1: '#6366f1',
  c2: '#22d3ee',
  c3: '#ec4899',
  base: '#0b1020',
  speed: 12,
  size: 24,
  intensity: 70,
  animate: true,
}

export const bgEffectPresets: Preset<BgEffectState>[] = [
  { id: 'aurora', patch: { kind: 'aurora', c1: '#6366f1', c2: '#22d3ee', c3: '#ec4899', base: '#0b1020' } },
  { id: 'animated-gradient', patch: { kind: 'animated-gradient', c1: '#ee7752', c2: '#e73c7e', c3: '#23a6d5' } },
  { id: 'mesh', patch: { kind: 'mesh', c1: '#f472b6', c2: '#818cf8', c3: '#34d399', base: '#fdf2f8' } },
  { id: 'blobs', patch: { kind: 'blobs', c1: '#8b5cf6', c2: '#06b6d4', c3: '#f43f5e', base: '#0f0a1e' } },
  { id: 'conic-spin', patch: { kind: 'conic-spin', c1: '#6366f1', c2: '#ec4899', c3: '#f59e0b' } },
  { id: 'dot-grid', patch: { kind: 'dot-grid', c1: '#94a3b8', base: '#ffffff', size: 20 } },
  { id: 'grid-lines', patch: { kind: 'grid-lines', c1: '#6366f1', base: '#0b1020', size: 32 } },
  { id: 'stripes', patch: { kind: 'stripes', c1: '#fde047', c2: '#1f2937', size: 28 } },
  { id: 'starfield', patch: { kind: 'starfield', c1: '#ffffff', base: '#020617', size: 24 } },
  { id: 'waves', patch: { kind: 'waves', c1: '#38bdf8', c2: '#6366f1', base: '#e0f2fe', size: 30 } },
  { id: 'noise', patch: { kind: 'noise', c1: '#f97316', c2: '#8b5cf6', base: '#1e1b4b', size: 30 } },
  { id: 'spotlight', patch: { kind: 'spotlight', c1: '#a78bfa', c2: '#22d3ee', base: '#030712' } },
]

const STARS = [
  [12, 18], [27, 72], [41, 33], [58, 85], [66, 12], [79, 48], [91, 77], [8, 55], [35, 92], [50, 50], [72, 28], [86, 6],
]

export function buildBgEffect(s: BgEffectState): CssResult {
  const i = s.intensity / 100
  const animated = s.animate && !STATIC_BG.includes(s.kind)
  const a = (hex: string, base = 30, span = 60) => alpha(hex, Math.round(base + span * i))
  const pan = keyframes('bg-pan', ['0%, 100% { background-position: 0% 50%; }', '50% { background-position: 100% 50%; }'])
  const scroll = keyframes('bg-scroll', ['to { background-position: var(--bg-size) var(--bg-size); }'])
  const decls: Decl[] = []
  const rules: Rule[] = []
  const extra: string[] = []
  const animate = (animation: string, frames: string) => {
    if (!animated) return
    decls.push(['animation', animation])
    extra.push(frames)
  }

  switch (s.kind) {
    case 'animated-gradient':
      decls.push(['background', `linear-gradient(-45deg, ${s.c1}, ${s.c2}, ${s.c3}, ${s.c1})`], ['background-size', '400% 400%'])
      animate(`bg-pan ${s.speed}s ease infinite`, pan)
      break
    case 'aurora':
      decls.push(
        ['background-color', s.base],
        ['background-image', `radial-gradient(ellipse at 20% 20%, ${a(s.c1)} 0, transparent 55%), radial-gradient(ellipse at 80% 0%, ${a(s.c2, 30, 50)} 0, transparent 50%), radial-gradient(ellipse at 60% 100%, ${a(s.c3, 30, 50)} 0, transparent 55%)`],
        ['background-size', '180% 180%'],
      )
      if (animated) {
        decls.push(['animation', `bg-drift ${s.speed}s ease-in-out infinite alternate`])
        extra.push(keyframes('bg-drift', ['from { background-position: 0% 0%; }', 'to { background-position: 100% 100%; }']))
      }
      break
    case 'mesh':
      decls.push(
        ['background-color', s.base],
        [
          'background-image',
          `radial-gradient(at 0% 0%, ${a(s.c1)} 0, transparent 50%), radial-gradient(at 100% 0%, ${a(s.c2)} 0, transparent 50%), radial-gradient(at 100% 100%, ${a(s.c3)} 0, transparent 50%), radial-gradient(at 0% 100%, ${a(mix(s.c1, s.c3, 0.5))} 0, transparent 50%)`,
        ],
      )
      break
    case 'blobs': {
      decls.push(
        ['position', 'relative'],
        ['overflow', 'hidden'],
        ['isolation', 'isolate'],
        ['background', `radial-gradient(circle at 50% 50%, ${alpha(s.c3, 35)} 0, transparent 60%), ${s.base}`],
      )
      const blob = (color: string): Decl[] => [
        ['content', '""'],
        ['position', 'absolute'],
        ['z-index', '-1'],
        ['width', '55%'],
        ['aspect-ratio', '1'],
        ['border-radius', '50%'],
        ['background', color],
        ['filter', `blur(${px(24 + 40 * i)})`],
        ['opacity', '0.8'],
      ]
      rules.push(
        rule('&::before', [...blob(s.c1), ['top', '-15%'], ['left', '-10%'], ...(animated ? ([['animation', `bg-blob ${s.speed}s ease-in-out infinite alternate`]] as Decl[]) : [])]),
        rule('&::after', [
          ...blob(s.c2),
          ['right', '-10%'],
          ['bottom', '-20%'],
          ...(animated ? ([['animation', `bg-blob ${s.speed}s ease-in-out infinite alternate-reverse`]] as Decl[]) : []),
        ]),
      )
      if (animated) extra.push(keyframes('bg-blob', ['from { transform: translate(0, 0) scale(1); }', 'to { transform: translate(20%, 15%) scale(1.15); }']))
      break
    }
    case 'conic-spin':
      decls.push(['background', `conic-gradient(from var(--bg-angle), ${s.c1}, ${s.c2}, ${s.c3}, ${s.c1})`])
      extra.push(property('--bg-angle', '<angle>', '0deg'))
      animate(`bg-spin ${s.speed}s linear infinite`, keyframes('bg-spin', ['to { --bg-angle: 360deg; }']))
      break
    case 'dot-grid':
    case 'grid-lines': {
      const line = a(s.c1, 25, 60)
      decls.push(['--bg-size', `${s.size}px`], ['background-color', s.base])
      decls.push(
        s.kind === 'dot-grid'
          ? ['background-image', `radial-gradient(${line} ${Math.max(1, Math.round(s.size / 12))}px, transparent ${Math.max(1, Math.round(s.size / 12))}px)`]
          : ['background-image', `linear-gradient(${line} 1px, transparent 1px), linear-gradient(90deg, ${line} 1px, transparent 1px)`],
        ['background-size', 'var(--bg-size) var(--bg-size)'],
      )
      animate(`bg-scroll ${s.speed}s linear infinite`, scroll)
      break
    }
    case 'stripes':
      decls.push(['background', `repeating-linear-gradient(45deg, ${s.c1} 0 ${s.size / 2}px, ${s.c2} ${s.size / 2}px ${s.size}px)`])
      if (animated) decls.push(['background-size', '200% 200%'])
      animate(`bg-pan ${s.speed}s linear infinite`, pan)
      break
    case 'starfield':
      decls.push(
        ['--bg-size', `${s.size * 8}px`],
        ['background-color', s.base],
        ['background-image', STARS.map(([x, y], n) => `radial-gradient(${n % 3 ? 1 : 2}px ${n % 3 ? 1 : 2}px at ${x}% ${y}%, ${a(s.c1, 50, 50)}, transparent)`).join(', ')],
        ['background-size', 'var(--bg-size) var(--bg-size)'],
      )
      animate(`bg-scroll ${s.speed}s linear infinite`, scroll)
      break
    case 'waves': {
      const wave = (color: string, opacity: number) =>
        svgUrl(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="120" viewBox="0 0 1200 120" preserveAspectRatio="none"><path d="M0 60 C150 100 350 0 600 60 C850 120 1050 20 1200 60 V120 H0 Z" fill="${color}" fill-opacity="${opacity}"/></svg>`)
      decls.push(
        ['background-color', s.base],
        ['background-image', `${wave(s.c1, Number((0.35 + 0.5 * i).toFixed(2)))}, ${wave(s.c2, Number((0.25 + 0.4 * i).toFixed(2)))}`],
        ['background-repeat', 'repeat-x'],
        ['background-position', '0 100%, 300px 100%'],
        ['background-size', `1200px ${s.size * 4}px, 1200px ${s.size * 3}px`],
      )
      if (animated) {
        decls.push(['animation', `bg-waves ${s.speed}s linear infinite`])
        extra.push(keyframes('bg-waves', ['to { background-position: 1200px 100%, -900px 100%; }']))
      }
      break
    }
    case 'noise': {
      const noise = svgUrl(
        `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#n)" opacity="${(0.1 + 0.4 * i).toFixed(2)}"/></svg>`,
      )
      decls.push(
        ['background-color', s.base],
        ['background-image', `${noise}, linear-gradient(135deg, ${alpha(s.c1, 60)}, ${alpha(s.c2, 60)})`],
        ['background-size', `${s.size * 6}px, cover`],
      )
      break
    }
    case 'spotlight':
      decls.push(['background', `radial-gradient(circle at 50% 0%, ${a(s.c1)} 0, transparent 60%), radial-gradient(circle at 50% 100%, ${a(s.c2, 15, 30)} 0, transparent 55%), ${s.base}`])
      break
  }

  if (animated) extra.push(reducedMotion())
  return { decls, rules, extra: extra.join('\n\n') || undefined }
}

// ---------------------------------------------------------------------------
// Text effects

export const TEXT_KINDS = [
  'gradient-flow',
  'shimmer',
  'neon-pulse',
  'glitch',
  'typewriter',
  'outline',
  'outline-fill',
  'highlight',
  'underline-grow',
  'blur-reveal',
  'rgb-split',
  'three-d',
  'marquee',
] as const

export type TextKind = (typeof TEXT_KINDS)[number]
export const STATIC_TEXT: TextKind[] = ['outline', 'rgb-split', 'three-d']

export interface TextEffectState {
  kind: TextKind
  text: string
  ink: string
  c1: string
  c2: string
  size: number
  weight: number
  speed: number
}

export const textEffectDefaults: TextEffectState = {
  kind: 'gradient-flow',
  text: 'Make it pop',
  ink: '#0f172a',
  c1: '#6366f1',
  c2: '#ec4899',
  size: 44,
  weight: 800,
  speed: 4,
}

export const textEffectPresets: Preset<TextEffectState>[] = TEXT_KINDS.map((kind) => ({ id: kind, patch: { kind } }))

export function buildTextEffect(s: TextEffectState): CssResult {
  const clip: Decl[] = [
    ['-webkit-background-clip', 'text'],
    ['background-clip', 'text'],
    ['color', 'transparent'],
  ]
  const base: Decl[] = [
    ['font-size', `${s.size}px`],
    ['font-weight', String(s.weight)],
    ['line-height', '1.1'],
  ]
  const rules: Rule[] = []
  const extra: string[] = []
  let decls: Decl[] = base
  const length = Math.max(1, [...s.text].length)

  switch (s.kind) {
    case 'gradient-flow':
      decls = merge(base, [['background', `linear-gradient(90deg, ${s.c1}, ${s.c2}, ${s.c1})`], ['background-size', '200% auto'], ...clip, ['animation', `text-flow ${s.speed}s linear infinite`]])
      extra.push(keyframes('text-flow', ['to { background-position: 200% center; }']))
      break
    case 'shimmer':
      decls = merge(base, [['background', `linear-gradient(110deg, ${s.c1} 35%, ${s.c2} 50%, ${s.c1} 65%)`], ['background-size', '250% 100%'], ...clip, ['animation', `text-shimmer ${s.speed}s linear infinite`]])
      extra.push(keyframes('text-shimmer', ['from { background-position: 150% 0; }', 'to { background-position: -100% 0; }']))
      break
    case 'neon-pulse':
      decls = merge(base, [
        ['color', mix(s.c1, '#ffffff', 0.7)],
        ['text-shadow', `0 0 4px #ffffff, 0 0 12px ${s.c1}, 0 0 24px ${s.c1}, 0 0 48px ${s.c2}`],
        ['animation', `text-flicker ${s.speed}s linear infinite`],
      ])
      extra.push(keyframes('text-flicker', ['0%, 18%, 22%, 25%, 53%, 57%, 100% { opacity: 1; }', '20%, 24%, 55% { opacity: 0.55; }']))
      break
    case 'glitch': {
      decls = merge(base, [['position', 'relative'], ['color', s.ink]])
      const layer = (color: string, name: string, direction: string): Decl[] => [
        ['content', 'attr(data-text)'],
        ['position', 'absolute'],
        ['inset', '0'],
        ['color', color],
        ['animation', `${name} ${s.speed / 2}s steps(2, end) infinite ${direction}`],
      ]
      rules.push(rule('&::before', layer(s.c1, 'text-glitch-a', 'alternate')), rule('&::after', layer(s.c2, 'text-glitch-b', 'alternate-reverse')))
      extra.push(
        '/* Markup: give the element a data-text attribute that repeats its text */',
        keyframes('text-glitch-a', [
          '0% { clip-path: inset(10% 0 80% 0); transform: translate(-3px, -1px); }',
          '25% { clip-path: inset(60% 0 15% 0); transform: translate(3px, 1px); }',
          '50% { clip-path: inset(35% 0 45% 0); transform: translate(-2px, 2px); }',
          '75% { clip-path: inset(80% 0 5% 0); transform: translate(2px, -2px); }',
          '100% { clip-path: inset(20% 0 65% 0); transform: translate(-3px, 1px); }',
        ]),
        keyframes('text-glitch-b', [
          '0% { clip-path: inset(70% 0 10% 0); transform: translate(3px, 1px); }',
          '25% { clip-path: inset(15% 0 70% 0); transform: translate(-3px, -1px); }',
          '50% { clip-path: inset(50% 0 30% 0); transform: translate(2px, -2px); }',
          '75% { clip-path: inset(5% 0 85% 0); transform: translate(-2px, 2px); }',
          '100% { clip-path: inset(40% 0 40% 0); transform: translate(3px, -1px); }',
        ]),
      )
      break
    }
    case 'typewriter':
      decls = merge(base, [
        ['display', 'inline-block'],
        ['overflow', 'hidden'],
        ['white-space', 'nowrap'],
        ['width', `${length}ch`],
        ['color', s.ink],
        ['font-family', 'ui-monospace, "Cascadia Code", monospace'],
        ['border-right', `0.08em solid ${s.c1}`],
        ['animation', `text-typing ${s.speed}s steps(${length}) infinite alternate, text-caret 0.75s step-end infinite`],
      ])
      extra.push(
        '/* The width is the text length in ch, so use a monospace font */',
        keyframes('text-typing', ['from { width: 0; }']),
        keyframes('text-caret', ['50% { border-color: transparent; }']),
      )
      break
    case 'outline':
      decls = merge(base, [['color', 'transparent'], ['-webkit-text-stroke', `${Math.max(1, Math.round(s.size / 36))}px ${s.c1}`]])
      break
    case 'outline-fill':
      decls = merge(base, [
        ['-webkit-text-stroke', `1px ${s.c1}`],
        ['background', `linear-gradient(90deg, ${s.c1}, ${s.c2}) left / 0% 100% no-repeat`],
        ...clip,
        ['transition', `background-size ${(s.speed / 6).toFixed(2)}s ease`],
      ])
      rules.push(rule('&:hover', [['background-size', '100% 100%']]))
      break
    case 'highlight':
      decls = merge(base, [
        ['color', s.ink],
        ['background', `linear-gradient(${alpha(s.c1, 45)}, ${alpha(s.c1, 45)}) 0 88% / 0% 40% no-repeat`],
        ['-webkit-box-decoration-break', 'clone'],
        ['box-decoration-break', 'clone'],
        ['animation', `text-highlight ${s.speed / 2}s ease-in-out infinite alternate`],
      ])
      extra.push(keyframes('text-highlight', ['to { background-size: 100% 40%; }']))
      break
    case 'underline-grow':
      decls = merge(base, [['position', 'relative'], ['display', 'inline-block'], ['color', s.ink]])
      rules.push(
        rule('&::after', [
          ['content', '""'],
          ['position', 'absolute'],
          ['left', '0'],
          ['bottom', '-0.08em'],
          ['width', '100%'],
          ['height', '0.08em'],
          ['background', `linear-gradient(90deg, ${s.c1}, ${s.c2})`],
          ['transform', 'scaleX(0)'],
          ['transform-origin', 'right'],
          ['transition', `transform ${(s.speed / 8).toFixed(2)}s ease`],
        ]),
        rule('&:hover::after', [['transform', 'scaleX(1)'], ['transform-origin', 'left']]),
      )
      break
    case 'blur-reveal':
      decls = merge(base, [['color', s.ink], ['animation', `text-blur-in ${s.speed / 2}s ease-out infinite alternate`]])
      extra.push(keyframes('text-blur-in', ['from { opacity: 0; filter: blur(12px); letter-spacing: 0.3em; }', 'to { opacity: 1; filter: blur(0); letter-spacing: 0; }']))
      break
    case 'rgb-split': {
      const o = Math.max(1, Math.round(s.size / 24))
      decls = merge(base, [['color', s.ink], ['text-shadow', `${o}px 0 ${alpha(s.c1, 85)}, -${o}px 0 ${alpha(s.c2, 85)}`]])
      break
    }
    case 'three-d': {
      const depth = Math.max(3, Math.round(s.size / 8))
      const layers = Array.from({ length: depth }, (_, k) => `${k + 1}px ${k + 1}px 0 ${mix(s.c1, '#000000', 0.25 + (k * 0.35) / depth)}`)
      decls = merge(base, [['color', s.c1], ['text-shadow', [...layers, `${depth + 2}px ${depth + 4}px 10px rgba(0, 0, 0, 0.3)`].join(', ')]])
      break
    }
    case 'marquee':
      decls = merge(base, [
        ['display', 'inline-block'],
        ['padding-left', '100%'],
        ['white-space', 'nowrap'],
        ['color', s.ink],
        ['animation', `text-marquee ${s.speed * 2}s linear infinite`],
      ])
      extra.push('/* Place the element inside a container with overflow: hidden */', keyframes('text-marquee', ['to { transform: translateX(-100%); }']))
      break
  }

  if (extra.some((e) => e.startsWith('@keyframes'))) extra.push(reducedMotion())
  return { decls, rules, extra: extra.join('\n\n') || undefined }
}

// ---------------------------------------------------------------------------
// Button effects

export const BUTTON_KINDS = ['glow', 'shimmer', 'gradient-border', 'liquid-fill', 'press-3d', 'pulse-ring', 'neon', 'slide-fill', 'gradient-shift', 'ripple'] as const
export type ButtonKind = (typeof BUTTON_KINDS)[number]

export interface ButtonEffectState {
  kind: ButtonKind
  label: string
  c1: string
  c2: string
  radius: number
  size: number
  speed: number
}

export const buttonEffectDefaults: ButtonEffectState = { kind: 'glow', label: 'Get started', c1: '#6366f1', c2: '#ec4899', radius: 12, size: 15, speed: 3 }

export const buttonEffectPresets: Preset<ButtonEffectState>[] = BUTTON_KINDS.map((kind) => ({ id: kind, patch: { kind } }))

export function buildButtonEffect(s: ButtonEffectState): CssResult {
  const fg = readableOn(s.c1)
  const base: Decl[] = [
    ['position', 'relative'],
    ['display', 'inline-flex'],
    ['align-items', 'center'],
    ['justify-content', 'center'],
    ['gap', '8px'],
    ['padding', `${px(s.size * 0.75)} ${px(s.size * 1.6)}`],
    ['font-family', 'inherit'],
    ['font-size', `${s.size}px`],
    ['font-weight', '600'],
    ['line-height', '1'],
    ['color', fg],
    ['border', 'none'],
    ['border-radius', `${s.radius}px`],
    ['cursor', 'pointer'],
    ['transition', 'transform 0.2s ease, box-shadow 0.25s ease, background 0.25s ease, color 0.25s ease'],
  ]
  const rules: Rule[] = []
  const extra: string[] = []
  let decls: Decl[] = base
  let hover: Decl[] = []
  let active: Decl[] = [['transform', 'scale(0.97)']]

  switch (s.kind) {
    case 'glow':
      decls = merge(base, [['background', `linear-gradient(135deg, ${s.c1}, ${s.c2})`], ['box-shadow', `0 4px 14px ${alpha(s.c1, 35)}`], ['color', '#ffffff']])
      hover = [['transform', 'translateY(-1px)'], ['box-shadow', `0 0 24px ${alpha(s.c1, 60)}, 0 0 48px ${alpha(s.c2, 35)}`]]
      break
    case 'shimmer':
      decls = merge(base, [['background', s.c1], ['overflow', 'hidden']])
      rules.push(
        rule('&::after', [
          ['content', '""'],
          ['position', 'absolute'],
          ['inset', '0'],
          ['background', `linear-gradient(110deg, transparent 30%, ${alpha('#ffffff', 45)} 50%, transparent 70%)`],
          ['transform', 'translateX(-100%)'],
          ['animation', `btn-shimmer ${s.speed}s ease-in-out infinite`],
          ['pointer-events', 'none'],
        ]),
      )
      hover = [['background', mix(s.c1, '#000000', 0.08)]]
      extra.push(keyframes('btn-shimmer', ['0% { transform: translateX(-100%); }', '60%, 100% { transform: translateX(100%); }']))
      break
    case 'gradient-border':
      decls = merge(base, [
        ['background', `linear-gradient(#0f172a, #0f172a) padding-box, conic-gradient(from var(--btn-angle), ${s.c1}, ${s.c2}, ${s.c1}) border-box`],
        ['border', '2px solid transparent'],
        ['color', '#ffffff'],
        ['animation', `btn-border-spin ${s.speed}s linear infinite`],
      ])
      hover = [['box-shadow', `0 0 20px ${alpha(s.c1, 45)}`]]
      extra.push(property('--btn-angle', '<angle>', '0deg'), keyframes('btn-border-spin', ['to { --btn-angle: 360deg; }']))
      break
    case 'liquid-fill':
      decls = merge(base, [['background', 'transparent'], ['border', `2px solid ${s.c1}`], ['color', s.c1], ['overflow', 'hidden'], ['isolation', 'isolate']])
      rules.push(
        rule('&::before', [
          ['content', '""'],
          ['position', 'absolute'],
          ['inset', '-2px'],
          ['z-index', '-1'],
          ['background', s.c1],
          ['border-radius', '45% 45% 0 0'],
          ['transform', 'translateY(105%)'],
          ['transition', `transform ${(s.speed / 5).toFixed(2)}s cubic-bezier(0.6, 0, 0.2, 1), border-radius ${(s.speed / 5).toFixed(2)}s ease`],
        ]),
        rule('&:hover::before', [['transform', 'translateY(0)'], ['border-radius', '0']]),
      )
      hover = [['color', fg]]
      break
    case 'press-3d': {
      const edge = mix(s.c1, '#000000', 0.35)
      decls = merge(base, [['background', s.c1], ['box-shadow', `0 6px 0 ${edge}, 0 8px 16px ${alpha('#000000', 25)}`], ['transition', 'transform 0.1s ease, box-shadow 0.1s ease']])
      hover = [['transform', 'translateY(-2px)'], ['box-shadow', `0 8px 0 ${edge}, 0 12px 20px ${alpha('#000000', 25)}`]]
      active = [['transform', 'translateY(6px)'], ['box-shadow', `0 0 0 ${edge}, 0 2px 4px ${alpha('#000000', 20)}`]]
      break
    }
    case 'pulse-ring':
      decls = merge(base, [['background', s.c1]])
      rules.push(
        rule('&::after', [
          ['content', '""'],
          ['position', 'absolute'],
          ['inset', '0'],
          ['border-radius', 'inherit'],
          ['box-shadow', `0 0 0 0 ${alpha(s.c1, 60)}`],
          ['animation', `btn-pulse ${(s.speed / 1.5).toFixed(2)}s ease-out infinite`],
          ['pointer-events', 'none'],
        ]),
      )
      extra.push(keyframes('btn-pulse', ['to { box-shadow: 0 0 0 14px transparent; }']))
      break
    case 'neon':
      decls = merge(base, [
        ['background', 'transparent'],
        ['border', `1px solid ${s.c1}`],
        ['color', mix(s.c1, '#ffffff', 0.3)],
        ['text-shadow', `0 0 8px ${alpha(s.c1, 80)}`],
        ['box-shadow', `0 0 8px ${alpha(s.c1, 50)}, inset 0 0 8px ${alpha(s.c1, 30)}`],
      ])
      hover = [['background', s.c1], ['color', '#0b0614'], ['text-shadow', 'none'], ['box-shadow', `0 0 16px ${s.c1}, 0 0 40px ${alpha(s.c1, 60)}`]]
      break
    case 'slide-fill':
      decls = merge(base, [
        ['background', `linear-gradient(90deg, ${s.c1}, ${s.c2}) left / 0% 100% no-repeat`],
        ['border', `2px solid ${s.c1}`],
        ['color', s.c1],
        ['transition', `background-size ${(s.speed / 6).toFixed(2)}s ease, color 0.25s ease, transform 0.2s ease`],
      ])
      hover = [['background-size', '100% 100%'], ['color', '#ffffff']]
      break
    case 'gradient-shift':
      decls = merge(base, [
        ['background', `linear-gradient(90deg, ${s.c1}, ${s.c2}, ${s.c1})`],
        ['background-size', '200% auto'],
        ['color', '#ffffff'],
        ['transition', `background-position ${(s.speed / 6).toFixed(2)}s ease, transform 0.2s ease`],
      ])
      hover = [['background-position', 'right center']]
      break
    case 'ripple':
      decls = merge(base, [['background', s.c1], ['overflow', 'hidden']])
      rules.push(
        rule('&::after', [
          ['content', '""'],
          ['position', 'absolute'],
          ['inset', '0'],
          ['background', `radial-gradient(circle, ${alpha('#ffffff', 45)} 10%, transparent 10.01%) center / 1000% 1000% no-repeat`],
          ['opacity', '0'],
          ['transition', 'background-size 0.5s ease, opacity 0.8s ease'],
          ['pointer-events', 'none'],
        ]),
        rule('&:active::after', [['background-size', '0% 0%'], ['opacity', '1'], ['transition', '0s']]),
      )
      break
  }

  if (hover.length) rules.unshift(rule('&:hover', hover))
  rules.push(rule('&:active', active), rule('&:focus-visible', [['outline', `2px solid ${s.c1}`], ['outline-offset', '3px']]))
  if (extra.some((e) => e.startsWith('@keyframes'))) extra.push(reducedMotion())
  return { decls, rules, extra: extra.join('\n\n') || undefined }
}

// ---------------------------------------------------------------------------
// Card hover effects

export const HOVER_KINDS = ['lift', 'tilt-3d', 'glow', 'border-spin', 'shine', 'gradient-border', 'spotlight', 'outline-offset', 'scale', 'grayscale'] as const
export type HoverKind = (typeof HOVER_KINDS)[number]

export interface HoverEffectState {
  kind: HoverKind
  accent: string
  mode: 'light' | 'dark'
  radius: number
  intensity: number
  duration: number
}

export const hoverEffectDefaults: HoverEffectState = { kind: 'lift', accent: '#6366f1', mode: 'light', radius: 16, intensity: 50, duration: 300 }

export const hoverEffectPresets: Preset<HoverEffectState>[] = HOVER_KINDS.map((kind) => ({ id: kind, patch: { kind } }))

export function buildHoverEffect(s: HoverEffectState): CssResult {
  const i = s.intensity / 100
  const dark = s.mode === 'dark'
  const bg = dark ? '#111827' : '#ffffff'
  const d = `${s.duration}ms`
  const A = s.accent
  const base: Decl[] = [
    ['position', 'relative'],
    ['padding', '20px'],
    ['border-radius', `${s.radius}px`],
    ['background', bg],
    ['border', `1px solid ${dark ? '#1f2937' : '#e2e8f0'}`],
    ['color', dark ? '#f8fafc' : '#0f172a'],
    ['transition', `transform ${d} ease, box-shadow ${d} ease, border-color ${d} ease, outline-offset ${d} ease, filter ${d} ease`],
  ]
  const rules: Rule[] = []
  const extra: string[] = []
  let decls = base
  let hover: Decl[] = []

  switch (s.kind) {
    case 'lift':
      hover = [['transform', `translateY(-${px(4 + 8 * i)})`], ['box-shadow', `0 ${px(12 + 16 * i)} ${px(24 + 24 * i)} -12px ${alpha('#0f172a', dark ? 70 : 35)}`]]
      break
    case 'tilt-3d':
      decls = merge(base, [['transform', 'perspective(800px) rotateX(0) rotateY(0)']])
      hover = [
        ['transform', `perspective(800px) rotateX(${Math.round(4 + 8 * i)}deg) rotateY(-${Math.round(6 + 10 * i)}deg)`],
        ['box-shadow', `${px(10 + 10 * i)} ${px(14 + 10 * i)} 30px -10px ${alpha('#0f172a', dark ? 70 : 30)}`],
      ]
      break
    case 'glow':
      hover = [['border-color', A], ['box-shadow', `0 0 0 1px ${alpha(A, 60)}, 0 0 ${px(20 + 30 * i)} ${alpha(A, 45)}`]]
      break
    case 'border-spin':
      decls = merge(base, [
        ['border', '1px solid transparent'],
        ['background', `linear-gradient(${bg}, ${bg}) padding-box, conic-gradient(from var(--card-angle), transparent 40%, ${A}, ${mix(A, '#ffffff', 0.4)}, transparent 60%) border-box`],
        ['animation', 'card-border-spin 4s linear infinite paused'],
      ])
      hover = [['animation-play-state', 'running']]
      extra.push(property('--card-angle', '<angle>', '0deg'), keyframes('card-border-spin', ['to { --card-angle: 360deg; }']), reducedMotion())
      break
    case 'shine':
      decls = merge(base, [['overflow', 'hidden']])
      rules.push(
        rule('&::after', [
          ['content', '""'],
          ['position', 'absolute'],
          ['inset', '0'],
          ['background', `linear-gradient(115deg, transparent 30%, ${alpha('#ffffff', dark ? 18 : 65)} 50%, transparent 70%)`],
          ['transform', 'translateX(-100%)'],
          ['transition', `transform ${s.duration * 2}ms ease`],
          ['pointer-events', 'none'],
        ]),
        rule('&:hover::after', [['transform', 'translateX(100%)']]),
      )
      break
    case 'gradient-border':
      rules.push(
        rule('&::before', [
          ['content', '""'],
          ['position', 'absolute'],
          ['inset', '-1px'],
          ['padding', `${Math.max(1, Math.round(1 + 2 * i))}px`],
          ['border-radius', 'inherit'],
          ['background', `linear-gradient(135deg, ${A}, ${mix(A, '#ec4899', 0.6)}, ${mix(A, '#22d3ee', 0.6)})`],
          ['-webkit-mask', 'linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)'],
          ['-webkit-mask-composite', 'xor'],
          ['mask-composite', 'exclude'],
          ['opacity', '0'],
          ['transition', `opacity ${d} ease`],
          ['pointer-events', 'none'],
        ]),
        rule('&:hover::before', [['opacity', '1']]),
      )
      break
    case 'spotlight':
      decls = merge(base, [['overflow', 'hidden'], ['isolation', 'isolate']])
      rules.push(
        rule('&::before', [
          ['content', '""'],
          ['position', 'absolute'],
          ['inset', '0'],
          ['z-index', '-1'],
          ['background', `radial-gradient(circle at 50% 0%, ${alpha(A, Math.round(20 + 40 * i))}, transparent 65%)`],
          ['opacity', '0'],
          ['transition', `opacity ${d} ease`],
        ]),
        rule('&:hover::before', [['opacity', '1']]),
      )
      hover = [['border-color', alpha(A, 50)]]
      break
    case 'outline-offset':
      decls = merge(base, [['outline', '2px solid transparent'], ['outline-offset', '0']])
      hover = [['outline-color', A], ['outline-offset', px(3 + 5 * i)]]
      break
    case 'scale':
      hover = [['transform', `scale(${(1.02 + 0.06 * i).toFixed(2)})`], ['box-shadow', `0 ${px(10 + 10 * i)} ${px(24 + 16 * i)} ${alpha('#0f172a', dark ? 60 : 18)}`]]
      break
    case 'grayscale':
      decls = merge(base, [['filter', 'grayscale(100%)']])
      hover = [['filter', 'grayscale(0)'], ['border-color', A]]
      break
  }

  if (hover.length) rules.unshift(rule('&:hover', hover))
  if (s.kind === 'lift' || s.kind === 'tilt-3d' || s.kind === 'scale') {
    extra.push('@media (prefers-reduced-motion: reduce) {\n  &,\n  &:hover {\n    transform: none;\n  }\n}')
  }
  return { decls, rules, extra: extra.join('\n\n') || undefined }
}

// ---------------------------------------------------------------------------
// Loaders

export const LOADER_KINDS = ['spinner', 'dual-ring', 'dots', 'bars', 'pulse', 'orbit', 'square', 'progress', 'skeleton'] as const
export type LoaderKind = (typeof LOADER_KINDS)[number]

export interface LoaderState {
  kind: LoaderKind
  c1: string
  c2: string
  size: number
  thickness: number
  speed: number
}

export const loaderDefaults: LoaderState = { kind: 'spinner', c1: '#6366f1', c2: '#e2e8f0', size: 40, thickness: 4, speed: 1 }

export const loaderPresets: Preset<LoaderState>[] = LOADER_KINDS.map((kind) => ({ id: kind, patch: { kind } }))

export function buildLoader(s: LoaderState): CssResult {
  const t = s.thickness
  const sec = (n: number) => `${Number((s.speed * n).toFixed(2))}s`
  const spin = keyframes('loader-spin', ['to { transform: rotate(360deg); }'])
  const square: Decl[] = [['width', px(s.size)], ['height', px(s.size)]]
  const rules: Rule[] = []
  const extra: string[] = ['/* Give the element role="status" and aria-label="Loading" */']
  let decls: Decl[] = []

  switch (s.kind) {
    case 'spinner':
      decls = [...square, ['border', `${t}px solid ${s.c2}`], ['border-top-color', s.c1], ['border-radius', '50%'], ['animation', `loader-spin ${sec(1)} linear infinite`]]
      extra.push(spin)
      break
    case 'dual-ring':
      decls = [
        ...square,
        ['position', 'relative'],
        ['border', `${t}px solid transparent`],
        ['border-top-color', s.c1],
        ['border-bottom-color', s.c1],
        ['border-radius', '50%'],
        ['animation', `loader-spin ${sec(1)} linear infinite`],
      ]
      rules.push(
        rule('&::after', [
          ['content', '""'],
          ['position', 'absolute'],
          ['inset', `${t}px`],
          ['border', `${t}px solid transparent`],
          ['border-left-color', s.c2],
          ['border-right-color', s.c2],
          ['border-radius', '50%'],
          ['animation', `loader-spin ${sec(0.6)} linear infinite reverse`],
        ]),
      )
      extra.push(spin)
      break
    case 'dots': {
      const dot = Math.max(6, Math.round(s.size / 4))
      const gap = Math.round(dot * 1.6)
      const dotDecls = (delay: number): Decl[] => [
        ['width', `${dot}px`],
        ['height', `${dot}px`],
        ['border-radius', '50%'],
        ['background', s.c1],
        ['animation', `loader-dot ${sec(1.2)} ease-in-out infinite both`],
        ['animation-delay', `${Number((-s.speed * delay).toFixed(2))}s`],
      ]
      decls = [['position', 'relative'], ...dotDecls(0.16)]
      rules.push(
        rule('&::before', [['content', '""'], ['position', 'absolute'], ['top', '0'], ['left', `-${gap}px`], ...dotDecls(0.32)]),
        rule('&::after', [['content', '""'], ['position', 'absolute'], ['top', '0'], ['left', `${gap}px`], ...dotDecls(0)]),
      )
      extra.push(keyframes('loader-dot', ['0%, 80%, 100% { transform: scale(0.4); opacity: 0.5; }', '40% { transform: scale(1); opacity: 1; }']))
      break
    }
    case 'bars':
      decls = [
        ...square,
        ['background', `linear-gradient(${s.c1} 0 0) 0% 50%, linear-gradient(${s.c1} 0 0) 50% 50%, linear-gradient(${s.c1} 0 0) 100% 50%`],
        ['background-repeat', 'no-repeat'],
        ['background-size', '20% 100%'],
        ['animation', `loader-bars ${sec(1)} linear infinite`],
      ]
      extra.push(
        keyframes('loader-bars', [
          '0%, 100% { background-size: 20% 100%, 20% 100%, 20% 100%; }',
          '33% { background-size: 20% 15%, 20% 100%, 20% 100%; }',
          '50% { background-size: 20% 100%, 20% 15%, 20% 100%; }',
          '66% { background-size: 20% 100%, 20% 100%, 20% 15%; }',
        ]),
      )
      break
    case 'pulse':
      decls = [...square, ['border-radius', '50%'], ['background', s.c1], ['animation', `loader-pulse ${sec(1.2)} ease-out infinite`]]
      extra.push(keyframes('loader-pulse', ['from { transform: scale(0.2); opacity: 1; }', 'to { transform: scale(1); opacity: 0; }']))
      break
    case 'orbit': {
      const dot = t * 2 + 4
      decls = [...square, ['position', 'relative'], ['border', `${t}px solid ${s.c2}`], ['border-radius', '50%'], ['animation', `loader-spin ${sec(1.2)} linear infinite`]]
      rules.push(
        rule('&::before', [
          ['content', '""'],
          ['position', 'absolute'],
          ['top', `${-(dot / 2 + t / 2)}px`],
          ['left', '50%'],
          ['width', `${dot}px`],
          ['height', `${dot}px`],
          ['margin-left', `${-dot / 2}px`],
          ['border-radius', '50%'],
          ['background', s.c1],
        ]),
      )
      extra.push(spin)
      break
    }
    case 'square':
      decls = [['width', px(s.size * 0.7)], ['height', px(s.size * 0.7)], ['background', s.c1], ['border-radius', `${Math.round(t)}px`], ['animation', `loader-flip ${sec(1.2)} ease-in-out infinite`]]
      extra.push(
        keyframes('loader-flip', [
          '0% { transform: perspective(120px) rotateX(0) rotateY(0); }',
          '50% { transform: perspective(120px) rotateX(-180deg) rotateY(0); }',
          '100% { transform: perspective(120px) rotateX(-180deg) rotateY(-180deg); }',
        ]),
      )
      break
    case 'progress':
      decls = [['position', 'relative'], ['width', px(s.size * 4)], ['height', `${t}px`], ['overflow', 'hidden'], ['border-radius', '999px'], ['background', s.c2]]
      rules.push(
        rule('&::before', [
          ['content', '""'],
          ['position', 'absolute'],
          ['top', '0'],
          ['bottom', '0'],
          ['left', '0'],
          ['width', '40%'],
          ['border-radius', 'inherit'],
          ['background', s.c1],
          ['animation', `loader-progress ${sec(1.5)} ease-in-out infinite`],
        ]),
      )
      extra.push(keyframes('loader-progress', ['from { transform: translateX(-100%); }', 'to { transform: translateX(250%); }']))
      break
    case 'skeleton':
      decls = [
        ['width', px(s.size * 4)],
        ['height', px(Math.max(t * 3, 12))],
        ['border-radius', '8px'],
        ['background', `linear-gradient(90deg, ${s.c2} 25%, ${mix(s.c2, '#ffffff', 0.6)} 50%, ${s.c2} 75%)`],
        ['background-size', '200% 100%'],
        ['animation', `loader-shimmer ${sec(1.5)} linear infinite`],
      ]
      extra.push(keyframes('loader-shimmer', ['from { background-position: 200% 0; }', 'to { background-position: -200% 0; }']))
      break
  }

  extra.push(reducedMotion(`animation-duration: ${sec(3)};`))
  return { decls, rules, extra: extra.join('\n\n') }
}
