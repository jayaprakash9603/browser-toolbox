import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  hasPendingScheduledMessages,
  syncWaScheduleAlarm,
  WA_SCHEDULE_ALARM,
} from '@/chrome/background/sites/whatsappScheduleAlarm'
import type { ScheduledMessage } from '@/core/sites/whatsapp/types'
import { resetChromeMockStorage } from './setup'

function pendingJob(id: string): ScheduledMessage {
  return {
    id,
    chatId: '1',
    chatLabel: 'Test',
    body: 'hi',
    fireAt: Date.now() + 60_000,
    status: 'pending',
  }
}

describe('WhatsApp schedule alarm', () => {
  beforeEach(() => {
    resetChromeMockStorage()
    vi.clearAllMocks()
  })

  it('detects pending scheduled messages', () => {
    expect(hasPendingScheduledMessages([])).toBe(false)
    expect(hasPendingScheduledMessages([{ ...pendingJob('a'), status: 'sent' }])).toBe(false)
    expect(hasPendingScheduledMessages([pendingJob('b')])).toBe(true)
  })

  it('creates the alarm only when a pending job exists', async () => {
    await syncWaScheduleAlarm([])
    expect(chrome.alarms.create).not.toHaveBeenCalled()

    await syncWaScheduleAlarm([pendingJob('x')])
    expect(chrome.alarms.create).toHaveBeenCalledWith(WA_SCHEDULE_ALARM, { periodInMinutes: 1 })
  })

  it('clears the alarm when no pending jobs remain', async () => {
    vi.mocked(chrome.alarms.get).mockImplementation(async () => ({ name: WA_SCHEDULE_ALARM }))
    await syncWaScheduleAlarm([])
    expect(chrome.alarms.clear).toHaveBeenCalledWith(WA_SCHEDULE_ALARM)
  })
})
