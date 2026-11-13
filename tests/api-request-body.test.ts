import { describe, expect, it } from 'vitest'

import { serializeWebRequestBody, truncateBody } from '@/core/interceptor/requestBody'

describe('request body serialization', () => {
  it('serializes formData', () => {
    const result = serializeWebRequestBody({
      formData: { name: ['Ada'], city: ['Paris'] },
    })
    expect(result?.truncated).toBe(false)
    expect(result?.text).toContain('name=Ada')
    expect(result?.text).toContain('city=Paris')
  })

  it('serializes raw utf-8 bytes and truncates', () => {
    const raw = new TextEncoder().encode('{"ok":true}')
    const result = serializeWebRequestBody({ raw: [{ bytes: raw.buffer }] })
    expect(result?.text).toBe('{"ok":true}')
    expect(truncateBody('abcdef', 3)).toEqual({ text: 'abc', truncated: true })
  })

  it('returns undefined when empty or errored', () => {
    expect(serializeWebRequestBody(undefined)).toBeUndefined()
    expect(serializeWebRequestBody({ error: 'unknown' })).toBeUndefined()
  })
})
