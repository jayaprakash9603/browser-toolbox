export interface WhitespaceOptions {
  trimLines: boolean
  collapseSpaces: boolean
  removeLeading: boolean
  removeTrailing: boolean
  normalizeLineBreaks: boolean
  removeBlankLines: boolean
}

export const DEFAULT_WHITESPACE_OPTIONS: WhitespaceOptions = {
  trimLines: true,
  collapseSpaces: true,
  removeLeading: false,
  removeTrailing: false,
  normalizeLineBreaks: true,
  removeBlankLines: false,
}

export function cleanWhitespace(input: string, options: WhitespaceOptions): string {
  let text = input
  if (options.normalizeLineBreaks) text = text.replace(/\r\n?/g, '\n')

  let lines = text.split('\n')
  lines = lines.map((line) => {
    let out = line
    if (options.removeLeading || options.trimLines) out = out.replace(/^\s+/, '')
    if (options.removeTrailing || options.trimLines) out = out.replace(/\s+$/, '')
    if (options.collapseSpaces) out = out.replace(/[^\S\n]{2,}/g, ' ')
    return out
  })
  if (options.removeBlankLines) lines = lines.filter((line) => line.trim() !== '')
  return lines.join('\n')
}
