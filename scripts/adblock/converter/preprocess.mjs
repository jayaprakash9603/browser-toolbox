/**
 * uBO list preprocessor (`!#if` / `!#else` / `!#endif` / `!#include`), evaluated the way
 * uBO Lite compiles lists for Chromium: MV3, no HTML filtering, desktop.
 */
export const CHROMIUM_MV3_ENV = new Set(['env_chromium', 'env_mv3', 'ext_ubol', 'ext_ublock', 'cap_user_stylesheet'])

/** Evaluates `env_a && !(env_b || cap_c)`; unknown tokens are false, malformed input is false. */
export function evaluateCondition(expr, env = CHROMIUM_MV3_ENV) {
  const tokens = expr.match(/!|&&|\|\||\(|\)|[\w-]+/g) ?? []
  let pos = 0
  const peek = () => tokens[pos]
  const parseOr = () => {
    let value = parseAnd()
    while (peek() === '||') {
      pos++
      const rhs = parseAnd()
      value = value || rhs
    }
    return value
  }
  const parseAnd = () => {
    let value = parseUnary()
    while (peek() === '&&') {
      pos++
      const rhs = parseUnary()
      value = value && rhs
    }
    return value
  }
  const parseUnary = () => {
    const token = tokens[pos++]
    if (token === '!') return !parseUnary()
    if (token === '(') {
      const value = parseOr()
      if (tokens[pos++] !== ')') throw new Error('unbalanced')
      return value
    }
    if (!token || !/^[\w-]+$/.test(token)) throw new Error('bad token')
    return env.has(token)
  }
  try {
    const value = parseOr()
    return pos === tokens.length ? value : false
  } catch {
    return false
  }
}

/**
 * Resolves directives. `loadInclude(name)` returns the text of a sibling file (or null); uBO
 * only allows includes from the same directory, so names with slashes are ignored.
 */
export async function preprocessList(text, loadInclude, env = CHROMIUM_MV3_ENV, depth = 0) {
  const out = []
  const stack = []
  const active = () => stack.every((frame) => frame.active)
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (trimmed.startsWith('!#if ')) {
      const parentActive = active()
      const value = evaluateCondition(trimmed.slice(5).trim(), env)
      stack.push({ active: parentActive && value, parentActive, value })
      continue
    }
    if (trimmed === '!#else') {
      const frame = stack.at(-1)
      if (frame) frame.active = frame.parentActive && !frame.value
      continue
    }
    if (trimmed === '!#endif') {
      stack.pop()
      continue
    }
    if (!active()) continue
    if (trimmed.startsWith('!#include ')) {
      const name = trimmed.slice(10).trim()
      if (depth < 3 && /^[\w.-]+\.txt$/.test(name)) {
        const included = await loadInclude(name)
        if (included != null) out.push(...(await preprocessList(included, loadInclude, env, depth + 1)))
      }
      continue
    }
    out.push(line)
  }
  return out
}
