import beautify from 'js-beautify'

import type { TextFormatterStrategy } from '../types'

export const typescriptFormatter: TextFormatterStrategy = {
  id: 'typescript',
  labelKey: 'text.format.typescript',
  badgeClassName: 'border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-300',
  detect: (source) => /^\s*(?:export\s+)?(?:interface|type|enum|namespace)\s+\w+/m.test(source)
    || /:\s*(?:string|number|boolean|unknown|any|void|never)(?:\s*[[;,)={]|\s*$)/m.test(source),
  format: (source) => beautify.js(source, { indent_size: 2, end_with_newline: false }),
  minify: (source) => source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\n\s*\n/g, '\n')
    .trim(),
}