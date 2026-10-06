export const TEXT_FORMAT_IDS = [
  'json',
  'javascript',
  'typescript',
  'html',
  'xml',
  'css',
  'markdown',
  'plain-text',
] as const

export type TextFormatId = (typeof TEXT_FORMAT_IDS)[number]
export type TextFormatSelection = TextFormatId | 'auto'

export interface TextFormatterStrategy {
  id: TextFormatId
  labelKey: string
  badgeClassName: string
  detect: (source: string) => boolean
  format: (source: string) => string
  minify: (source: string) => string
}