import type { ScheduledMessage } from '@/core/sites/whatsapp/types'

export const WA_SCHEDULE_ALARM = 'wa-schedule'

export function hasPendingScheduledMessages(scheduled: ScheduledMessage[]): boolean {
  return scheduled.some((job) => job.status === 'pending')
}

/** Create or clear the 1-minute poll alarm depending on pending scheduled sends. */
export async function syncWaScheduleAlarm(scheduled: ScheduledMessage[]): Promise<void> {
  const pending = hasPendingScheduledMessages(scheduled)
  const existing = await chrome.alarms.get(WA_SCHEDULE_ALARM)
  if (pending && !existing) {
    await chrome.alarms.create(WA_SCHEDULE_ALARM, { periodInMinutes: 1 })
  } else if (!pending && existing) {
    await chrome.alarms.clear(WA_SCHEDULE_ALARM)
  }
}
