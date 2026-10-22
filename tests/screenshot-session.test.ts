import { describe, expect, it } from 'vitest'

import { createSession, getSession, _clearSessions } from '@/chrome/background/screenshot/session'

describe('screenshot session store', () => {
  it('expires after TTL', () => {
    _clearSessions()
    createSession({
      id: 'old',
      createdAt: Date.now() - 11 * 60 * 1000,
      mode: 'visible',
      frames: [],
    })
    expect(getSession('old')).toBeUndefined()
  })

  it('returns fresh session', () => {
    _clearSessions()
    createSession({
      id: 'fresh',
      createdAt: Date.now(),
      mode: 'visible',
      frames: [],
    })
    expect(getSession('fresh')?.id).toBe('fresh')
  })
})
