import { describe, expect, it } from 'vitest'

import {
  matchesKeyword,
  parseKeywordList,
  pickSegmentsToSkip,
  shortsToWatchUrl,
  sponsorBlockPrefix,
  isStillWatchingDialog,
  featureAttrName,
} from '@/core/sites/youtube'

describe('youtube helpers', () => {
  it('rewrites Shorts URLs to watch', () => {
    expect(shortsToWatchUrl('https://www.youtube.com/shorts/abcdefghijk')).toBe(
      'https://www.youtube.com/watch?v=abcdefghijk',
    )
    expect(shortsToWatchUrl('https://www.youtube.com/watch?v=x')).toBeNull()
  })

  it('matches keywords case-insensitively', () => {
    expect(matchesKeyword('CLICKBAIT title', ['spam', 'clickbait'])).toBe(true)
    expect(matchesKeyword('Normal video', ['spam'])).toBe(false)
  })

  it('parses keyword lists', () => {
    expect(parseKeywordList('a, b\nC')).toEqual(['a', 'b', 'c'])
  })

  it('filters sponsor segments by category', () => {
    const segments = [
      { segment: [0, 10] as [number, number], category: 'sponsor' },
      { segment: [20, 30] as [number, number], category: 'intro' },
    ]
    expect(pickSegmentsToSkip(segments, ['sponsor']).length).toBe(1)
  })

  it('computes sponsor block hash prefix', async () => {
    const prefix = await sponsorBlockPrefix('dQw4w9WgXcQ')
    expect(prefix).toHaveLength(4)
  })

  it('detects still-watching dialogs', () => {
    expect(isStillWatchingDialog('Video paused. Continue watching?')).toBe(true)
    expect(isStillWatchingDialog('Subscribe')).toBe(false)
  })

  it('builds data attribute names', () => {
    expect(featureAttrName('hideShorts')).toBe('data-tbx-yt-hide-shorts')
  })
})
