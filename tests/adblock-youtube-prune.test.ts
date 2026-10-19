import { describe, expect, it } from 'vitest'

import {
  hasYoutubeAdPayload,
  pruneYoutubeAdsInPlace,
  pruneYoutubePlayerJson,
  pruneYoutubeResponseText,
} from '@/chrome/content/adblock/scriptlets/jsonPrune'

describe('YouTube json prune', () => {
  it('removes ad-related keys from player response', () => {
    const input = {
      videoDetails: { videoId: 'abc' },
      adPlacements: [{ foo: 1 }],
      adSlots: [1, 2],
      playerAds: { test: true },
      playerConfig: { adSlots: [], latency: 1 },
    }
    const out = pruneYoutubePlayerJson(input)
    expect(out).toBe(input)
    expect(out).not.toHaveProperty('adPlacements')
    expect(out).not.toHaveProperty('adSlots')
    expect(out).not.toHaveProperty('playerAds')
    expect(out.playerConfig).toEqual({ latency: 1 })
    expect(out.videoDetails).toEqual({ videoId: 'abc' })
  })

  it('prunes nested playerResponse and the enforcement dialog', () => {
    const data = [
      {
        playerResponse: {
          adPlacements: [],
          auxiliaryUi: { messageRenderers: { enforcementMessageViewModel: {} } },
        },
      },
    ]
    expect(hasYoutubeAdPayload(data)).toBe(true)
    expect(pruneYoutubeAdsInPlace(data)).toBe(2)
    expect(data[0].playerResponse).toEqual({ auxiliaryUi: { messageRenderers: {} } })
  })

  it('leaves non-ad responses untouched', () => {
    const text = '{"videoDetails":{"videoId":"x"}}'
    expect(pruneYoutubeResponseText(text)).toEqual({ text, removed: 0 })
    expect(hasYoutubeAdPayload({ videoDetails: {} })).toBe(false)
  })

  it('rewrites response text that carries ads', () => {
    const result = pruneYoutubeResponseText('{"playerAds":[1],"streamingData":{"a":1}}')
    expect(result.removed).toBe(1)
    expect(JSON.parse(result.text)).toEqual({ streamingData: { a: 1 } })
  })
})
