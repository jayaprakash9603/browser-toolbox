import { describe, expect, it } from 'vitest'

import { isConnectAllowed } from '@/core/script-studio/connect'

describe('script-studio connect', () => {
  it('allows declared hosts', () => {
    expect(
      isConnectAllowed('https://api.example.com/x', ['example.com'], [], 'allowlist', new Set()),
    ).toBe(true)
  })

  it('denies when mode is deny', () => {
    expect(isConnectAllowed('https://example.com', ['*'], [], 'deny', new Set())).toBe(false)
  })
})
