import { isSafeSelector, PROCEDURAL_RE } from './parseFilter.mjs'

/**
 * uBO procedural cosmetic filters, compiled at build time into a small JSON task the page-side
 * engine evaluates: `{ sel, ops: [[op, ...args]], action? }`. Anything that does not parse or
 * validate is dropped here, so the page never sees a filter it would have to reject.
 */

const OP_ALIASES = {
  'has-text': 'has-text',
  contains: 'has-text',
  '-abp-contains': 'has-text',
  has: 'has',
  '-abp-has': 'has',
  if: 'has',
  not: 'not',
  'if-not': 'not',
  upward: 'upward',
  'nth-ancestor': 'upward',
  'matches-css': 'matches-css',
  'matches-css-before': 'matches-css',
  'matches-css-after': 'matches-css',
  'matches-attr': 'matches-attr',
  'matches-path': 'matches-path',
  'matches-media': 'matches-media',
  'min-text-length': 'min-text-length',
  xpath: 'xpath',
  others: 'others',
  'watch-attr': 'watch-attr',
  shadow: 'shadow',
  spath: 'spath',
  style: 'style',
  remove: 'remove',
  'remove-attr': 'remove-attr',
  'remove-class': 'remove-class',
}
const ACTIONS = new Set(['style', 'remove', 'remove-attr', 'remove-class'])
/** Native CSS pseudo-classes that only become procedural when their argument is. */
const SELECTOR_ARG_OPS = new Set(['has', '-abp-has', 'if', 'not', 'if-not'])
const TEXT_ARG_OPS = new Set([
  'has-text',
  'contains',
  '-abp-contains',
  'matches-css',
  'matches-css-before',
  'matches-css-after',
  'matches-attr',
  'matches-path',
  'matches-media',
  'min-text-length',
  'upward',
  'nth-ancestor',
  'xpath',
  'style',
  'remove-attr',
  'remove-class',
  'watch-attr',
])
const MAX_LENGTH = 1500

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** `/re/flags` or a literal (substring, or whole value when `exact`). Null when it will not compile. */
function textPattern(raw, exact = false) {
  const value = raw.trim()
  const m = /^\/(.+)\/([imsu]*)$/.exec(value)
  const source = m ? m[1] : exact ? `^${escapeRe(value)}$` : escapeRe(value)
  const flags = m ? m[2] : ''
  try {
    new RegExp(source, flags)
  } catch {
    return null
  }
  return [source, flags]
}

/**
 * uBO rejects `:style()` declarations that could load resources or escape the rule; the same
 * checks apply here.
 */
