import { describe, expect, it, vi } from 'vitest'

import {
  boostedDelay,
  installAbnormalityFilter,
  installPenaltyTimerBooster,
  isAbnormalityHandler,
  PENALTY_DELAY_MS,
} from '@/chrome/content/adblock/youtube/antiDetect'

describe('YouTube anti-detection hooks', () => {
  it('shortens only the 17 s penalty timer of native/bound callbacks', () => {
    const bound = function () {}.bind(null)
    expect(boostedDelay(bound, PENALTY_DELAY_MS)).toBe(17)
    expect(boostedDelay(() => 1, PENALTY_DELAY_MS)).toBe(PENALTY_DELAY_MS)
    expect(boostedDelay(bound, 5000)).toBe(5000)
    expect(boostedDelay('code', PENALTY_DELAY_MS)).toBe(PENALTY_DELAY_MS)
  })

  it('passes the boosted delay through the patched setTimeout', () => {
    const native = vi.fn((_handler: unknown, _delay?: unknown) => 1)
    const win = { setTimeout: native } as unknown as Window & typeof globalThis
    installPenaltyTimerBooster(win)
    const bound = function () {}.bind(null)
    win.setTimeout(bound, PENALTY_DELAY_MS)
    win.setTimeout(bound, 200)
    expect(native.mock.calls[0][1]).toBe(17)
    expect(native.mock.calls[1][1]).toBe(200)
  })

  it('drops onAbnormalityDetected continuations but keeps normal ones', async () => {
    class FakePromise<T> extends Promise<T> {}
    const win = { Promise: FakePromise } as unknown as Window & typeof globalThis
    installAbnormalityFilter(win)

    let abnormalCalled = false
    const abnormal = function () {
      abnormalCalled = true
      return 'onAbnormalityDetected'
    }
    const normal = vi.fn()
    await FakePromise.resolve(1).then(abnormal)
    await FakePromise.resolve(2).then(normal)

    expect(abnormalCalled).toBe(false)
    expect(normal).toHaveBeenCalledWith(2)
    expect(isAbnormalityHandler(normal)).toBe(false)
  })
})
