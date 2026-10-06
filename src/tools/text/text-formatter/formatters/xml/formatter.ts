import beautify from 'js-beautify'

import type { TextFormatterStrategy } from '../types'

const HTML_TAGS = new Set(['html', 'head', 'body', 'main', 'div', 'section', 'article', 'p', 'form', 'svg', 'table', 'ul', 'ol'])

export const xmlFormatter: TextFormatterStrategy = {
  id: 'xml',
  labelKey: 'text.format.xml',
  badgeClassName: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
  detect: (source) => {
    if (/^<\?xml\b|\bxmlns(?::\w+)?=/i.test(source)) return true
    const rootTag = source.match(/^<([a-z][\w:.-]*)\b[^>]*>[\s\S]*<\/\1>$/i)?.[1]
    return Boolean(rootTag && !HTML_TAGS.has(rootTag.toLowerCase()))
  },
  format: (source) => beautify.html(source, {
    indent_size: 2,
    wrap_line_length: 100,
    preserve_newlines: true,
    max_preserve_newlines: 2,
    end_with_newline: false,
  }),
  minify: (source) => source
    .replace(/<!--(?!\[if)[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim(),
}