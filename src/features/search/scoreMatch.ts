export function scoreMatch(
  haystack: string,
  name: string,
  aliases: string[],
  tokens: string[],
  fullQuery: string,
): number {
  const normalizedName = name.toLowerCase()
  const normalizedAliases = aliases.map((alias) => alias.toLowerCase())
  const q = fullQuery.trim().toLowerCase()

  if (!tokens.every((token) => haystack.includes(token))) return 0

  let score = 10
  if (normalizedName === q || normalizedAliases.includes(q)) score += 100
  if (normalizedName.startsWith(q) || normalizedAliases.some((alias) => alias.startsWith(q))) score += 40
  for (const token of tokens) {
    if (normalizedName === token) score += 30
    if (normalizedAliases.includes(token)) score += 25
  }
  return score
}
