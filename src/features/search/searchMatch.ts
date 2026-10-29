/** Split a query into lowercase tokens; empty strings are dropped. */
export function queryTokens(query: string): string[] {
  return query.trim().toLowerCase().split(/\s+/).filter(Boolean)
}

function compact(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '')
}

export function tokenInText(token: string, text: string): boolean {
  const lower = text.toLowerCase()
  if (lower.includes(token)) return true
  const c = compact(lower)
  const t = compact(token)
  return t.length > 0 && c.includes(t)
}

/** Every token must match; also accept the tokens run together (`bar code` → `barcode`). */
export function tokensMatchText(text: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true
  if (tokens.every((token) => tokenInText(token, text))) return true
  const c = compact(text)
  const joined = compact(tokens.join(''))
  if (joined.length >= 3 && c.includes(joined)) return true
  return false
}
