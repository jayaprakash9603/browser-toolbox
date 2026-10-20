import { beforeEach, describe, expect, it } from 'vitest'

import { defaultYoutubeValues, getYoutubeEnhancerState, updateYoutubeEnhancerState } from '@/core/sites/youtube'
import { resetChromeMockStorage } from './setup'

describe('youtube enhancer service', () => {
  beforeEach(() => resetChromeMockStorage())

  it('defaults to enabled with catalog defaults', async () => {
    const state = await getYoutubeEnhancerState()
    expect(state.enabled).toBe(true)
    expect(state.values.hideSponsored).toBe(false)
    expect(state.values.sponsorBlock).toBe(false)
  })

  it('merges partial updates', async () => {
    const next = await updateYoutubeEnhancerState({ values: { hideShorts: true } })
    expect(next.values.hideShorts).toBe(true)
    expect(next.values.hideRelated).toBe(defaultYoutubeValues().hideRelated)
  })
})
