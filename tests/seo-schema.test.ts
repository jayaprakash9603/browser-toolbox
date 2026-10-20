import { describe, expect, it } from 'vitest'

import { flattenJsonLdTypes, validateJsonLd } from '@/core/engines/seo/schema'

describe('schema validation', () => {
  it('lists JSON-LD types', () => {
    const types = flattenJsonLdTypes([
      {
        raw: '',
        parsed: { '@context': 'https://schema.org', '@type': 'Article', headline: 'Hi' },
      },
    ])
    expect(types).toContain('Article')
  })

  it('flags missing Product name', () => {
    const issues = validateJsonLd([
      { raw: '', parsed: { '@type': 'Product', description: 'x' } },
    ])
    expect(issues.some((i) => i.type === 'Product' && i.missing.includes('name'))).toBe(true)
  })

  it('reports parse errors', () => {
    const issues = validateJsonLd([{ raw: '{', parsed: null, error: 'Unexpected' }])
    expect(issues[0]?.parseError).toBe('Unexpected')
  })
})
