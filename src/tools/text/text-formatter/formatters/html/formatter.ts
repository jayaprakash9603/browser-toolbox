import beautify from 'js-beautify'

import type { TextFormatterStrategy } from '../types'

const HTML_ROOT = /^<!doctype\s+html\b|^<html\b|^<(?:head|body|main|div|section|article|p|form|svg|table|ul|ol|script|style)\b/i

export const htmlFormatter: TextFormatterStrategy = {
  id: 'html',
  labelKey: 'text.format.html',
  badgeClassName: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
  detect: (source) => HTML_ROOT.test(source),
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