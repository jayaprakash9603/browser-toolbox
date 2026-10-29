const CSS_IDENTIFIER = /^-?[_a-zA-Z][_a-zA-Z\d-]*$/

/** CSS.escape when available; otherwise a conservative identifier fallback. */
export function escapeCssIdent(value: string): string {
  const css = (globalThis as { CSS?: { escape?: (input: string) => string } }).CSS
  if (css?.escape) return css.escape(value)
  if (CSS_IDENTIFIER.test(value)) return value
  return value.replace(/[\0-\x1f\x7f]/g, (char) => `\\${char.charCodeAt(0).toString(16)} `).replace(
    /([^\w-])/g,
    '\\$1',
  )
}

export function escapeCssAttr(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

/**
 * XPath 1.0 string literal. Uses the opposite quote when possible;
 * `concat()` when the value contains both `'` and `"`.
 */
export function xpathLiteral(value: string): string {
  if (!value.includes('"')) return `"${value}"`
  if (!value.includes("'")) return `'${value}'`
  const parts: string[] = []
  let index = 0
  while (index < value.length) {
    const quote = value[index] === "'" ? '"' : "'"
    let end = index + 1
    while (end < value.length && value[end] !== quote) end += 1
    parts.push(`${quote}${value.slice(index, end)}${quote}`)
    index = end
  }
  return `concat(${parts.join(', ')})`
}

export function cssIdSelector(id: string): string {
  return `#${escapeCssIdent(id)}`
}

export function cssClassTokens(classes: string[]): string {
  return classes.map((cls) => `.${escapeCssIdent(cls)}`).join('')
}

export function cssAttrEquals(name: string, value: string): string {
  return `[${escapeCssIdent(name)}="${escapeCssAttr(value)}"]`
}
