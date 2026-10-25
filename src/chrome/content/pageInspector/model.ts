export type Decl = [property: string, value: string]

export interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

export interface Guide {
  x1: number
  y1: number
  x2: number
  y2: number
  value: number
}

export type OutlineMode = 'single' | 'depth'

export interface PageInspectorOptions {
  enabled: boolean
  outlines: boolean
  outlineMode: OutlineMode
  hoverInfo: boolean
  boxModel: boolean
  guides: boolean
  select: boolean
  move: boolean
  resize: boolean
  textEdit: boolean
}

export interface PageInspectorState {
  options: PageInspectorOptions
  changes: number
  canUndo: boolean
  selected: string | null
}

export const DEFAULT_INSPECTOR_OPTIONS: PageInspectorOptions = {
  enabled: false,
  outlines: true,
  outlineMode: 'single',
  hoverInfo: true,
  boxModel: true,
  guides: true,
  select: true,
  move: true,
  resize: true,
  textEdit: true,
}

/** Text shown inside the on-page overlay; the side panel sends translated versions. */
export const DEFAULT_INSPECTOR_LABELS = {
  styles: 'Styles',
  code: 'Code',
  box: 'Box',
  layout: 'Layout',
  spacing: 'Spacing',
  type: 'Typography',
  visual: 'Visual',
  parent: 'Select parent (Alt+↑)',
  editText: 'Edit text (Enter)',
  duplicate: 'Duplicate',
  hide: 'Hide',
  delete: 'Delete (Del)',
  undo: 'Undo (Ctrl+Z)',
  close: 'Deselect (Esc)',
  minimize: 'Collapse panel',
  expand: 'Expand panel',
  copyCss: 'Copy CSS',
  copySelector: 'Copy selector',
  copyHtml: 'Copy HTML',
  copied: 'Copied',
  hintSelect: 'Click to select',
  hintEdit: 'Drag to move · double-click to edit text',
  codeHint: 'Edit any value and it applies to the page right away.',
  editing: 'Editing text. Press Esc when done.',
  margin: 'margin',
  border: 'border',
  padding: 'padding',
  noteText: 'text content was edited',
  noteRemoved: 'element was deleted',
}

export type InspectorLabels = typeof DEFAULT_INSPECTOR_LABELS

export type InspectorAction = 'undo' | 'reset' | 'deselect' | 'export'

export const STYLE_GROUPS = [
  { id: 'layout', props: ['display', 'position', 'top', 'left', 'z-index', 'width', 'height', 'flex-direction', 'justify-content', 'align-items', 'gap', 'grid-template-columns'] },
  { id: 'spacing', props: ['margin', 'padding'] },
  { id: 'type', props: ['font-family', 'font-size', 'font-weight', 'line-height', 'letter-spacing', 'color', 'text-align', 'text-transform'] },
  { id: 'visual', props: ['background-color', 'background-image', 'border', 'border-radius', 'box-shadow', 'opacity', 'transform', 'translate', 'overflow'] },
] as const

export const COLOR_PROPS = new Set(['color', 'background-color'])

const DEFAULTS: Record<string, (value: string) => boolean> = {
  position: (v) => v === 'static',
  top: (v) => v === 'auto',
  left: (v) => v === 'auto',
  'z-index': (v) => v === 'auto',
  gap: (v) => v === 'normal' || v === 'normal normal',
  'grid-template-columns': (v) => v === 'none',
  margin: (v) => /^0px( 0px)*$/.test(v),
  padding: (v) => /^0px( 0px)*$/.test(v),
  'letter-spacing': (v) => v === 'normal',
  'text-align': (v) => v === 'start',
  'text-transform': (v) => v === 'none',
  'background-color': (v) => v === 'rgba(0, 0, 0, 0)' || v === 'transparent',
  'background-image': (v) => v === 'none',
  border: (v) => /^0px none/.test(v) || /^medium none/.test(v),
  'border-radius': (v) => /^0px( 0px)*$/.test(v),
  'box-shadow': (v) => v === 'none',
  opacity: (v) => v === '1',
  transform: (v) => v === 'none',
  translate: (v) => v === 'none',
  overflow: (v) => v === 'visible' || v === 'visible visible',
}

const FLEX_PROPS = new Set(['flex-direction', 'justify-content', 'align-items'])

/** Props worth showing for an element, given its display and position. */
export function relevantProps(display: string, position: string): string[] {
  const flex = display.includes('flex')
  const grid = display.includes('grid')
  return STYLE_GROUPS.flatMap((group) => group.props as readonly string[]).filter((prop) => {
    if (FLEX_PROPS.has(prop)) return flex || (grid && prop !== 'flex-direction')
    if (prop === 'gap') return flex || grid
    if (prop === 'grid-template-columns') return grid
    if (prop === 'top' || prop === 'left' || prop === 'z-index') return position !== 'static'
    return true
  })
}

/** Rounds long decimals in CSS values: `12.3456px` becomes `12.35px`. */
export function tidyValue(value: string): string {
  return value.replace(/(-?\d+\.\d{3,})/g, (n) => String(Math.round(Number(n) * 100) / 100))
}

/** The meaningful computed CSS of an element: non-default values of the inspected properties. */
export function elementCss(get: (prop: string) => string): Decl[] {
  const props = relevantProps(get('display'), get('position'))
  const out: Decl[] = []
  for (const prop of props) {
    const value = get(prop).trim()
    if (!value || DEFAULTS[prop]?.(value)) continue
    out.push([prop, tidyValue(value)])
  }
  return out
}

