import { describe, expect, it } from 'vitest'

import { compareText } from '@/core/engines/diff'

describe('diff engine', () => {
  it('counts line additions and removals', () => {
    const result = compareText('alpha\nbeta', 'alpha\ngamma', 'lines')
    expect(result.added).toBeGreaterThan(0)
    expect(result.removed).toBeGreaterThan(0)
  })

  it('handles identical input', () => {
    const result = compareText('same', 'same', 'words')
    expect(result.added).toBe(0)
    expect(result.removed).toBe(0)
  })
})
