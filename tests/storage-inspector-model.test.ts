import { describe, expect, it } from 'vitest'

import {
  asTimestamp,
  decodeJwt,
  detectKind,
  filterEntries,
  formatBytes,
  minifyJson,
  parseImport,
  prettyValue,
  toEntries,
} from '@/core/storage-inspector/model'

const b64 = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')
const jwt = `${b64({ alg: 'HS256' })}.${b64({ sub: '1', exp: 4_000_000_000 })}.sig`

describe('storage inspector model', () => {
  it('detects value kinds', () => {
    expect(detectKind('')).toBe('empty')
    expect(detectKind('{"a":1}')).toBe('json')
    expect(detectKind('[1,2]')).toBe('json')
    expect(detectKind(jwt)).toBe('jwt')
    expect(detectKind('true')).toBe('boolean')
    expect(detectKind('1700000000')).toBe('timestamp')
    expect(detectKind('1700000000000')).toBe('timestamp')
    expect(detectKind('42')).toBe('number')
    expect(detectKind('https://example.com/a')).toBe('url')
    expect(detectKind('hello')).toBe('text')
    expect(detectKind('{broken')).toBe('text')
  })

  it('decodes JWT expiry and rejects lookalikes', () => {
    expect(decodeJwt(jwt)?.expiresAt).toBe(4_000_000_000_000)
    expect(decodeJwt('a.b.c')).toBeNull()
    expect(asTimestamp('123')).toBeNull()
  })

  it('formats sizes and JSON', () => {
    expect(formatBytes(512)).toBe('512 B')
    expect(formatBytes(2048)).toBe('2.0 KB')
    expect(prettyValue('{"a":1}')).toBe('{\n  "a": 1\n}')
    expect(prettyValue('plain')).toBe('plain')
    expect(minifyJson('{ "a": 1 }')).toBe('{"a":1}')
    expect(minifyJson('nope')).toBeNull()
  })

  it('filters by query and type, and sorts', () => {
    const entries = toEntries({ b: '{"x":1}', a: 'hello world', c: 'https://x.dev' })
    expect(filterEntries(entries, '', 'all', 'name').map((e) => e.key)).toEqual(['a', 'b', 'c'])
    expect(filterEntries(entries, 'WORLD', 'all', 'name').map((e) => e.key)).toEqual(['a'])
    expect(filterEntries(entries, '', 'json', 'name').map((e) => e.key)).toEqual(['b'])
    expect(filterEntries(entries, '', 'all', 'size')[0].key).toBe('c')
  })

  it('parses imports defensively', () => {
    expect(parseImport('{"a":"1","b":2,"c":{"d":true}}')).toEqual({
      ok: true,
      entries: { a: '1', b: '2', c: '{"d":true}' },
    })
    expect(parseImport('nope')).toEqual({ ok: false, error: 'invalid' })
    expect(parseImport('[1]')).toEqual({ ok: false, error: 'shape' })
    expect(parseImport('{}')).toEqual({ ok: false, error: 'empty' })
  })
})