/** `rgb()`/`rgba()` to `#rrggbb`; colours with transparency keep their original form. */
export function toHex(value: string): string {
  const match = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)(?:[,\s/]+([\d.]+%?))?\s*\)$/.exec(value.trim())
  if (!match) return value
  const alpha = match[4] === undefined ? 1 : match[4].endsWith('%') ? Number.parseFloat(match[4]) / 100 : Number(match[4])
  if (alpha < 1) return value
  return `#${[match[1], match[2], match[3]].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`
}

/** Parses `prop: value; prop: value` text, ignoring comments and invalid lines. */
export function parseDeclarations(text: string): Decl[] {
  const out: Decl[] = []
  for (const part of text.replace(/\/\*[\s\S]*?\*\//g, '').split(/;(?![^(]*\))/)) {
    const colon = part.indexOf(':')
    if (colon < 0) continue
    const prop = part.slice(0, colon).trim().toLowerCase()
    const value = part.slice(colon + 1).trim()
    if (/^-{0,2}[a-z][\w-]*$/.test(prop) && value) out.push([prop, value])
  }
  return out
}

export function serializeDeclarations(decls: Decl[], indent = ''): string {
  return decls.map(([prop, value]) => `${indent}${prop}: ${value};`).join('\n')
}

/** Inline declarations that are new or changed compared with the original `style` attribute. */
export function diffInline(original: string, current: string): Decl[] {
  const before = new Map(parseDeclarations(original))
  return parseDeclarations(current).filter(([prop, value]) => before.get(prop) !== value)
}

export interface ChangeRule {
  selector: string
  decls: Decl[]
  notes?: string[]
}

export function changesToCss(rules: ChangeRule[]): string {
  return rules
    .filter((rule) => rule.decls.length || rule.notes?.length)
    .map((rule) => {
      const notes = (rule.notes ?? []).map((note) => `  /* ${note.replace(/\*\//g, '')} */`)
      return `${rule.selector} {\n${[...notes, serializeDeclarations(rule.decls, '  ')].filter(Boolean).join('\n')}\n}`
    })
    .join('\n\n')
}

/** Reads `translate` as pixel offsets; anything else counts as zero. */
export function parseTranslate(value: string): { x: number; y: number } {
  const [x = '0', y = '0'] = value === 'none' ? [] : value.trim().split(/\s+/)
  const px = (part: string) => (part.endsWith('px') || /^-?[\d.]+$/.test(part) ? Number.parseFloat(part) || 0 : 0)
  return { x: px(x), y: px(y) }
}

const round = (n: number) => Math.round(n)

/** Distance guides between a selected box `a` and a hovered box `b`. */
export function measureGaps(a: Box, b: Box): Guide[] {
  const guides: Guide[] = []
  const push = (x1: number, y1: number, x2: number, y2: number) => {
    const value = round(Math.abs(x2 - x1) + Math.abs(y2 - y1))
    if (value >= 1) guides.push({ x1, y1, x2, y2, value })
  }
  const midY = (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2
  const midX = (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2
  const ay = Math.max(a.top, b.top) < Math.min(a.bottom, b.bottom) ? midY : (a.top + a.bottom) / 2
  const ax = Math.max(a.left, b.left) < Math.min(a.right, b.right) ? midX : (a.left + a.right) / 2

  const apartX = b.left >= a.right || a.left >= b.right
  const apartY = b.top >= a.bottom || a.top >= b.bottom

  if (b.left >= a.right) push(a.right, ay, b.left, ay)
  else if (a.left >= b.right) push(b.right, ay, a.left, ay)
  else if (!apartY && b.left <= a.left && b.right >= a.right) {
    push(b.left, ay, a.left, ay)
    push(a.right, ay, b.right, ay)
  } else if (!apartY && a.left <= b.left && a.right >= b.right) {
    push(a.left, ay, b.left, ay)
    push(b.right, ay, a.right, ay)
  }

  if (b.top >= a.bottom) push(ax, a.bottom, ax, b.top)
  else if (a.top >= b.bottom) push(ax, b.bottom, ax, a.top)
  else if (!apartX && b.top <= a.top && b.bottom >= a.bottom) {
    push(ax, b.top, ax, a.top)
    push(ax, a.bottom, ax, b.bottom)
  } else if (!apartX && a.top <= b.top && a.bottom >= b.bottom) {
    push(ax, a.top, ax, b.top)
    push(ax, b.bottom, ax, a.bottom)
  }
  return guides
}

const DEPTH_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899']

/** Page stylesheet that outlines every element except the inspector's own host. */
export function outlineCss(mode: OutlineMode, hostId: string): string {
  const not = `:not(#${hostId})`
  if (mode === 'single') return `*${not} { outline: 1px solid rgba(239, 68, 68, 0.4) !important; outline-offset: -1px !important; }`
  return DEPTH_COLORS.map((color, depth) => `${['html', ...Array(depth + 1).fill('*')].join(' ')}${not} { outline: 1px solid ${color}99 !important; outline-offset: -1px !important; }`).join('\n')
}

/** Short `tag#id.class` label. */
export function elementLabel(tag: string, id: string, classes: string[]): string {
  return `${tag}${id ? `#${id}` : ''}${classes.slice(0, 2).map((c) => `.${c}`).join('')}`
}
