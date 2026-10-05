import beautify from 'js-beautify'

export function formatHtml(input: string): string {
  return beautify.html(input, {
    indent_size: 2,
    wrap_line_length: 100,
    preserve_newlines: true,
    max_preserve_newlines: 2,
    end_with_newline: false,
  })
}

export function minifyHtml(input: string): string {
  return input
    .replace(/<!--(?!\[if)[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .trim()
}
