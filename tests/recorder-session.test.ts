import { describe, expect, it } from 'vitest'

import { createSession, elapsedMs, markPaused, markResumed, markStarted, markStopping } from '@/core/recorder/session'

describe('recorder session state', () => {
  it('tracks elapsed time across pause and resume', () => {
    let s = createSession('r1', 'tab', 'offscreen', 0, { tabId: 3 })
    expect(s.phase).toBe('pending')
    expect(elapsedMs(s, 5_000)).toBe(0)

    s = markStarted(s, 1_000)
    expect(elapsedMs(s, 4_000)).toBe(3_000)

    s = markPaused(s, 4_000)
    expect(s.phase).toBe('paused')
    expect(elapsedMs(s, 10_000)).toBe(3_000)

    s = markResumed(s, 10_000)
    expect(s.phase).toBe('recording')
    expect(elapsedMs(s, 12_000)).toBe(5_000)
  })

  it('freezes the timer as soon as Stop is pressed', () => {
    let s = markStarted(createSession('r3', 'screen', 'page', 0), 1_000)
    s = markStopping(s, 6_000)
    expect(s.phase).toBe('stopping')
    expect(elapsedMs(s, 9_000)).toBe(5_000)

    const paused = markStopping(markPaused(markStarted(createSession('r4', 'tab', 'offscreen', 0), 1_000), 3_000), 7_000)
    expect(elapsedMs(paused, 9_000)).toBe(2_000)
  })

  it('ignores invalid transitions', () => {
    const pending = createSession('r2', 'screen', 'page', 0)
    expect(markPaused(pending, 1)).toBe(pending)
    expect(markResumed(pending, 1)).toBe(pending)
    const started = markStarted(pending, 1)
    expect(markStarted(started, 2)).toBe(started)
  })
})
