import { describe, expect, it, beforeEach } from 'vitest'

import {
  baselineKey,
  compareToBaseline,
  saveBaseline,
  type BaselineRecord,
} from '@/tools/security/hash-toolkit/baselineStore'

describe('hash baseline store', () => {
  beforeEach(() => localStorage.clear())

  it('detects content changes for the same path', () => {
    const record: BaselineRecord = {
      path: 'evidence.bin',
      size: 4,
      lastModified: 1000,
      digests: { 'SHA-256': 'aa'.repeat(32) },
      savedAt: new Date(0).toISOString(),
    }
    saveBaseline(record)
    expect(baselineKey(record.path, record.size, record.lastModified)).toContain('evidence.bin')
    expect(compareToBaseline('evidence.bin', 4, 1000, { 'SHA-256': 'aa'.repeat(32) })).toBe('match')
    expect(compareToBaseline('evidence.bin', 4, 1000, { 'SHA-256': 'bb'.repeat(32) })).toBe(
      'modified',
    )
    expect(compareToBaseline('evidence.bin', 5, 1000, { 'SHA-256': 'aa'.repeat(32) })).toBe(
      'metadata-changed',
    )
    expect(compareToBaseline('evidence.bin', 4, 2000, { 'SHA-256': 'aa'.repeat(32) })).toBe(
      'metadata-changed',
    )
  })
})
