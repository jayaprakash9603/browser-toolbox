import { describe, expect, it } from 'vitest'

import { detectResponseFormat, diffResponseBodies, formatResponseBody } from '@/core/engines/api'

describe('api engine', () => {
  it('detects JSON responses', () => {
    expect(detectResponseFormat('{"a":1}')).toBe('json')
  })

  it('formats JSON bodies', () => {
    const formatted = formatResponseBody('{"a":1}', 'json')
    expect(formatted).toContain('\n')
  })

  it('diffs response bodies', () => {
    const diff = diffResponseBodies('{"a":1}', '{"a":2}')
    expect(diff.added + diff.removed).toBeGreaterThan(0)
  })
})
