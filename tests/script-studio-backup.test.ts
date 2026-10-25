import { describe, expect, it } from 'vitest'

import { backupFromZip, backupToJson, backupToZip, buildBackupPayload, parseBackupJson } from '@/core/script-studio/backup'
import { DEFAULT_SCRIPT_STUDIO_INDEX } from '@/core/script-studio/service'
import { DEFAULT_SCRIPT_STUDIO_SETTINGS } from '@/core/script-studio/settings'

describe('script-studio backup', () => {
  it('round-trips json and zip', () => {
    const payload = buildBackupPayload(
      DEFAULT_SCRIPT_STUDIO_INDEX,
      DEFAULT_SCRIPT_STUDIO_SETTINGS,
      [{ id: 'a', code: '// ==UserScript==\n// @name x\n// ==/UserScript==', values: { k: 1 }, externals: [] }],
      { includeValues: true, includeSettings: true, includeExternals: true },
    )
    const json = backupToJson(payload)
    expect(parseBackupJson(json).scripts[0].id).toBe('a')
    const zip = backupToZip(payload)
    expect(backupFromZip(zip).scripts[0].code).toContain('UserScript')
  })
})
