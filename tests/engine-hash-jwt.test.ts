import { describe, expect, it } from 'vitest'

import { HASH_ALGORITHMS, hash, hmac } from '@/core/engines/hash'
import { decodeJwt, looksLikeJwt } from '@/core/engines/jwt'

function makeJwt(payload: Record<string, unknown>, header: Record<string, unknown> = { alg: 'HS256', typ: 'JWT' }): string {
  const encode = (value: unknown) => btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  return `${encode(header)}.${encode(payload)}.fakesignature`
}

describe('hash engine', () => {
  it('computes SHA-256', async () => {
    const result = await hash('SHA-256', 'hello')
    expect(result).toEqual({ ok: true, value: '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824' })
  })

  it('computes MD5 and labels it legacy', async () => {
    const result = await hash('MD5', 'hello')
    expect(result).toEqual({ ok: true, value: '5d41402abc4b2a76b9719d911017c592' })
    expect(HASH_ALGORITHMS.find((a) => a.id === 'MD5')).toMatchObject({ legacy: true, secure: false })
  })

  it('computes HMAC-SHA-256', async () => {
    const result = await hmac('SHA-256', 'The quick brown fox jumps over the lazy dog', 'key')
    expect(result).toEqual({ ok: true, value: 'f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8' })
  })

  it('requires a secret for HMAC', async () => {
    expect((await hmac('SHA-256', 'message', '')).ok).toBe(false)
  })
})

describe('jwt engine', () => {
  it('decodes a valid token', () => {
    const future = Math.floor(Date.now() / 1000) + 3600
    const token = makeJwt({ sub: '123', iss: 'https://issuer.example', exp: future })
    const result = decodeJwt(token)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.header.alg).toBe('HS256')
      expect(result.value.payload.sub).toBe('123')
      expect(result.value.status).toBe('valid')
      expect(result.value.warnings.some((w) => /signature/i.test(w))).toBe(true)
    }
  })

  it('flags expired tokens', () => {
    const token = makeJwt({ exp: 1000, iss: 'x' })
    const result = decodeJwt(token)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.status).toBe('expired')
      expect(result.value.warnings.some((w) => /expired/i.test(w))).toBe(true)
    }
  })

  it('flags not-yet-valid tokens', () => {
    const future = Math.floor(Date.now() / 1000) + 3600
    const token = makeJwt({ exp: future + 3600, nbf: future, iss: 'x' })
    const result = decodeJwt(token)
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.value.status).toBe('not-yet-valid')
  })

  it('warns about missing claims and alg=none', () => {
    const token = makeJwt({ sub: 'x' }, { alg: 'none' })
    const result = decodeJwt(token)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.warnings.some((w) => /no exp/i.test(w))).toBe(true)
      expect(result.value.warnings.some((w) => /unsigned/i.test(w))).toBe(true)
      expect(result.value.warnings.some((w) => /iss/i.test(w))).toBe(true)
    }
  })

  it('strips a Bearer prefix', () => {
    const token = makeJwt({ sub: 'x' })
    expect(decodeJwt(`Bearer ${token}`).ok).toBe(true)
  })

  it('rejects malformed tokens', () => {
    expect(decodeJwt('two.parts').ok).toBe(false)
    expect(decodeJwt('').ok).toBe(false)
    expect(decodeJwt('a.!!!invalid!!!.c').ok).toBe(false)
  })

  it('detects jwt-shaped strings', () => {
    expect(looksLikeJwt(makeJwt({ sub: 'x' }))).toBe(true)
    expect(looksLikeJwt('hello world')).toBe(false)
  })
})
