export function getSearchMatchIndices(text: string, query: string): number[] {
  const searchableText = text.toLowerCase()
  const trimmedQuery = query.trim().toLowerCase()
  const tokens = trimmedQuery.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return []

  const exactPhraseIndex = searchableText.indexOf(trimmedQuery)
  if (exactPhraseIndex >= 0) {
    return Array.from({ length: trimmedQuery.length }, (_, offset) => exactPhraseIndex + offset)
  }

  const indices = new Set<number>()
  for (const token of tokens) {
    let start = 0
    while (start <= searchableText.length - token.length) {
      const at = searchableText.indexOf(token, start)
      if (at < 0) break
      for (let offset = 0; offset < token.length; offset += 1) indices.add(at + offset)
      start = at + 1
    }
  }
  if (indices.size > 0) return [...indices].sort((a, b) => a - b)

  for (let length = trimmedQuery.length; length > 0; length -= 1) {
    const candidate = trimmedQuery.slice(0, length)
    const start = searchableText.indexOf(candidate)
    if (start >= 0) {
      return Array.from({ length: candidate.length }, (_, offset) => start + offset)
    }

    const fuzzyIndices: number[] = []
    let textIndex = 0
    for (const character of candidate) {
      const matchIndex = searchableText.indexOf(character, textIndex)
      if (matchIndex < 0) break
      fuzzyIndices.push(matchIndex)
      textIndex = matchIndex + 1
    }
    if (fuzzyIndices.length === candidate.length) return fuzzyIndices
  }

  return []
}

export function matchesSearchText(text: string, query: string): boolean {
  const searchableText = text.toLowerCase()
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return true

  return tokens.every((token) => {
    if (searchableText.includes(token)) return true
    let textIndex = 0
    for (const character of token) {
      textIndex = searchableText.indexOf(character, textIndex)
      if (textIndex < 0) return false
      textIndex += 1
    }
    return true
  })
}
