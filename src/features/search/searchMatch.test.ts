import { describe, expect, it } from 'vitest'

import { tokensMatchText } from '@/features/search/searchMatch'

describe('searchMatch', () => {
  it('matches split words against a compound keyword', () => {
    expect(tokensMatchText('linear barcode ean generator', ['bar', 'code'])).toBe(true)
  })

  it('matches glued query against spaced text', () => {
    expect(tokensMatchText('api request builder', ['api', 'request'])).toBe(true)
  })
})
