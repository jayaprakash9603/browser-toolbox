/**
 * The JSONPath dialect uBlock Origin's filter lists use (`edit-inbound-object`, `json-edit-*`):
 * `$`/`@`, `.key`, `..key`, `[*]`, `['a',0,-1]`, `/regex/` keys, filters `[?path op value]` /
 * `[?!path]`, and an assignment suffix `=json`, `+=json` (merge) or `=repl({...})`.
 * Without an assignment, `apply` deletes what the path selects.
 */

const ROOT = 1
const CURRENT = 2
const CHILDREN = 3
const DESCENDANTS = 4
const QUANTIFIER = 5

const NATIVE_PARSE = JSON.parse
const hasOwn = Object.hasOwn
const UNQUOTED = /^[A-Za-z_]\w*|^\*/
const EXPR = /^\s*([!=^$*]=|[<>]=?)\s*(.+?)\]/
const INDEX = /^-?\d+/
const RVAL_CALL = /^=([a-z]+)\((.+)\)$/
const QUANT = /^\{(\d+|\d+,\d+|\d+,|,\d+)\};\$/

/** Text up to an unescaped `char`, with `\char` unescaped. */
function untilChar(query, char, start) {
  let out = ''
  let from = start
  for (let i = start; i < query.length; i++) {
    const c = query[i]
    if (c === char) return { s: out + query.slice(from, i), i: i + 1 }
    if (c === '\\' && query[i + 1] === char) {
      out += query.slice(from, i)
      from = i + 1
      i += 1
    }
  }
  return undefined
}

function unquotedKey(query, i) {
  if (query[i] === '/') {
    const r = untilChar(query, '/', i + 1)
    if (!r) return undefined
    try {
      return { s: new RegExp(r.s), i: r.i }
    } catch {
      return undefined
    }
  }
  const m = UNQUOTED.exec(query.slice(i))
  return m ? { s: m[0], i: i + m[0].length } : undefined
}

function bracketKeys(query, i, v2) {
  const keys = []
  let needKey = true
  while (i < query.length) {
    const c = query[i]
    if (c === ']') break
    if (c === ' ') {
      i += 1
      continue
    }
    if (c === ',') {
      if (needKey) return undefined
      needKey = true
      i += 1
      continue
    }
    if (c === '"' || c === "'") {
      const r = untilChar(query, c, i + 1)
      if (!r) return undefined
      keys.push(r.s)
      i = r.i
      needKey = false
      continue
    }
    if (c === '-' || (c >= '0' && c <= '9')) {
      const m = INDEX.exec(query.slice(i))
      if (!m) return undefined
      keys.push(Number.parseInt(m[0], 10))
      i += m[0].length
      needKey = false
      continue
    }
    if (v2) return undefined
    const r = unquotedKey(query, i)
    if (!r) return undefined
    keys.push(r.s)
    i = r.i
    needKey = false
  }
  if (needKey) return undefined
  return { s: keys.length === 1 ? keys[0] : keys, i }
}

/** Parses a comparison at `i` onto `step`; returns where the filter's `]` is, or undefined. */
function compileExpr(query, step, i) {
  if (query.startsWith('=/', i)) {
    const r = untilChar(query, '/', i + 2)
    if (!r) return i
    const flag = query[r.i] === 'i' ? 'i' : undefined
    try {
      step.rval = new RegExp(r.s, flag)
    } catch {
      return undefined
    }
    step.op = 're'
    return r.i + (flag ? 1 : 0)
  }
  const m = EXPR.exec(query.slice(i))
  if (!m) return undefined
  const [whole, op, raw] = m
  if (raw[0] === "'") {
    const r = untilChar(raw, "'", 1)
    if (!r) return undefined
    step.rval = r.s
  } else {
    try {
      step.rval = NATIVE_PARSE(raw)
    } catch {
      return undefined
    }
  }
  step.op = op
  return i + whole.length - 1
}

