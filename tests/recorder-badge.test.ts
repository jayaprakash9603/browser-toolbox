import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  applyRecorderToolbarBadge,
  recorderBadgeColor,
  recorderBadgeText,
  recorderOwnsActionBadge,
} from '@/chrome/background/recorder/badge'
import { createSession, markCountdown, markStarted } from '@/core/recorder/session'

describe('recorder toolbar badge', () => {
  afterEach(async () => {
    await applyRecorderToolbarBadge(null)
    vi.useRealTimers()
    vi.mocked(chrome.action.setBadgeText).mockClear()
    vi.mocked(chrome.action.setBadgeBackgroundColor).mockClear()
    vi.mocked(chrome.declarativeNetRequest.setExtensionActionOptions).mockClear()
  })

  it('shows remaining countdown seconds, then REC, then the timer', () => {
    const pending = createSession('rec-1', 'tab', 'offscreen', 1_000, { tabId: 1 })
    expect(recorderBadgeText(pending, 1_000)).toBe('REC')

    const counting = markCountdown(pending, 4_000)
    expect(recorderBadgeText(counting, 1_000)).toBe('3')
    expect(recorderBadgeText(counting, 2_400)).toBe('2')
    expect(recorderBadgeColor(counting)).toBe('#dc2626')

    const recording = markStarted(counting, 4_000)
    expect(recorderBadgeText(recording, 4_000)).toBe('0:00')
    expect(recorderBadgeText(recording, 4_000 + 9_000)).toBe('0:09')
  })

  it('stamps the action badge globally and on every tab so refresh and other sites keep 3-2-1', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)

    const session = markCountdown(createSession('rec-1', 'tab', 'offscreen', 1_000, { tabId: 1 }), 4_000)
    await applyRecorderToolbarBadge(session)

    expect(recorderOwnsActionBadge()).toBe(true)
    expect(chrome.declarativeNetRequest.setExtensionActionOptions).toHaveBeenCalledWith({
      displayActionCountAsBadgeText: false,
    })
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '3' })
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '3', tabId: 1 })
    expect(chrome.action.setBadgeBackgroundColor).toHaveBeenCalledWith({ color: '#dc2626' })
  })

  it('clears the badge and releases ownership when the session ends', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(1_000)
    const session = markCountdown(createSession('rec-1', 'tab', 'offscreen', 1_000, { tabId: 1 }), 4_000)
    await applyRecorderToolbarBadge(session)
    vi.mocked(chrome.action.setBadgeText).mockClear()

    await applyRecorderToolbarBadge(null)
    expect(recorderOwnsActionBadge()).toBe(false)
    expect(chrome.action.setBadgeText).toHaveBeenCalledWith({ text: '' })
  })
})
