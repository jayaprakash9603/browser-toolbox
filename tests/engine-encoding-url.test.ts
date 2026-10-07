import { describe, expect, it } from 'vitest'

import { decode, encode } from '@/core/engines/encoding'
import { cleanUrl, decodeUrlComponent, encodeUrlComponent, getQueryParams, looksLikeUrl, parseUrl, setQueryParam, deleteQueryParam } from '@/core/engines/url'

describe('encoding engine', () => {
  it('round-trips base64 with unicode', () => {
    const encoded = encode('base64', 'héllo ✓ 世界')
    expect(encoded.ok).toBe(true)
    if (encoded.ok) {
      const decoded = decode('base64', encoded.value)
      expect(decoded).toEqual({ ok: true, value: 'héllo ✓ 世界' })
    }
  })

  it('rejects invalid base64', () => {
    expect(decode('base64', 'not!!!base64').ok).toBe(false)
    expect(decode('base64', 'abcde').ok).toBe(false)
  })

  it('round-trips url encoding', () => {
    const encoded = encode('url', 'a b&c=d?e')
    expect(encoded).toEqual({ ok: true, value: 'a%20b%26c%3Dd%3Fe' })
    expect(decode('url', 'a%20b%26c%3Dd%3Fe')).toEqual({ ok: true, value: 'a b&c=d?e' })
    expect(decode('url', '%zz').ok).toBe(false)
  })

  it('round-trips html entities', () => {
    const encoded = encode('html', '<div class="x">&\'')
    expect(encoded.ok).toBe(true)
    if (encoded.ok) {
      expect(encoded.value).toBe('&lt;div class=&quot;x&quot;&gt;&amp;&#39;')
      expect(decode('html', encoded.value)).toEqual({ ok: true, value: '<div class="x">&\'' })
    }
  })

  it('round-trips unicode escapes', () => {
    const encoded = encode('unicode', 'aé世')
    expect(encoded).toEqual({ ok: true, value: 'a\\u00e9\\u4e16' })
    expect(decode('unicode', 'a\\u00e9\\u4e16')).toEqual({ ok: true, value: 'aé世' })
    expect(decode('unicode', '\\u{1f600}')).toEqual({ ok: true, value: '😀' })
  })

  it('round-trips hex with formatting tolerance', () => {
    const encoded = encode('hex', 'AB')
    expect(encoded).toEqual({ ok: true, value: '4142' })
    expect(decode('hex', '41 42')).toEqual({ ok: true, value: 'AB' })
    expect(decode('hex', '414')).toMatchObject({ ok: false })
    expect(decode('hex', 'zz').ok).toBe(false)
  })
})

describe('url engine', () => {
  it('parses full URLs', () => {
    const result = parseUrl('https://example.com:8080/path?a=1#frag')
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.host).toBe('example.com:8080')
      expect(result.value.pathname).toBe('/path')
    }
  })

  it('assumes https for bare domains', () => {
    const result = parseUrl('example.com/x')
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.protocol).toBe('https:')
  })

  it('rejects invalid and empty input', () => {
    expect(parseUrl('').ok).toBe(false)
    expect(parseUrl('http://').ok).toBe(false)
  })

  it('lists and edits query params', () => {
    const parsed = parseUrl('https://example.com/?a=1&b=2')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    expect(getQueryParams(parsed.value)).toEqual([
      { key: 'a', value: '1' },
      { key: 'b', value: '2' },
    ])
    const updated = setQueryParam(parsed.value, 'a', '9')
    expect(updated.searchParams.get('a')).toBe('9')
    expect(deleteQueryParam(updated, 'b').searchParams.get('b')).toBeNull()
  })

  it('strips tracking parameters', () => {
    const parsed = parseUrl('https://example.com/?id=42&utm_source=newsletter&fbclid=abc')
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    const { url, removed } = cleanUrl(parsed.value)
    expect(removed.sort()).toEqual(['fbclid', 'utm_source'])
    expect(url.searchParams.get('id')).toBe('42')
  })

  it('encodes and decodes components', () => {
    expect(encodeUrlComponent('a&b')).toBe('a%26b')
    expect(decodeUrlComponent('a%26b')).toEqual({ ok: true, value: 'a&b' })
    expect(decodeUrlComponent('%').ok).toBe(false)
  })

  it('detects urls', () => {
    expect(looksLikeUrl('https://example.com/a?b=1')).toBe(true)
    expect(looksLikeUrl('example.com/path')).toBe(true)
    expect(looksLikeUrl('not a url')).toBe(false)
  })
})
