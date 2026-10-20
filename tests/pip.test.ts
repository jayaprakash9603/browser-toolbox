import { describe, expect, it } from 'vitest'

import { DEFAULT_PIP_STATE, getPipState, updatePipState } from '@/core/pip/service'
import { pickBestVideoCandidate } from '@/core/pip/pickVideo'

describe('pickBestVideoCandidate', () => {
  it('ignores readyState 0', () => {
    expect(
      pickBestVideoCandidate([
        { frameId: 0, readyState: 0, playing: true, area: 9999 },
        { frameId: 1, readyState: 2, playing: false, area: 100 },
      ]),
    ).toMatchObject({ frameId: 1 })
  })

  it('prefers playing over larger paused', () => {
    expect(
      pickBestVideoCandidate([
        { frameId: 0, readyState: 4, playing: false, area: 5000 },
        { frameId: 1, readyState: 4, playing: true, area: 100 },
      ]),
    ).toMatchObject({ frameId: 1 })
  })

  it('prefers largest among playing videos', () => {
    expect(
      pickBestVideoCandidate([
        { frameId: 0, readyState: 4, playing: true, area: 200 },
        { frameId: 1, readyState: 4, playing: true, area: 800 },
      ]),
    ).toMatchObject({ frameId: 1 })
  })

  it('returns null when no eligible candidates', () => {
    expect(pickBestVideoCandidate([])).toBeNull()
    expect(pickBestVideoCandidate([{ frameId: 0, readyState: 0, playing: true, area: 100 }])).toBeNull()
  })
})

describe('pip service', () => {
  it('returns defaults when storage is empty', async () => {
    const state = await getPipState()
    expect(state).toEqual(DEFAULT_PIP_STATE)
  })

  it('merges partial updates', async () => {
    const next = await updatePipState({ autoPip: true, enabled: false })
    expect(next.autoPip).toBe(true)
    expect(next.enabled).toBe(false)
    expect(next.showContextMenu).toBe(DEFAULT_PIP_STATE.showContextMenu)
  })
})
