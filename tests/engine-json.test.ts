import { describe, expect, it } from 'vitest'

import {
  buildJsonTree,
  diffJsonValues,
  flattenObject,
  formatJson,
  jsonToCsv,
  jsonToMarkdownTable,
  jsonToTypeScript,
  jsonToXml,
  minifyJson,
  parseJson,
  queryJsonPath,
  validateJson,
} from '@/core/engines/json'

describe('json engine', () => {
  it('parses valid JSON', () => {
    const result = parseJson('{"a":1}')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toEqual({ a: 1 })
  })

  it('reports line and column for invalid JSON', () => {
    const result = parseJson('{\n  "a": 1,\n}')
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.line).toBeGreaterThan(0)
      expect(result.error.column).toBeGreaterThan(0)
    }
  })

  it('suggests a fix for trailing commas', () => {
    const result = parseJson('{"a": 1,}')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.suggestion).toMatch(/trailing comma/i)
  })

  it('rejects empty input with a helpful message', () => {
    const result = parseJson('   ')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error.suggestion).toMatch(/paste/i)
  })

  it('formats and minifies', () => {
    expect(formatJson('{"a":1}')).toEqual({ ok: true, value: '{\n  "a": 1\n}' })
    expect(minifyJson('{ "a": 1 }')).toEqual({ ok: true, value: '{"a":1}' })
  })

  it('format propagates parse errors', () => {
    const result = formatJson('{bad')
    expect(result.ok).toBe(false)
  })

  it('validates without returning the value', () => {
    expect(validateJson('{"ok":true}').valid).toBe(true)
    expect(validateJson('{nope').valid).toBe(false)
  })

  it('builds a tree with paths and sizes', () => {
    const tree = buildJsonTree({ user: { name: 'Ada', tags: ['a', 'b'] } })
    expect(tree.type).toBe('object')
    const user = tree.children?.[0]
    expect(user?.key).toBe('user')
    expect(user?.path).toBe('$.user')
    expect(user?.size).toBe(2)
    const tags = user?.children?.[1]
    expect(tags?.type).toBe('array')
    expect(tags?.children?.[0].path).toBe('$.user.tags[0]')
  })

  it('quotes non-identifier keys in tree paths', () => {
    const tree = buildJsonTree({ 'odd key': 1 })
    expect(tree.children?.[0].path).toBe('$["odd key"]')
  })

  it('queries JSON paths', () => {
    const value = { user: { name: 'Ada', tags: ['a', 'b'] } }
    expect(queryJsonPath(value, '$.user.name')).toEqual({ ok: true, value: 'Ada' })
    expect(queryJsonPath(value, '$.user.tags[1]')).toEqual({ ok: true, value: 'b' })
    expect(queryJsonPath(value, '$')).toEqual({ ok: true, value })
  })

  it('rejects malformed paths and missing keys', () => {
    const value = { a: 1 }
    expect(queryJsonPath(value, 'user.name').ok).toBe(false)
    expect(queryJsonPath(value, '$.missing').ok).toBe(false)
    expect(queryJsonPath(value, '$.a[0]').ok).toBe(false)
  })

  it('reports nested JSON additions, removals, and changes by path', () => {
    expect(
      diffJsonValues(
        { profile: { name: 'Ada', enabled: true }, tags: ['dev', 'qa'] },
        { profile: { name: 'Grace', enabled: true, role: 'admin' }, tags: ['dev'] },
      ),
    ).toEqual([
      { path: '$.profile.name', kind: 'changed', before: 'Ada', after: 'Grace' },
      { path: '$.profile.role', kind: 'added', before: undefined, after: 'admin' },
      { path: '$.tags[1]', kind: 'removed', before: 'qa', after: undefined },
    ])
  })

  it('reports a container type replacement at its path', () => {
    expect(diffJsonValues({ value: [] }, { value: {} })).toEqual([
      { path: '$.value', kind: 'changed', before: [], after: {} },
    ])
  })

  it('flattens nested objects and stringifies arrays', () => {
    expect(flattenObject({ a: { b: 1 }, list: [1, 2] })).toEqual({ 'a.b': 1, list: '[1,2]' })
  })

  it('converts JSON arrays to CSV with escaping', () => {
    const result = jsonToCsv([
      { a: 1, b: 'x,"y"' },
      { a: 2, c: true },
    ])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.split('\n')[0]).toBe('a,b,c')
      expect(result.value).toContain('"x,""y"""')
    }
  })

  it('rejects non-array JSON for CSV', () => {
    expect(jsonToCsv('{"a":1}').ok).toBe(false)
  })

  it('converts JSON to XML and back-compatible JSON', () => {
    const result = jsonToXml({ user: { name: 'Ada', age: 36 } })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toContain('<name>Ada</name>')
      expect(result.value).toContain('<?xml version="1.0"')
    }
  })

  it('escapes XML special characters', () => {
    const result = jsonToXml({ note: 'a < b & "c"' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toContain('a &lt; b &amp; &quot;c&quot;')
  })

  it('converts JSON to TypeScript interfaces', () => {
    const output = jsonToTypeScript(
      { user: { name: 'Ada', tags: ['a'] }, active: true },
      { rootName: 'Person' },
    )
    expect(output).toContain('export interface Person')
    expect(output).toContain('name: string;')
    expect(output).toContain('active: boolean;')
    expect(output).toMatch(/tags: string\[\]/)
    expect(output).toContain('export interface User')
  })

  it('converts JSON arrays to a markdown table', () => {
    const result = jsonToMarkdownTable([{ name: 'Ada', role: 'dev' }])
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value).toContain('| name | role |')
      expect(result.value).toContain('| Ada | dev |')
    }
  })

  it('handles unicode content', () => {
    const result = formatJson('{"msg":"héllo ✓"}')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value).toContain('héllo ✓')
  })

  it('handles large input without crashing', () => {
    const big = JSON.stringify({ items: Array.from({ length: 5000 }, (_, i) => ({ i })) })
    expect(validateJson(big).valid).toBe(true)
  })
})
