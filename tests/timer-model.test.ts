import { describe, expect, it } from 'vitest'

import {
  addLap,
  applyCountdownPreset,
  countdownNotice,
  countdownRemaining,
  finishPomodoro,
  formatClock,
  pauseCountdown,
  startCountdown,
  startPomodoro,
  stopwatchElapsed,
  defaultTimerSnapshot,
} from '@/core/timer/model'

describe('countdown', () => {
  it('formats hours, minutes and seconds', () => {
    expect(formatClock(0)).toBe('00:00:00')
    expect(formatClock(5 * 60_000)).toBe('00:05:00')
    expect(formatClock(3_661_000)).toBe('01:01:01')
  })

  it('keeps a paused countdown and resumes from the time left', () => {
    const now = 1_000_000
    const running = startCountdown(applyCountdownPreset(defaultTimerSnapshot().countdown, 5), now)
    const paused = pauseCountdown(running, now + 60_000)
    expect(countdownRemaining(paused, now + 120_000)).toBe(4 * 60_000)
    const resumed = startCountdown(paused, now + 120_000)
    expect(resumed.endAt).toBe(now + 120_000 + 4 * 60_000)
  })

  it('stores an hour as hours so a 60 minute preset stays inside the minute field', () => {
    const next = applyCountdownPreset(defaultTimerSnapshot().countdown, 60)
    expect(next.hours).toBe(1)
    expect(next.minutes).toBe(0)
    expect(next.remainingMs).toBe(60 * 60_000)
  })

  it('names the countdown in the completion notice', () => {
    expect(countdownNotice('')).toEqual({ title: "Time's up", message: 'Your countdown finished.' })
    expect(countdownNotice('  Tea ')).toEqual({ title: "Time's up", message: 'Tea finished.' })
  })
})

describe('stopwatch', () => {
  it('keeps elapsed time from the start timestamp and records laps', () => {
    const started = { ...defaultTimerSnapshot().stopwatch, status: 'running' as const, baseMs: 1000, startedAt: 5000 }
    expect(stopwatchElapsed(started, 8000)).toBe(4000)
    const lapped = addLap(started, 8000)
    expect(lapped.laps).toEqual([4000])
  })
})

describe('pomodoro', () => {
  it('starts a short break after focus, then the next focus round', () => {
    const now = 10_000
    const running = startPomodoro(defaultTimerSnapshot().pomodoro, now)
    const afterWork = finishPomodoro(running, now + 25 * 60_000)
    expect(afterWork.state.phase).toBe('break')
    expect(afterWork.state.status).toBe('running')
    expect(afterWork.notice.title).toBe('Focus finished')
    expect(afterWork.notice.message).toContain('Short break')

    const afterBreak = finishPomodoro(afterWork.state, afterWork.state.endAt ?? now)
    expect(afterBreak.state.phase).toBe('work')
    expect(afterBreak.state.round).toBe(2)
  })

  it('uses the long break on the last round and waits when auto-start is off', () => {
    const base = { ...defaultTimerSnapshot().pomodoro, round: 4, status: 'running' as const, endAt: 50_000 }
    const longBreak = finishPomodoro(base, 50_000)
    expect(longBreak.state.phase).toBe('longBreak')

    const manual = finishPomodoro({ ...base, autoContinue: false }, 50_000)
    expect(manual.state.status).toBe('done')
    expect(manual.state.phase).toBe('work')
    expect(manual.notice.message).toBe('The timer is waiting for you.')
  })
})
