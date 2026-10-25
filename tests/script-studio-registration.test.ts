import { describe, expect, it } from 'vitest'

import { buildRegistrationBundle } from '@/core/script-studio/registration'
import { DEFAULT_SCRIPT_STUDIO_SETTINGS } from '@/core/script-studio/settings'
import type { ScriptRecord } from '@/core/script-studio'

const SAMPLE = `// ==UserScript==
// @name Test
// @namespace https://example.com/
// @version 1.0.0
// @match https://example.com/*
// @grant GM_addStyle
// ==/UserScript==
console.log(1);
`

const record: ScriptRecord = {
  id: 'r1',
  uuid: 'r1',
  enabled: true,
  trashed: false,
  position: 1,
  createdAt: 1,
  updatedAt: 1,
  overrides: {},
  size: 100,
  name: 'Test',
  version: '1.0.0',
}

describe('script-studio registration', () => {
  it('builds USER_SCRIPT bundle for granted script', () => {
    const bundle = buildRegistrationBundle(
      record,
      SAMPLE,
      {},
      [],
      '// runtime',
      DEFAULT_SCRIPT_STUDIO_SETTINGS,
      '0.1.0',
    )
    expect(bundle?.world).toBe('USER_SCRIPT')
    expect(bundle?.matches.some((m) => m.includes('example.com'))).toBe(true)
    expect(bundle?.code).toContain('GM_addStyle')
  })

  it('uses MAIN for @grant none', () => {
    const none = SAMPLE.replace('@grant GM_addStyle', '@grant none')
    const bundle = buildRegistrationBundle(
      record,
      none,
      {},
      [],
      '// runtime',
      DEFAULT_SCRIPT_STUDIO_SETTINGS,
      '0.1.0',
    )
    expect(bundle?.world).toBe('MAIN')
  })
})
