import { describe, expect, it } from 'vitest'

import { matchGraphqlRule, parseGraphqlBody } from '@/core/interceptor/graphql'

describe('interceptor graphql', () => {
  it('parses operation name', () => {
    const body = JSON.stringify({ operationName: 'GetUser', query: 'query GetUser { id }' })
    expect(parseGraphqlBody(body)?.operationName).toBe('GetUser')
    expect(matchGraphqlRule(body, 'GetUser')).toBe(true)
    expect(matchGraphqlRule(body, 'Other')).toBe(false)
  })
})