function compilePath(query, start, v2) {
  if (query.length === 0) return undefined
  const steps = []
  let i = start
  if (query[i] === '$') {
    steps.push({ mv: ROOT })
    i += 1
  } else if (query[i] === '@') {
    steps.push({ mv: CURRENT })
    i += 1
  } else steps.push({ mv: start === 0 ? ROOT : CURRENT })
  let mv = 0
  while (i < query.length) {
    const c = query[i]
    if (c === ' ') {
      i += 1
      continue
    }
    if (c === '.') {
      if (mv) return undefined
      if (query.startsWith('..', i)) {
        mv = DESCENDANTS
        i += 2
      } else {
        mv = CHILDREN
        i += 1
      }
      continue
    }
    if (c === ';') {
      if (!query.startsWith(';$', i)) return undefined
      steps.push({ mv: QUANTIFIER, min: 1, max: 1e6 }, { mv: ROOT })
      i += 2
      mv = 0
      continue
    }
    if (c === '{') {
      const m = QUANT.exec(query.slice(i))
      if (!m) return undefined
      const [lo, hi] = m[1].includes(',') ? m[1].split(',') : [m[1], m[1]]
      steps.push(
        { mv: QUANTIFIER, min: Number.parseInt(lo, 10) || 0, max: Number.parseInt(hi, 10) || 1e6 },
        { mv: ROOT },
      )
      i += m[0].length
      mv = 0
      continue
    }
    if (c !== '[') {
      if (!mv) {
        const j = compileExpr(query, steps[steps.length - 1], i)
        if (j) i = j
        break
      }
      const r = unquotedKey(query, i)
      if (!r) return undefined
      steps.push({ mv, k: r.s })
      i = r.i
      mv = 0
      continue
    }
    if (mv === CHILDREN) return undefined
    if (query.startsWith('[?', i)) {
      const not = query[i + 2] === '!'
      const r = compilePath(query, i + 2 + (not ? 1 : 0), v2)
      if (!r || query[r.i] !== ']') return undefined
      if (not) r.steps[r.steps.length - 1].not = true
      steps.push({ mv: mv || CHILDREN, steps: r.steps })
      i = r.i + 1
      mv = 0
      continue
    }
    if (query.startsWith('[*]', i)) {
      steps.push({ mv: mv || CHILDREN, k: '*' })
      i += 3
      mv = 0
      continue
    }
    const r = bracketKeys(query, i + 1, v2)
    if (!r) return undefined
    steps.push({ mv: mv || CHILDREN, k: r.s })
    i = r.i + 1
    mv = 0
  }
  if (mv) return undefined
  return { steps, i }
}

function containerKeys(v) {
  if (Array.isArray(v)) return [...v.keys()]
  if (typeof v === 'object' && v !== null) return Object.keys(v)
  return []
}

/** Every `{ obj, key, path }` under `v`, depth-first, recursing only when asked. */
function descendants(v, recursive) {
  const out = []
  const walk = (obj, prefix) => {
    for (const key of containerKeys(obj)) {
      const path = [...prefix, key]
      out.push({ obj, key, path })
      if (recursive) walk(obj[key], path)
    }
  }
  walk(v, [])
  return out
}

function expandKey(owner, k) {
  if (typeof owner !== 'object' || owner === null) return undefined
  if (Array.isArray(k)) {
    const out = []
    for (const one of k) {
      const keys = expandKey(owner, one)
      if (keys) out.push(...keys)
    }
    return out
  }
  if (typeof k === 'number') {
    if (!Array.isArray(owner)) return undefined
    return [k >= 0 ? k : owner.length + k]
  }
  if (k === '*') return containerKeys(owner)
  if (k instanceof RegExp) return Object.keys(owner).filter((key) => k.test(key))
  return [k]
}

function testStep(step, owner, k) {
  if (owner === undefined || owner === null) return false
  const present = owner[k] !== undefined || hasOwn(owner, k)
  if (step.op !== undefined && !present) return false
  const want = step.not !== true
  const v = owner[k]
  switch (step.op) {
    case '==':
      return (v === step.rval) === want
    case '!=':
      return (v !== step.rval) === want
    case '<':
      return (v < step.rval) === want
    case '<=':
      return (v <= step.rval) === want
    case '>':
      return (v > step.rval) === want
    case '>=':
      return (v >= step.rval) === want
    case '^=':
      return `${v}`.startsWith(step.rval) === want
    case '$=':
      return `${v}`.endsWith(step.rval) === want
    case '*=':
      return `${v}`.includes(step.rval) === want
    case 're':
      return step.rval.test(`${v}`)
    default:
      return present === want
  }
}

