import { describe, expect, it } from 'vitest'

import { buildYoutubeContentScripts } from '@/chrome/background/sites/contentScripts'
import { DEFAULT_YOUTUBE_ENHANCER_STATE } from '@/core/sites/youtube'

describe('youtube content script registration', () => {
  it('registers nothing when disabled', () => {
    expect(buildYoutubeContentScripts({ ...DEFAULT_YOUTUBE_ENHANCER_STATE, enabled: false })).toEqual([])
  })

  it('registers isolated and main scripts on YouTube', () => {
    const scripts = buildYoutubeContentScripts(DEFAULT_YOUTUBE_ENHANCER_STATE)
    expect(scripts.map((s) => s.id)).toEqual(['sites-yt-isolated', 'sites-yt-main'])
    expect(scripts[1].world).toBe('MAIN')
    expect(scripts[0].matches?.[0]).toContain('youtube.com')
  })
})
