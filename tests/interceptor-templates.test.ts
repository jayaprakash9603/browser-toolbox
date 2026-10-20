import { describe, expect, it } from 'vitest'

import { INTERCEPTOR_TEMPLATES } from '@/features/interceptor/templatesCatalog'

describe('interceptor templates catalog', () => {
  it('builds valid unique rules with sources', () => {
    const ids = new Set<string>()
    for (const tpl of INTERCEPTOR_TEMPLATES) {
      const rules = tpl.build()
      expect(rules.length).toBeGreaterThan(0)
      for (const rule of rules) {
        expect(rule.source.value.length).toBeGreaterThan(0)
        expect(ids.has(rule.id)).toBe(false)
        ids.add(rule.id)
      }
    }
  })
})
