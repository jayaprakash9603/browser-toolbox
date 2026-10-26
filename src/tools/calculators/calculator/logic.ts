import { evaluate } from '@/core/engines/calc'

export type CalcMode = 'standard' | 'scientific'

export type KeyKind = 'digit' | 'op' | 'fn' | 'action' | 'const'

export interface CalcKey {
  id: string
  label: string
  kind: KeyKind
  /** Text appended to the expression (actions handled in the tool). */
  append?: string
  wide?: boolean
  title?: string
}

const FN_NAMES = ['sqrt', 'sin', 'cos', 'tan', 'ln', 'log', 'abs', 'exp', 'floor', 'ceil', 'round'] as const

export function formatResult(value: number): string {
  if (!Number.isFinite(value)) return 'Error'
  if (Number.isInteger(value) && Math.abs(value) < 1e14) return String(value)
  const fixed = Number(value.toPrecision(10))
  return String(fixed)
}

export function livePreview(expr: string): { ok: true; value: string } | { ok: false; error: string } | null {
  const trimmed = expr.trim()
  if (!trimmed) return null
  const out = evaluate(trimmed)
  if (!out.ok) return { ok: false, error: out.error }
  return { ok: true, value: formatResult(out.value) }
}

export function backspaceExpr(expr: string): string {
  if (!expr) return ''
  for (const fn of [...FN_NAMES].sort((a, b) => b.length - a.length)) {
    if (expr.endsWith(fn)) return expr.slice(0, -fn.length)
  }
  return expr.slice(0, -1)
}

export function negateExpr(expr: string): string {
  const trimmed = expr.trim()
  if (!trimmed) return '-'
  if (trimmed.startsWith('(-') && trimmed.endsWith(')')) return trimmed.slice(2, -1)
  return `(-${trimmed})`
}

export function appendKey(expr: string, key: CalcKey): string {
  if (!key.append) return expr
  if (key.kind === 'fn') return `${expr}${key.append}(`
  return `${expr}${key.append}`
}

export function keyboardToKeyId(event: KeyboardEvent): string | null {
  const { key, shiftKey } = event
  if (key === 'Enter' || key === '=') return 'equals'
  if (key === 'Backspace') return 'backspace'
  if (key === 'Escape') return 'clear'
  if (key === 'Delete') return 'clear'
  if (key >= '0' && key <= '9') return key
  if (key === '.') return 'dot'
  if (key === '+') return 'add'
  if (key === '-') return 'sub'
  if (key === '*') return 'mul'
  if (key === '/') return 'div'
  if (key === '%') return 'mod'
  if (key === '(') return 'lparen'
  if (key === ')') return 'rparen'
  if (key === '^') return 'pow'
  if (shiftKey && key === 'P') return 'const-pi'
  return null
}

export const SCIENTIFIC_ROW: CalcKey[] = [
  { id: 'sin', label: 'sin', kind: 'fn', append: 'sin' },
  { id: 'cos', label: 'cos', kind: 'fn', append: 'cos' },
  { id: 'tan', label: 'tan', kind: 'fn', append: 'tan' },
  { id: 'ln', label: 'ln', kind: 'fn', append: 'ln' },
  { id: 'log', label: 'log', kind: 'fn', append: 'log' },
  { id: 'sqrt', label: '√', kind: 'fn', append: 'sqrt', title: 'Square root' },
  { id: 'pow', label: 'xʸ', kind: 'op', append: '^', title: 'Power' },
  { id: 'abs', label: '|x|', kind: 'fn', append: 'abs', title: 'Absolute value' },
  { id: 'exp', label: 'eˣ', kind: 'fn', append: 'exp', title: 'Exponent' },
  { id: 'floor', label: '⌊x⌋', kind: 'fn', append: 'floor' },
  { id: 'ceil', label: '⌈x⌉', kind: 'fn', append: 'ceil' },
  { id: 'const-pi', label: 'π', kind: 'const', append: 'pi' },
  { id: 'const-e', label: 'e', kind: 'const', append: 'e' },
]

export const KEYPAD_ROWS: CalcKey[][] = [
  [
    { id: 'lparen', label: '(', kind: 'op', append: '(' },
    { id: 'rparen', label: ')', kind: 'op', append: ')' },
    { id: 'mod', label: '%', kind: 'op', append: '%', title: 'Modulo' },
    { id: 'backspace', label: '⌫', kind: 'action', title: 'Backspace' },
  ],
  [
    { id: '7', label: '7', kind: 'digit', append: '7' },
    { id: '8', label: '8', kind: 'digit', append: '8' },
    { id: '9', label: '9', kind: 'digit', append: '9' },
    { id: 'div', label: '÷', kind: 'op', append: '/' },
  ],
  [
    { id: '4', label: '4', kind: 'digit', append: '4' },
    { id: '5', label: '5', kind: 'digit', append: '5' },
    { id: '6', label: '6', kind: 'digit', append: '6' },
    { id: 'mul', label: '×', kind: 'op', append: '*' },
  ],
  [
    { id: '1', label: '1', kind: 'digit', append: '1' },
    { id: '2', label: '2', kind: 'digit', append: '2' },
    { id: '3', label: '3', kind: 'digit', append: '3' },
    { id: 'sub', label: '−', kind: 'op', append: '-' },
  ],
  [
    { id: 'clear', label: 'AC', kind: 'action', title: 'All clear' },
    { id: '0', label: '0', kind: 'digit', append: '0' },
    { id: 'dot', label: '.', kind: 'digit', append: '.' },
    { id: 'add', label: '+', kind: 'op', append: '+' },
  ],
  [
    { id: 'negate', label: '±', kind: 'action', title: 'Negate' },
    { id: 'ans', label: 'Ans', kind: 'action', title: 'Last result' },
    { id: 'equals', label: '=', kind: 'action', wide: true, title: 'Equals' },
  ],
]

export const MEMORY_KEYS: CalcKey[] = [
  { id: 'mc', label: 'MC', kind: 'action', title: 'Memory clear' },
  { id: 'mr', label: 'MR', kind: 'action', title: 'Memory recall' },
  { id: 'm-minus', label: 'M−', kind: 'action', title: 'Memory subtract' },
  { id: 'm-plus', label: 'M+', kind: 'action', title: 'Memory add' },
]
