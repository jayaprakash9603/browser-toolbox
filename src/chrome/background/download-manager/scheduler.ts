import {
  DOWNLOAD_ALARM_PREFIX,
  getDownloadManagerState,
  setSchedules,
  randomId,
  type ScheduledJob,
} from '@/core/download-manager'
import { createLogger } from '@/core/logging'

import { enqueueUrls, kickQueue } from './queue'

const logger = createLogger('download-manager-scheduler')

export function scheduleAlarmName(jobId: string): string {
  return `${DOWNLOAD_ALARM_PREFIX}${jobId}`
}

export async function upsertSchedule(job: Omit<ScheduledJob, 'id' | 'createdAt'> & { id?: string }): Promise<ScheduledJob> {
  const state = await getDownloadManagerState()
  const full: ScheduledJob = {
    id: job.id ?? randomId(),
    queueItemIds: job.queueItemIds,
    startAt: job.startAt,
    enabled: job.enabled,
    mode: job.mode,
    createdAt: Date.now(),
  }
  const rest = state.schedules.filter((s) => s.id !== full.id)
  state.schedules = [...rest, full]
  await setSchedules(state.schedules)
  await syncScheduleAlarm(full)
  return full
}

export async function deleteSchedule(jobId: string): Promise<void> {
  const state = await getDownloadManagerState()
  state.schedules = state.schedules.filter((s) => s.id !== jobId)
  await setSchedules(state.schedules)
  try {
    await chrome.alarms.clear(scheduleAlarmName(jobId))
  } catch {
    /* */
  }
}

async function syncScheduleAlarm(job: ScheduledJob): Promise<void> {
  const name = scheduleAlarmName(job.id)
  try {
    await chrome.alarms.clear(name)
  } catch {
    /* */
  }
  if (!job.enabled || job.startAt <= Date.now()) return
  try {
    await chrome.alarms.create(name, { when: job.startAt })
  } catch (error) {
    logger.warn('alarm create failed', error)
  }
}

export async function syncAllScheduleAlarms(): Promise<void> {
  const { schedules } = await getDownloadManagerState()
  for (const job of schedules) await syncScheduleAlarm(job)
}

export function registerDownloadScheduler(): void {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (!alarm.name.startsWith(DOWNLOAD_ALARM_PREFIX)) return
    const jobId = alarm.name.slice(DOWNLOAD_ALARM_PREFIX.length)
    void runScheduledJob(jobId)
  })
}

async function runScheduledJob(jobId: string): Promise<void> {
  const state = await getDownloadManagerState()
  const job = state.schedules.find((s) => s.id === jobId)
  if (!job || !job.enabled) return
  const items = state.queue.filter((q) => job.queueItemIds.includes(q.id) && q.status === 'pending')
  if (items.length === 0) return
  await enqueueUrls(items.map((q) => ({ url: q.url, filename: q.filename, referrer: q.referrer })))
  job.enabled = false
  await setSchedules(state.schedules.map((s) => (s.id === jobId ? job : s)))
  kickQueue()
}
