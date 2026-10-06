import { describe, expect, it } from 'vitest'

import {
  detectTextFormat,
  formatText,
  getTextFormatSelection,
  getTextFormatter,
  minifyText,
} from '@/tools/text/text-formatter/logic'
import type { TextFormatId } from '@/tools/text/text-formatter/logic'

describe('unified text formatter', () => {
  it.each([
    ['{"name":"Ada"}', 'json'],
    ['const user = { name: "Ada" }', 'javascript'],
    ['interface User { name: string }', 'typescript'],
    ['<main><p>Hello</p></main>', 'html'],
    ['<?xml version="1.0"?><root />', 'xml'],
    ['.card{color:red}', 'css'],
    ['# Title\n- item', 'markdown'],
    ['A plain sentence.', 'plain-text'],
  ] as const)('detects %s as %s', (input, expected) => {
    expect(detectTextFormat(input)).toBe(expected)
  })

  it('formats and minifies JSON', () => {
    expect(formatText('{"name":"Ada"}')).toContain('\n')
    expect(minifyText('{ "name": "Ada" }')).toBe('{"name":"Ada"}')
  })

  it('normalizes plain text without collapsing line breaks', () => {
    expect(formatText('  hello  \r\n\r\n\r\n world  ', 'plain-text')).toBe('hello\n\n world')
  })

  it('provides a distinct label and badge color for every format strategy', () => {
    const formats: TextFormatId[] = [
      'json',
      'javascript',
      'typescript',
      'html',
      'xml',
      'css',
      'markdown',
      'plain-text',
    ]
    const strategies = formats.map(getTextFormatter)

    expect(strategies.map(({ id }) => id)).toEqual(formats)
    expect(strategies.every(({ labelKey, badgeClassName }) => labelKey && badgeClassName)).toBe(true)
    expect(new Set(strategies.map(({ badgeClassName }) => badgeClassName)).size).toBe(formats.length)
  })

  it('uses a search-selected format and falls back to automatic detection for invalid values', () => {
    expect(getTextFormatSelection('?format=json')).toBe('json')
    expect(getTextFormatSelection('?format=unknown')).toBe('auto')
    expect(getTextFormatSelection('')).toBe('auto')
  })
})