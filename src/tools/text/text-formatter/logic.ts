import { textFormatterStrategies } from './formatters/registry'
import { plainTextFormatter } from './formatters/plain-text/formatter'
import type { TextFormatId, TextFormatSelection, TextFormatterStrategy } from './formatters/types'

export type { TextFormatId, TextFormatSelection, TextFormatterStrategy }
export { TEXT_FORMAT_IDS } from './formatters/types'

export function detectTextFormat(input: string): TextFormatId {
  const source = input.trim()
  return textFormatterStrategies.find((formatter) => formatter.detect(source))?.id ?? 'plain-text'
}

export function getTextFormatter(format: TextFormatId): TextFormatterStrategy {
  return textFormatterStrategies.find((formatter) => formatter.id === format) ?? plainTextFormatter
}

export function getTextFormatSelection(search: string): TextFormatSelection {
  const requestedFormat = new URLSearchParams(search).get('format')
  return textFormatterStrategies.find(({ id }) => id === requestedFormat)?.id ?? 'auto'
}

export function formatText(input: string, format = detectTextFormat(input)): string {
  return getTextFormatter(format).format(input)
}

export function minifyText(input: string, format = detectTextFormat(input)): string {
  return getTextFormatter(format).minify(input)
}