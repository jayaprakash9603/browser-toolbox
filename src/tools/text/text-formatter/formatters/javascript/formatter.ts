import beautify from 'js-beautify'

import type { TextFormatterStrategy } from '../types'

export const javascriptFormatter: TextFormatterStrategy = {
  id: 'javascript',
  labelKey: 'text.format.javascript',
  badgeClassName: 'border-yellow-500/30 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300',
  detect: (source) => /^\s*(?:import|export|const|let|var|function|class)\b/m.test(source)
    || /=>|\bconsole\.(?:log|warn|error)\s*\(/.test(source),
  format: (source) => beautify.js(source, { indent_size: 2, end_with_newline: false }),
  minify: (source) => source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\n\s*\n/g, '\n')
    .trim(),
}