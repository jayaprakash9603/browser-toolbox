import { describe, expect, it } from 'vitest'

import {
  hasYoutubeAdPayload,
  pruneYoutubeAdsInPlace,
  pruneYoutubePlayerJson,
  pruneYoutubeResponseText,
} from '@/chrome/content/adblock/scriptlets/jsonPrune'

describe('YouTube json prune', () => {
  it('removes the ad schedule but keeps the fields YouTube checks for', () => {
    const input = {
      videoDetails: { videoId: 'abc' },
      adPlacements: [{ foo: 1 }],
      adSlots: [1, 2],
      playerAds: { test: true },
      adBreakHeartbeatParams: 'x',
      playerConfig: { adSlots: [], latency: 1 },
    }
    const out = pruneYoutubePlayerJson(input)
    expect(out).toBe(input)
    expect(out).not.toHaveProperty('adPlacements')
    expect(out).not.toHaveProperty('adSlots')
    expect(out.playerAds).toEqual({ test: true })
    expect(out.adBreakHeartbeatParams).toBe('x')
    expect(out.playerConfig).toEqual({ adSlots: [], latency: 1 })
    expect(out.videoDetails).toEqual({ videoId: 'abc' })
  })

  it('prunes nested playerResponse and the enforcement dialog', () => {
    const data = [
      {
        playerResponse: {
          adPlacements: [{ foo: 1 }],
          auxiliaryUi: { messageRenderers: { enforcementMessageViewModel: {} } },
        },
      },
    ]
    expect(hasYoutubeAdPayload(data)).toBe(true)
    expect(pruneYoutubeAdsInPlace(data)).toBe(2)
    expect(data[0].playerResponse).toEqual({ auxiliaryUi: { messageRenderers: {} } })
  })

  it('ignores empty ad slot markers on browse-style payloads', () => {
    expect(hasYoutubeAdPayload({ adSlots: [], contents: { x: 1 } })).toBe(false)
    const browse = { adSlots: [], response: { commentSection: { id: 'c' } } }
    expect(hasYoutubeAdPayload(browse)).toBe(false)
    expect(pruneYoutubeAdsInPlace(browse)).toBe(0)
    expect(browse).toEqual({ adSlots: [], response: { commentSection: { id: 'c' } } })
  })

  it('leaves non-ad responses untouched', () => {
    const text = '{"videoDetails":{"videoId":"x"}}'
    expect(pruneYoutubeResponseText(text)).toEqual({ text, removed: 0 })
    expect(hasYoutubeAdPayload({ videoDetails: {} })).toBe(false)
  })

  it('leaves playerAds-only responses alone', () => {
    const text = '{"playerAds":[1],"streamingData":{"a":1}}'
    expect(pruneYoutubeResponseText(text)).toEqual({ text, removed: 0 })
    expect(hasYoutubeAdPayload({ playerAds: [1] })).toBe(false)
  })

  it('rewrites response text that carries an ad schedule', () => {
    const result = pruneYoutubeResponseText('{"adPlacements":[1],"playerAds":[2],"streamingData":{"a":1}}')
    expect(result.removed).toBe(1)
    expect(JSON.parse(result.text)).toEqual({ playerAds: [2], streamingData: { a: 1 } })
  })
})
