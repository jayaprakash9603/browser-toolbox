import { describe, expect, it, vi } from 'vitest'

import { REACT_DEVTOOLS_OWNED_SCRIPT_IDS, REACT_DEVTOOLS_SCRIPT_IDS } from '@/core/reactDevtools/constants'
import { DEFAULT_REACT_DEVTOOLS_STATE } from '@/core/reactDevtools/state'
import { buildReactDevtoolsContentScripts } from '@/chrome/background/reactDevtools/contentScripts'
import { reconcileContentScripts } from '@/chrome/background/scriptRegistry'

vi.mock('@/chrome/background/scriptRegistry', () => ({
  reconcileContentScripts: vi.fn(),
}))

describe('buildReactDevtoolsContentScripts', () => {
  it('returns six scripts with expected worlds when enabled', () => {
    const scripts = buildReactDevtoolsContentScripts(DEFAULT_REACT_DEVTOOLS_STATE)
    expect(scripts).toHaveLength(6)
    const proxy = scripts.find((s) => s.id === REACT_DEVTOOLS_SCRIPT_IDS.proxy)
    expect(proxy?.world).toBe('ISOLATED')
    expect(proxy?.runAt).toBe('document_start')
    const hook = scripts.find((s) => s.id === REACT_DEVTOOLS_SCRIPT_IDS.installHook)
    expect(hook?.world).toBe('MAIN')
  })

  it('returns empty when disabled', () => {
    expect(
      buildReactDevtoolsContentScripts({ ...DEFAULT_REACT_DEVTOOLS_STATE, enabled: false }),
    ).toEqual([])
  })

  it('sync only touches owned script ids', async () => {
    const { syncReactDevtoolsContentScripts } = await import(
      '@/chrome/background/reactDevtools/contentScripts'
    )
    await syncReactDevtoolsContentScripts(DEFAULT_REACT_DEVTOOLS_STATE)
    expect(reconcileContentScripts).toHaveBeenCalledWith(
      [...REACT_DEVTOOLS_OWNED_SCRIPT_IDS],
      expect.any(Array),
    )
  })
})
