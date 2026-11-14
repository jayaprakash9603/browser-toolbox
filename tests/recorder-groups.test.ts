import { describe, expect, it } from 'vitest'

import { groupRecordingsByDay, recordingDayGroup } from '@/features/recorder/recordingGroups'
import type { RecordingMeta } from '@/core/recorder/types'

function meta(createdAt: number): RecordingMeta {
  return {
    id: String(createdAt),
    name: 'Test',
    mimeType: 'video/webm',
    source: 'tab',
    createdAt,
    durationMs: 1000,
    size: 100,
  }
}

describe('recording library groups', () => {
  it('buckets recordings by local day', () => {
    const now = new Date('2026-03-21T15:00:00').getTime()
    expect(recordingDayGroup(now, now)).toBe('today')
    expect(recordingDayGroup(now - 86_400_000, now)).toBe('yesterday')
    expect(recordingDayGroup(now - 3 * 86_400_000, now)).toBe('older')
  })

  it('returns only non-empty groups', () => {
    const now = new Date('2026-03-21T12:00:00').getTime()
    const groups = groupRecordingsByDay([meta(now), meta(now - 86_400_000)], now)
    expect(groups.map((g) => g.group)).toEqual(['today', 'yesterday'])
  })
})