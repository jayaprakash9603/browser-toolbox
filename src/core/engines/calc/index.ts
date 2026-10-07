export type CalcResult = { ok: true; value: number } | { ok: false; error: string }

type Token = { type: 'num'; value: number } | { type: 'op'; value: string } | { type: 'fn'; value: string }

const FUNCTIONS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  sin: (x) => Math.sin((x * Math.PI) / 180),
  cos: (x) => Math.cos((x * Math.PI) / 180),
  tan: (x) => Math.tan((x * Math.PI) / 180),
  ln: Math.log,
  log: Math.log10,
  exp: Math.exp,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
}

function tokenize(input: string): Token[] | string {
  const tokens: Token[] = []
  let index = 0
  const source = input.replace(/\s+/g, '').replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, 'pi')
  while (index < source.length) {
    const char = source[index]
    if (/[\d.]/.test(char)) {
      let num = ''
      while (index < source.length && /[\d.]/.test(source[index])) num += source[index++]
      const value = Number(num)
      if (Number.isNaN(value)) return `Invalid number "${num}".`
      tokens.push({ type: 'num', value })
    } else if ('+-*/%^()'.includes(char)) {
      tokens.push({ type: 'op', value: char })
      index += 1
    } else if (/[a-z]/i.test(char)) {
      let name = ''
      while (index < source.length && /[a-z]/i.test(source[index])) name += source[index++]
      if (name === 'pi') tokens.push({ type: 'num', value: Math.PI })
      else if (name === 'e') tokens.push({ type: 'num', value: Math.E })
      else if (FUNCTIONS[name]) tokens.push({ type: 'fn', value: name })
      else return `Unknown function "${name}".`
    } else {
      return `Unexpected character "${char}".`
    }
  }
  return tokens
}

export function evaluate(input: string): CalcResult {
  if (!input.trim()) return { ok: false, error: 'Input is empty.' }
  const tokens = tokenize(input)
  if (typeof tokens === 'string') return { ok: false, error: tokens }
  let pos = 0

  const peek = () => tokens[pos]
  const next = () => tokens[pos++]

  function parseExpr(): number {
    let value = parseTerm()
    while (peek()?.type === 'op' && ((peek() as { value: string }).value === '+' || (peek() as { value: string }).value === '-')) {
      const op = (next() as { value: string }).value
      const rhs = parseTerm()
      value = op === '+' ? value + rhs : value - rhs
    }
    return value
  }
  function parseTerm(): number {
    let value = parseFactor()
    while (peek()?.type === 'op' && ['*', '/', '%'].includes((peek() as { value: string }).value)) {
      const op = (next() as { value: string }).value
      const rhs = parseFactor()
      value = op === '*' ? value * rhs : op === '/' ? value / rhs : value % rhs
    }
    return value
  }
  function parseFactor(): number {
    let base = parseUnary()
    while (peek()?.type === 'op' && (peek() as { value: string }).value === '^') {
      next()
      base = Math.pow(base, parseUnary())
    }
    return base
  }
  function parseUnary(): number {
    if (peek()?.type === 'op' && (peek() as { value: string }).value === '-') { next(); return -parseUnary() }
    if (peek()?.type === 'op' && (peek() as { value: string }).value === '+') { next(); return parseUnary() }
    return parseAtom()
  }
  function parseAtom(): number {
    const token = next()
    if (!token) throw new Error('Unexpected end')
    if (token.type === 'num') return token.value
    if (token.type === 'fn') {
      const arg = parseAtom()
      return FUNCTIONS[token.value](arg)
    }
    if (token.type === 'op' && token.value === '(') {
      const value = parseExpr()
      const closing = next()
      if (!closing || closing.type !== 'op' || closing.value !== ')') throw new Error('Missing closing parenthesis')
      return value
    }
    throw new Error('Unexpected token')
  }

  try {
    const value = parseExpr()
    if (pos < tokens.length) return { ok: false, error: 'Unexpected trailing input.' }
    if (!Number.isFinite(value)) return { ok: false, error: 'Result is not a finite number.' }
    return { ok: true, value }
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : 'Invalid expression.' }
  }
}

export function percent(value: number, pct: number): number {
  return (value * pct) / 100
}
