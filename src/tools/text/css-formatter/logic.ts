import beautify from 'js-beautify'

export function formatCss(input: string): string {
  return beautify.css(input, {
    indent_size: 2,
    end_with_newline: false,
  })
}

export function minifyCss(input: string): string {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s*([{}:;,>])\s*/g, '$1')
    .replace(/;}/g, '}')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
