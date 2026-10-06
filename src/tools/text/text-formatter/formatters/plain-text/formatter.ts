import type { TextFormatterStrategy } from '../types'

export const plainTextFormatter: TextFormatterStrategy = {
  id: 'plain-text',
  labelKey: 'text.format.plain-text',
  badgeClassName: 'border-neutral-500/30 bg-neutral-500/10 text-neutral-700 dark:text-neutral-300',
  detect: () => false,
  format: (source) => source
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim(),
  minify: (source) => source.replace(/\s+/g, ' ').trim(),
}