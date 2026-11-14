import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  mountRecorderCountdownOverlay,
  unmountRecorderCountdownOverlay,
} from '@/chrome/background/recorder/countdownOverlay'
import { stampCountdownArgs } from '@/chrome/background/recorder/injectPage'
import {
  RECORDER_COUNTDOWN_SETTLE_MS,
  recorderPreRollDelayMs,
} from '@/core/recorder/countdown'

const COUNTDOWN_JS = resolve(process.cwd(), 'public/inject/recorder-countdown.js')
const UNMOUNT_JS = resolve(process.cwd(), 'public/inject/recorder-unmount.js')
const COUNTDOWN_UNMOUNT_JS = resolve(process.cwd(), 'public/inject/recorder-countdown-unmount.js')
const countdownSource = readFileSync(COUNTDOWN_JS, 'utf8')
const unmountSource = readFileSync(UNMOUNT_JS, 'utf8')
const countdownUnmountSource = readFileSync(COUNTDOWN_UNMOUNT_JS, 'utf8')

/** Rebuilds a function from its source, as chrome.scripting.executeScript does. */
function serialized<T extends (...args: never[]) => unknown>(fn: T): T {
  return new Function(`return (${fn.toString()})`)() as T
}

describe('recorder countdown overlay', () => {
  afterEach(() => {
    document.getElementById('toolbox-recorder-countdown')?.remove()
    vi.useRealTimers()
  })

  it('ships a plain inject file with the overlay id inlined', () => {
    expect(countdownSource).toContain('toolbox-recorder-countdown')
    expect(countdownSource).not.toMatch(/await chrome\.storage/)
    expect(unmountSource).toContain('toolbox-recorder-countdown')
    expect(unmountSource).toContain('toolbox-recorder-pill')
    expect(countdownUnmountSource).toContain('toolbox-recorder-countdown')
    expect(countdownUnmountSource).not.toContain('toolbox-recorder-pill')
    expect(countdownSource).not.toContain("captionEl.textContent = 'Recording'")
  })

  it('mounts a visible 3-2-1 overlay on the extension page fallback', () => {
    const result = serialized(mountRecorderCountdownOverlay)(3, 'Recording starts…')
    expect(result).toEqual({ mounted: true })
    const host = document.getElementById('toolbox-recorder-countdown')
    expect(host).toBeTruthy()
    expect(host?.textContent).toContain('3')
    expect(host?.textContent).toContain('Recording starts…')
    expect(host?.style.zIndex).toBe('2147483647')
    expect(host?.style.pointerEvents).toBe('none')
  })

  it('does not close over module bindings in the extension-page fallback', () => {
    expect(() => serialized(mountRecorderCountdownOverlay)(2, 'Go')).not.toThrow()
    expect(() => serialized(unmountRecorderCountdownOverlay)()).not.toThrow()
  })

  it('unmount removes the host', () => {
    serialized(mountRecorderCountdownOverlay)(3, 'Recording starts…')
    serialized(unmountRecorderCountdownOverlay)()
    expect(document.getElementById('toolbox-recorder-countdown')).toBeNull()
  })

  it('ticks from 3 to 2 after one second', () => {
    vi.useFakeTimers()
    serialized(mountRecorderCountdownOverlay)(3, 'Recording starts…')
    const host = document.getElementById('toolbox-recorder-countdown')
    expect(host?.textContent).toContain('3')
    vi.advanceTimersByTime(1000)
    expect(host?.textContent).toContain('2')
    expect(host?.textContent).not.toMatch(/\b3\b/)
  })

  it('stamps remaining seconds without closing over module bindings', () => {
    const src = stampCountdownArgs.toString()
    expect(src).not.toMatch(/COUNTDOWN_|from '|require\(/)
    serialized(stampCountdownArgs)(2, 'Go')
    expect((globalThis as { __tbxCountdownSeconds?: number }).__tbxCountdownSeconds).toBe(2)
  })

  it('paints remaining seconds from the isolated-world stamp after refresh', () => {
    ;(globalThis as { __tbxCountdownSeconds?: number }).__tbxCountdownSeconds = 2
    ;(globalThis as { __tbxCountdownCaption?: string }).__tbxCountdownCaption = 'Recording starts…'
    eval(countdownSource)
    const host = document.getElementById('toolbox-recorder-countdown')
    expect(host?.textContent).toContain('2')
    expect(host?.textContent).not.toMatch(/\b3\b/)
  })

  it('removes the overlay when the countdown ends so it is not in the recording', () => {
    vi.useFakeTimers()
    serialized(mountRecorderCountdownOverlay)(3, 'Recording starts…')
    vi.advanceTimersByTime(2999)
    expect(document.getElementById('toolbox-recorder-countdown')).toBeTruthy()
    vi.advanceTimersByTime(1)
    expect(document.getElementById('toolbox-recorder-countdown')).toBeNull()
  })

  it('inject file also tears down at zero without a Recording hold', () => {
    vi.useFakeTimers()
    eval(countdownSource)
    expect(document.getElementById('toolbox-recorder-countdown')).toBeTruthy()
    vi.advanceTimersByTime(3000)
    expect(document.getElementById('toolbox-recorder-countdown')).toBeNull()
  })

  it('starts capture after the overlay is gone plus a settle window', () => {
    expect(recorderPreRollDelayMs(undefined, 1_000)).toBe(0)
    expect(recorderPreRollDelayMs(4_000, 1_000)).toBe(3_000 + RECORDER_COUNTDOWN_SETTLE_MS)
    expect(recorderPreRollDelayMs(500, 1_000)).toBe(RECORDER_COUNTDOWN_SETTLE_MS)
  })
})
