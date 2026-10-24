import { describe, expect, it, vi, beforeEach } from 'vitest'

import { REACT_DEVTOOLS_SESSION_DETECTION_KEY } from '@/core/reactDevtools/constants'
import { handleReactDevtoolsRuntimeMessage } from '@/chrome/background/reactDevtools/messages'

describe('handleReactDevtoolsRuntimeMessage', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      storage: {
        session: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined),
        },
      },
      scripting: { executeScript: vi.fn().mockResolvedValue([]) },
      tabs: { sendMessage: vi.fn() },
      runtime: { sendMessage: vi.fn() },
    })
  })

  it('records react renderer attachment in session storage', async () => {
    handleReactDevtoolsRuntimeMessage(
      {
        source: 'react-devtools-hook',
        payload: { type: 'react-renderer-attached', reactBuildType: 'development' },
      },
      { tab: { id: 7 } } as chrome.runtime.MessageSender,
    )
    await new Promise((r) => setTimeout(r, 0))
    expect(chrome.storage.session.set).toHaveBeenCalledWith({
      [REACT_DEVTOOLS_SESSION_DETECTION_KEY]: { '7': 'development' },
    })
  })

  it('returns false for unknown sources', () => {
    expect(handleReactDevtoolsRuntimeMessage({ source: 'other' }, {})).toBe(false)
  })
})
