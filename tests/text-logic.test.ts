import { describe, expect, it } from 'vitest'

import { convertCase, splitWords } from '@/tools/text/case-converter/logic'
import { cleanWhitespace, DEFAULT_WHITESPACE_OPTIONS } from '@/tools/text/whitespace-cleaner/logic'
import { removeDuplicateLines } from '@/tools/text/duplicate-line-remover/logic'
import { sortLines } from '@/tools/text/sort-lines/logic'
import { analyzeText, countLines, formatReadingTime } from '@/tools/text/word-counter/logic'
import { countMatches, replaceText } from '@/tools/text/find-replace/logic'
import { compareText } from '@/tools/text/text-diff/logic'
import { generateLorem } from '@/tools/text/lorem-ipsum/logic'
import { formatMarkdown } from '@/tools/text/markdown-formatter/logic'
import { formatHtml, minifyHtml } from '@/tools/text/html-formatter/logic'
import { formatCss, minifyCss } from '@/tools/text/css-formatter/logic'
import { formatJs, minifyJs } from '@/tools/text/javascript-formatter/logic'

describe('case converter', () => {
  it('splits words across separators and camel humps', () => {
    expect(splitWords('helloWorld_example-test')).toEqual(['hello', 'world', 'example', 'test'])
  })

  it('converts every case style', () => {
    const input = 'hello world example'
    expect(convertCase(input, 'lower')).toBe('hello world example')
    expect(convertCase(input, 'upper')).toBe('HELLO WORLD EXAMPLE')
    expect(convertCase(input, 'title')).toBe('Hello World Example')
    expect(convertCase(input, 'sentence')).toBe('Hello world example')
    expect(convertCase(input, 'camel')).toBe('helloWorldExample')
    expect(convertCase(input, 'pascal')).toBe('HelloWorldExample')
    expect(convertCase(input, 'snake')).toBe('hello_world_example')
    expect(convertCase(input, 'kebab')).toBe('hello-world-example')
    expect(convertCase(input, 'constant')).toBe('HELLO_WORLD_EXAMPLE')
  })
})

describe('whitespace cleaner', () => {
  it('trims, collapses and removes blank lines', () => {
    const input = '  hello   world  \n\n\n  second line  '
    const out = cleanWhitespace(input, {
      ...DEFAULT_WHITESPACE_OPTIONS,
      removeBlankLines: true,
    })
    expect(out).toBe('hello world\nsecond line')
  })

  it('normalizes CRLF', () => {
    expect(cleanWhitespace('a\r\nb\r\n', DEFAULT_WHITESPACE_OPTIONS)).toBe('a\nb\n')
  })

  it('respects disabled options', () => {
    const input = '  spaced  '
    expect(
      cleanWhitespace(input, { ...DEFAULT_WHITESPACE_OPTIONS, trimLines: false, collapseSpaces: false }),
    ).toBe(input)
  })
})

describe('duplicate line remover', () => {
  it('preserves order and counts removals', () => {
    const result = removeDuplicateLines('apple\nbanana\napple\norange\nbanana', {
      caseSensitive: true,
      trimFirst: false,
    })
    expect(result.output).toBe('apple\nbanana\norange')
    expect(result.removedCount).toBe(2)
  })

  it('supports case-insensitive + trim', () => {
    const result = removeDuplicateLines(' Apple \napple', {
      caseSensitive: false,
      trimFirst: true,
    })
    expect(result.output).toBe(' Apple ')
  })
})

describe('sort lines', () => {
  it('sorts alphabetically case-insensitively by default', () => {
    expect(sortLines('banana\nApple\ncherry', 'alpha-asc')).toBe('Apple\nbanana\ncherry')
  })

  it('sorts numerically', () => {
    expect(sortLines('10\n2\n30', 'numeric-asc')).toBe('2\n10\n30')
    expect(sortLines('10\n2\n30', 'numeric-desc')).toBe('30\n10\n2')
  })

  it('sorts by length', () => {
    expect(sortLines('ccc\na\nbb', 'length-asc')).toBe('a\nbb\nccc')
  })
})

describe('counters', () => {
  it('counts words, chars, lines, sentences, paragraphs', () => {
    const stats = analyzeText('Hello world. Bye now!\n\nSecond paragraph here.')
    expect(stats.words).toBe(7)
    expect(stats.sentences).toBe(3)
    expect(stats.paragraphs).toBe(2)
    expect(stats.charactersNoSpaces).toBeLessThan(stats.characters)
  })

  it('counts blank lines', () => {
    expect(countLines('a\n\nb')).toEqual({ total: 3, blank: 1, nonBlank: 2 })
  })

  it('formats reading time', () => {
    expect(formatReadingTime(45)).toBe('45s')
    expect(formatReadingTime(90)).toBe('1m 30s')
  })
})

describe('find & replace', () => {
  it('counts matches case-insensitively by default', () => {
    expect(countMatches('Cat cat CAT', 'cat', { caseSensitive: false, wholeWord: false, regex: false })).toBe(3)
  })

  it('whole word avoids partial matches', () => {
    expect(countMatches('cat catalog', 'cat', { caseSensitive: false, wholeWord: true, regex: false })).toBe(1)
  })

  it('regex replace supports groups', () => {
    const result = replaceText('hello 123', '(\\d+)', '[$1]', {
      caseSensitive: true,
      wholeWord: false,
      regex: true,
    })
    expect(result.output).toBe('hello [123]')
    expect(result.matchCount).toBe(1)
  })

  it('invalid regex counts as zero matches', () => {
    expect(countMatches('x', '(', { caseSensitive: false, wholeWord: false, regex: true })).toBe(0)
  })
})

describe('text diff', () => {
  it('detects added and removed lines', () => {
    const result = compareText('a\nb', 'a\nc', 'lines')
    expect(result.added).toBe(1)
    expect(result.removed).toBe(1)
    expect(result.unchanged).toBe(1)
  })
})

describe('lorem ipsum', () => {
  it('generates deterministic counts', () => {
    expect(generateLorem('words', 5).split(' ')).toHaveLength(5)
    expect(generateLorem('paragraphs', 2).split('\n\n')).toHaveLength(2)
    expect(generateLorem('sentences', 0)).toBe('')
  })
})

describe('markdown formatter', () => {
  it('normalizes headings and lists', () => {
    const out = formatMarkdown('#Title\n* item\n\n\n\ntext')
    expect(out).toContain('# Title')
    expect(out).toContain('- item')
    expect(out).not.toContain('\n\n\n')
  })

  it('leaves code blocks untouched', () => {
    const input = '```\n# not a heading\n```'
    expect(formatMarkdown(input)).toContain('# not a heading')
  })
})

describe('html formatter', () => {
  it('beautifies nested markup', () => {
    const out = formatHtml('<div><p>hi</p></div>')
    expect(out).toContain('\n')
    expect(out).toContain('<p>')
  })

  it('minifies markup', () => {
    expect(minifyHtml('<div>\n  <p>hi</p>\n</div>')).toBe('<div><p>hi</p></div>')
  })
})

describe('css formatter', () => {
  it('beautifies and minifies', () => {
    expect(formatCss('.a{color:red}')).toContain('\n')
    expect(minifyCss('.a { color: red; }')).toBe('.a{color:red}')
  })
})

describe('js formatter', () => {
  it('beautifies source', () => {
    expect(formatJs('const x={a:1}')).toContain('\n')
  })

  it('minifier strips comments and blank lines without touching code', () => {
    const out = minifyJs('// note\nconst a = 1;\n\n\n/* block */\nconst b = 2;')
    expect(out).toBe('const a = 1;\nconst b = 2;')
  })
})
