export interface DedupeOptions {
  caseSensitive: boolean
  trimFirst: boolean
}

export interface DedupeResult {
  output: string
  removedCount: number
}

export function removeDuplicateLines(
  input: string,
  { caseSensitive, trimFirst }: DedupeOptions,
): DedupeResult {
  const seen = new Set<string>()
  const kept: string[] = []
  let removedCount = 0

  for (const line of input.split('\n')) {
    const candidate = trimFirst ? line.trim() : line
    const key = caseSensitive ? candidate : candidate.toLowerCase()
    if (seen.has(key)) {
      removedCount += 1
      continue
    }
    seen.add(key)
    kept.push(line)
  }

  return { output: kept.join('\n'), removedCount }
}