export function createJsonPath(rawQuery) {
  let query = String(rawQuery ?? '')
  const v2 = query.startsWith('v2:')
  if (v2) query = query.slice(3)
  let compiled = compilePath(query, 0, v2)
  if (compiled && compiled.i !== query.length) {
    let raw
    if (query.startsWith('=', compiled.i)) {
      const m = RVAL_CALL.exec(query.slice(compiled.i))
      if (m) {
        compiled.modify = m[1]
        raw = m[2]
      } else raw = query.slice(compiled.i + 1)
    } else if (query.startsWith('+=', compiled.i)) {
      compiled.modify = '+'
      raw = query.slice(compiled.i + 2)
    }
    try {
      compiled.rval = NATIVE_PARSE(raw)
    } catch {
      compiled = undefined
    }
  }
  let root = null

  const resolve = (path) => {
    if (path.length === 0) return { value: root }
    let obj = root
    for (let i = 0; i < path.length - 1; i++) {
      obj = obj[path[i]]
      if (!(obj instanceof Object)) return {}
    }
    const key = path[path.length - 1]
    return { obj, key, value: obj[key] }
  }

  const evaluate = (steps, pathin) => {
    let results = []
    for (const step of steps) {
      switch (step.mv) {
        case ROOT:
          results = [['$']]
          break
        case CURRENT: {
          if (step.op) {
            const { obj, key } = resolve(pathin)
            if (obj === undefined) return []
            if (!testStep(step, obj, key)) break
          }
          results = [pathin]
          break
        }
        case CHILDREN:
        case DESCENDANTS:
          if (results.length) results = matches(results, step)
          break
        case QUANTIFIER:
          if (results.length < step.min || results.length > step.max) return []
          results = []
          break
        default:
          break
      }
    }
    return results
  }

  const matchFilter = (pathin, step, owner, out) => {
    const recursive = step.mv === DESCENDANTS
    const perItem = v2 || recursive || Array.isArray(owner)
    for (const { path } of descendants(owner, recursive)) {
      const q = perItem ? [...pathin, ...path] : pathin
      if (evaluate(step.steps, q).length) {
        out.push(q)
        if (!perItem) break
      }
    }
  }

  const matches = (list, step) => {
    const out = []
    for (const pathin of list) {
      const { value: owner } = resolve(pathin)
      if (owner === undefined) continue
      if (step.steps) {
        matchFilter(pathin, step, owner, out)
        continue
      }
      for (const k of expandKey(owner, step.k) ?? []) {
        if (testStep(step, owner, k)) out.push([...pathin, k])
      }
      if (step.mv !== DESCENDANTS) continue
      for (const { obj, key, path } of descendants(owner, true)) {
        const child = obj[key]
        for (const k of expandKey(child, step.k) ?? []) {
          if (testStep(step, child, k)) out.push([...pathin, ...path, k])
        }
      }
    }
    return out
  }

  const modify = (obj, key) => {
    let { rval } = compiled
    if (typeof rval === 'string') rval = rval.replace('${now}', `${Date.now()}`)
    switch (compiled.modify) {
      case undefined:
        obj[key] = rval
        break
      case '+': {
        const lval = obj[key]
        if (!(rval instanceof Object) || !(lval instanceof Object) || Array.isArray(lval)) return
        for (const [k, v] of Object.entries(rval)) lval[k] = v
        break
      }
      case 'repl': {
        const lval = obj[key]
        if (typeof lval !== 'string' || !(rval instanceof Object)) return
        if (compiled.re === undefined) {
          compiled.re = null
          try {
            compiled.re =
              rval.regex !== undefined
                ? new RegExp(rval.regex, rval.flags)
                : new RegExp(String(rval.pattern).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
          } catch {
            /* bad regex in the filter */
          }
        }
        if (compiled.re) obj[key] = lval.replace(compiled.re, rval.replacement)
        break
      }
      default:
        break
    }
  }

  return {
    valid: compiled !== undefined,
    /** The assigned value, or undefined for a deleting path. */
    get value() {
      return compiled && compiled.rval
    },
    /** Edits `data` in place (the root may be replaced); undefined when nothing matched. */
    apply(data) {
      if (!compiled) return undefined
      root = { $: data }
      try {
        const paths = evaluate(compiled.steps, [])
        if (!paths.length) return undefined
        for (let i = paths.length - 1; i >= 0; i--) {
          const { obj, key } = resolve(paths[i])
          if (obj === undefined) continue
          if (compiled.rval !== undefined) modify(obj, key)
          else if (Array.isArray(obj) && typeof key === 'number') obj.splice(key, 1)
          else delete obj[key]
        }
        return root.$ ?? null
      } finally {
        root = null
      }
    },
  }
}
