import beautify from 'js-beautify'

import type { TextFormatterStrategy } from '../types'

export const cssFormatter: TextFormatterStrategy = {
  id: 'css',
  labelKey: 'text.format.css',
  badgeClassName: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  detect: (source) => /(?:^|})\s*(?:@[\w-]+[^{}]*|[^{};]+)\s*\{[^{}]*[\w-]+\s*:\s*[^{};]+;?[^{}]*\}/s.test(source),
  format: (source) => beautify.css(source, { indent_size: 2, end_with_newline: false }),
  minify: (source) => source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .replace(/\s{2,}/g, ' ')
    .trim(),
}