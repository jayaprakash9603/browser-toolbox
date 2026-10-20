import { describe, expect, it } from 'vitest'

import { INTERCEPTOR_RULE_ID_BASE } from '@/core/interceptor/constants'
import { compileRulesToDnr } from '@/core/interceptor/toDnr'
import type { CancelRule } from '@/core/interceptor/types'

describe('interceptor toDnr', () => {
  it('compiles cancel rule', () => {
    const rule: CancelRule = {
      id: '1',
      name: 'block',
      enabled: true,
      groupId: 'default',
      priority: 1,
      createdAt: 0,
      updatedAt: 0,
      type: 'cancel',
      source: { field: 'url', operator: 'contains', value: 'tracker' },
    }
    const { rules, errors } = compileRulesToDnr([rule], INTERCEPTOR_RULE_ID_BASE)
    expect(errors).toHaveLength(0)
    expect(rules).toHaveLength(1)
    expect(rules[0].action.type).toBe('block')
  })
})
