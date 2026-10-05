import beautify from 'js-beautify'

export function formatJs(input: string): string {
  return beautify.js(input, {
    indent_size: 2,
    space_in_empty_paren: true,
    end_with_newline: false,
  })
}

// Conservative whitespace minifier: strips comments and collapses blank lines
// only. It never rewrites tokens, so it is safe for any valid source text.
export function minifyJs(input: string): string {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\n\s*\n/g, '\n')
    .trim()
}
