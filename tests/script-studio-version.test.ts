import { describe, expect, it } from 'vitest'

import { compareVersions, isNewerVersion } from '@/core/script-studio/version'

describe('script-studio version', () => {
  it('compares semver-ish strings', () => {
    expect(compareVersions('1.2.0', '1.1.9')).toBe(1)
    expect(compareVersions('1.0', '1.0.0')).toBe(0)
    expect(isNewerVersion('2.0', '1.9')).toBe(true)
  })
})