export function isSafeDeclaration(decl) {
  const value = decl.trim()
  if (!value || value.length > 1000) return false
  return !/[{}\\<>]|\/\*|url\s*\(|image-set\s*\(|image\s*\(|expression\s*\(|@import/i.test(value)
}

/** Reads a balanced `( ... )` argument; quotes only matter inside selector arguments. */
function readArg(s, open, quoteAware) {
  let depth = 1
  let quote = ''
  for (let i = open + 1; i < s.length; i++) {
    const c = s[i]
    if (c === '\\') {
      i++
      continue
    }
    if (quote) {
      if (c === quote) quote = ''
      continue
    }
    if (quoteAware && (c === '"' || c === "'")) quote = c
    else if (c === '(') depth++
    else if (c === ')' && --depth === 0) return i
  }
  return -1
}

export function hasProcedural(s) {
  return PROCEDURAL_RE.test(s)
}

/** Next top-level procedural operator at or after `from`, or null. */
function findOp(s, from) {
  let bracket = 0
  let paren = 0
  let quote = ''
  for (let i = from; i < s.length; i++) {
    const c = s[i]
    if (c === '\\') {
      i++
      continue
    }
    if (quote) {
      if (c === quote) quote = ''
      continue
    }
    if (c === '"' || c === "'") {
      if (bracket) quote = c
      continue
    }
    if (c === '[') bracket++
    else if (c === ']') bracket--
    else if (c === '(') paren++
    else if (c === ')') paren--
    else if (c === ':' && !bracket && !paren) {
      const m = /^:(-abp-[a-z-]+|[a-z][a-z-]*)\(/.exec(s.slice(i))
      if (!m || !(m[1] in OP_ALIASES)) continue
      const open = i + m[0].length - 1
      const close = readArg(s, open, !TEXT_ARG_OPS.has(m[1]))
      if (close === -1) return { invalid: true }
      const arg = s.slice(open + 1, close)
      if (SELECTOR_ARG_OPS.has(m[1]) && !hasProcedural(arg)) {
        i = close
        continue
      }
      return { index: i, name: m[1], arg, end: close + 1 }
    }
  }
  return null
}

function compileOp(name, arg) {
  const op = OP_ALIASES[name]
  switch (op) {
    case 'has-text': {
      const p = textPattern(arg)
      return p && arg.trim() ? ['has-text', ...p] : null
    }
    case 'has':
    case 'not': {
      const value = arg.trim()
      const sub = compileTask(value.startsWith('>') ? `:scope ${value}` : value, true)
      return sub ? [op, sub] : null
    }
    case 'upward': {
      const value = arg.trim()
      if (/^\d+$/.test(value)) {
        const n = Number(value)
        return n >= 1 && n <= 256 ? ['upward', n] : null
      }
      return name === 'upward' && isSafeSelector(value) ? ['upward', value] : null
    }
    case 'matches-css': {
      const colon = arg.indexOf(':')
      if (colon === -1) return null
      const prop = arg.slice(0, colon).trim().toLowerCase()
      const p = textPattern(arg.slice(colon + 1), true)
      const pseudo = name.endsWith('-before') ? '::before' : name.endsWith('-after') ? '::after' : null
      return /^[a-z-]+$/.test(prop) && p ? ['matches-css', pseudo, prop, ...p] : null
    }
    case 'matches-attr': {
      const value = arg.trim()
      let eq = -1
      if (value.startsWith('/')) {
        const end = value.indexOf('/', 1)
        eq = end === -1 ? -1 : value.indexOf('=', end)
      } else eq = value.indexOf('=')
      const unquote = (v) => v.trim().replace(/^(["'])(.*)\1$/, '$2')
      const rawName = unquote(eq === -1 ? value : value.slice(0, eq))
      const rawValue = eq === -1 ? null : unquote(value.slice(eq + 1))
      const nameP = textPattern(rawName, true)
      const valueP = rawValue === null ? null : textPattern(rawValue, true)
      if (!nameP || (rawValue !== null && !valueP)) return null
      return ['matches-attr', nameP, valueP]
    }
    case 'matches-path': {
      const p = textPattern(arg)
      return p ? ['matches-path', ...p] : null
    }
    case 'matches-media': {
      const value = arg.trim()
      return value && !/[{}]/.test(value) ? ['matches-media', value] : null
    }
    case 'min-text-length':
      return /^\d+$/.test(arg.trim()) ? ['min-text-length', Number(arg.trim())] : null
    case 'xpath': {
      const value = arg.trim()
      return value ? ['xpath', value] : null
    }
    case 'others':
      return arg.trim() === '' ? ['others'] : null
    case 'watch-attr': {
      const attrs = arg.split(',').map((a) => a.trim()).filter(Boolean)
      return attrs.every((a) => /^[\w-]+$/.test(a)) ? ['watch-attr', attrs] : null
    }
    case 'shadow':
    case 'spath':
      return isSafeSelector(arg.trim()) ? [op, arg.trim()] : null
    case 'style':
      return isSafeDeclaration(arg) ? ['style', arg.trim()] : null
    case 'remove':
      return arg.trim() === '' ? ['remove'] : null
    case 'remove-attr':
    case 'remove-class': {
      const p = textPattern(arg, true)
      return p && arg.trim() ? [op, ...p] : null
    }
    default:
      return null
  }
}

/** CSS that continues the selection: a compound filters the current elements, a combinator walks. */
function cssStep(css) {
  if (!css.trim()) return []
  if (/^\s|^[>+~]/.test(css)) {
    const step = css.trim()
    if (step.includes(',')) return null
    return isSafeSelector(step.replace(/^[>+~]\s*/, '')) ? [['spath', step]] : null
  }
  const split = compoundEnd(css)
  if (split === css.length) return isSafeSelector(css) ? [['matches', css]] : null
  const compound = css.slice(0, split)
  const rest = cssStep(css.slice(split))
  return isSafeSelector(compound) && rest ? [['matches', compound], ...rest] : null
}

/** Index of the first top-level combinator or whitespace, i.e. where the leading compound ends. */
function compoundEnd(css) {
  let depth = 0
  let quote = ''
  for (let i = 0; i < css.length; i++) {
    const c = css[i]
    if (c === '\\') {
      i++
      continue
    }
    if (quote) {
      if (c === quote) quote = ''
    } else if (c === '"' || c === "'") quote = c
    else if (c === '[' || c === '(') depth++
    else if (c === ']' || c === ')') depth--
    else if (!depth && /[\s>+~]/.test(c)) return i
  }
  return css.length
}

/** Ops that test the page rather than the element (`:matches-path`, `:not(:matches-media(...))`). */
function isPageCondition(op) {
  if (op[0] === 'matches-path' || op[0] === 'matches-media') return true
  return (op[0] === 'has' || op[0] === 'not') && op[1].sel === null && op[1].ops.every(isPageCondition)
}

/**
 * Compiles one selector expression. Plain CSS comes back as `{ sel, ops: [] }`; null when it does
 * not parse or a part fails validation. `sel: null` means "start from the context element", which
 * only nested (`:has()` / `:not()`) expressions and top-level `:xpath()` may use.
 */
export function compileTask(source, nested = false) {
  const s = source.trim()
  if (!s || s.length > MAX_LENGTH) return null
  let op = findOp(s, 0)
  if (op?.invalid) return null
  if (!op) return isSafeSelector(s) ? { sel: s, ops: [] } : null
  const prefix = s.slice(0, op.index).trim()
  if (prefix && !isSafeSelector(prefix)) return null
  if (!prefix && !nested) {
    const first = compileOp(op.name, op.arg)
    if (first && isPageCondition(first)) {
      // A leading page condition gates the whole remaining expression.
      const rest = compileTask(s.slice(op.end))
      if (!rest) return null
      rest.ops.unshift(first)
      return rest
    }
    if (op.name !== 'xpath') return null
  }
  const task = { sel: prefix || null, ops: [] }
  let pos = op.index
  while (op) {
    if (op.invalid) return null
    const gap = cssStep(s.slice(pos, op.index))
    if (!gap) return null
    if (gap.length && task.action) return null
    task.ops.push(...gap)
    const compiled = compileOp(op.name, op.arg)
    if (!compiled || task.action) return null
    if (ACTIONS.has(compiled[0])) task.action = compiled
    else task.ops.push(compiled)
    pos = op.end
    op = findOp(s, pos)
  }
  const tail = cssStep(s.slice(pos))
  if (!tail || (tail.length && task.action)) return null
  task.ops.push(...tail)
  return task
}

/**
 * A filter body as stored in the shards: pure CSS rules (plain `selector:style(...)`) need no
 * engine, everything else is a task. Returns null for filters that must be rejected.
 */
export function compileProceduralFilter(body) {
  const task = compileTask(body)
  if (!task) return null
  if (!task.ops.length && task.sel) {
    if (!task.action) return { hide: task.sel }
    if (task.action[0] === 'style') return { css: `${task.sel}{${task.action[1]}}` }
  }
  return { task }
}
