import { describe, expect, it, vi } from 'vitest'

import { registerGmBridgeListener } from '@/chrome/background/script-studio/bridge'
import { getTabScriptRuns } from '@/core/script-studio/runs'

vi.mock('@/chrome/background/script-studio/badge', () => ({
  noteScriptRan: vi.fn(),
  clearTabBadge: vi.fn(),
}))

describe('script-studio run reports', () => {
  it('records reports that arrive on runtime.onUserScriptMessage', async () => {
    let listener: ((msg: unknown, sender: unknown, respond: (r: unknown) => void) => unknown) | undefined
    const runtime = chrome.runtime as unknown as Record<string, unknown>
    runtime.onUserScriptMessage = { addListener: (fn: typeof listener) => (listener = fn) }

    registerGmBridgeListener()
    expect(listener).toBeDefined()

    const response = await new Promise((resolve) => {
      const keepOpen = listener!(
        { type: 'SS_GM_BRIDGE', sub: 'report', scriptId: 'abc', payload: { status: 'ok', durationMs: 2, url: 'https://a.test/', top: true } },
        { tab: { id: 7 } },
        resolve,
      )
      expect(keepOpen).toBe(true)
    })

    expect(response).toEqual({ ok: true })
    const runs = await getTabScriptRuns(7)
    expect(runs.abc).toMatchObject({ status: 'ok', runs: 1, url: 'https://a.test/' })
    delete runtime.onUserScriptMessage
  })
})
