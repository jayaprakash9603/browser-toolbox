import type { RecordingMeta } from '@/core/recorder/types'

export type RecordingDayGroup = 'today' | 'yesterday' | 'older'

export function startOfLocalDay(time: number): number {
  const d = new Date(time)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function recordingDayGroup(createdAt: number, now = Date.now()): RecordingDayGroup {
  const today = startOfLocalDay(now)
  const created = startOfLocalDay(createdAt)
  if (created >= today) return 'today'
  if (created >= today - 86_400_000) return 'yesterday'
  return 'older'
}

export function groupRecordingsByDay(
  recordings: RecordingMeta[],
  now = Date.now(),
): { group: RecordingDayGroup; items: RecordingMeta[] }[] {
  const buckets: Record<RecordingDayGroup, RecordingMeta[]> = {
    today: [],
    yesterday: [],
    older: [],
  }
  for (const item of recordings) buckets[recordingDayGroup(item.createdAt, now)].push(item)
  const order: RecordingDayGroup[] = ['today', 'yesterday', 'older']
  return order.filter((group) => buckets[group].length > 0).map((group) => ({ group, items: buckets[group] }))
}