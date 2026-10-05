export interface FindReplaceOptions {
  caseSensitive: boolean
  wholeWord: boolean
  regex: boolean
}

export interface FindReplaceResult {
  output: string
  matchCount: number
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export function buildSearchRegex(find: string, options: FindReplaceOptions): RegExp {
  const source = options.regex ? find : escapeRegExp(find)
  const bounded = options.wholeWord ? `\\b(?:${source})\\b` : source
  return new RegExp(bounded, options.caseSensitive ? 'g' : 'gi')
}

export function countMatches(input: string, find: string, options: FindReplaceOptions): number {
  if (!find) return 0
  try {
    return (input.match(buildSearchRegex(find, options)) ?? []).length
  } catch {
    return 0
  }
}

export function replaceText(
  input: string,
  find: string,
  replace: string,
  options: FindReplaceOptions,
): FindReplaceResult {
  if (!find) return { output: input, matchCount: 0 }
  const regex = buildSearchRegex(find, options)
  let matchCount = 0
  const output = input.replace(regex, (...args) => {
    matchCount += 1
    return options.regex
      ? replace.replace(/\$(\d)/g, (_, group: string) => String(args[Number(group)] ?? ''))
      : replace
  })
  return { output, matchCount }
}
