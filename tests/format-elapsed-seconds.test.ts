import { describe, expect, it } from 'vitest'

import { formatElapsedSeconds } from '@/shared/utils/formatElapsedSeconds'

describe('formatElapsedSeconds', () => {
  it('formats short and long durations', () => {
    expect(formatElapsedSeconds(0)).toBe('0s')
    expect(formatElapsedSeconds(45)).toBe('45s')
    expect(formatElapsedSeconds(125)).toBe('2m 05s')
  })
})
