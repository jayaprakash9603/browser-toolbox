import { describe, expect, it } from 'vitest'

import { isRuleActive, matchRule, matchSource, testRulesAgainstUrl } from '@/core/interceptor/matcher'
import type { RedirectRule } from '@/core/interceptor/types'

describe('interceptor matcher', () => {
  it('matches host equals', () => {
    expect(
      matchSource('https://api.example.com/v1', {
        field: 'host',
        operator: 'equals',
        value: 'api.example.com',
      }),
    ).toBe(true)
  })

  it('matches when any extra source matches', () => {
    const rule: RedirectRule = {
      id: '1',
      name: 'r',
      enabled: true,
      groupId: 'default',
      priority: 1,
      createdAt: 0,
      updatedAt: 0,
      type: 'redirect',
      source: { field: 'url', operator: 'contains', value: 'nomatch' },
      extraSources: [{ field: 'host', operator: 'equals', value: 'api.example.com' }],
      destination: 'https://localhost',
    }
    expect(matchRule(rule, { url: 'https://api.example.com/x' })).toBe(true)
  })

  it('does not match rules in a disabled group', () => {
    const rule: RedirectRule = {
      id: '1',
      name: 'r',
      enabled: true,
      groupId: 'g1',
      priority: 1,
      createdAt: 0,
      updatedAt: 0,
      type: 'redirect',
      source: { field: 'url', operator: 'contains', value: 'api' },
      destination: 'https://localhost',
    }
    expect(
      isRuleActive(rule, [{ id: 'g1', name: 'G', order: 0, enabled: false }]),
    ).toBe(false)
  })

  it('tests redirect transform', () => {
    const rule: RedirectRule = {
      id: '1',
      name: 'r',
      enabled: true,
      groupId: 'default',
      priority: 1,
      createdAt: 0,
      updatedAt: 0,
      type: 'redirect',
      source: { field: 'url', operator: 'contains', value: 'api.example.com' },
      destination: 'https://localhost:3000$path',
    }
    const result = testRulesAgainstUrl([rule], 'https://api.example.com/users')
    expect(result.matches).toBe(true)
    expect(result.transformedUrl).toContain('localhost')
  })
})
