import type { TextFormatterStrategy } from '../types'

export const jsonFormatter: TextFormatterStrategy = {
  id: 'json',
  labelKey: 'text.format.json',
  badgeClassName: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  detect: (source) => {
    if (!source.startsWith('{') && !source.startsWith('[')) return false
    try {
      JSON.parse(source)
      return true
    } catch {
      return false
    }
  },
  format: (source) => JSON.stringify(JSON.parse(source), null, 2),
  minify: (source) => JSON.stringify(JSON.parse(source)),
}