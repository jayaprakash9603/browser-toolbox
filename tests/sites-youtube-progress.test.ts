import { describe, expect, it } from 'vitest'

import {
  defaultYoutubeValues,
  isAllowedScrubberImageUrl,
  isProgressCustomizationActive,
  themeCssVars,
} from '@/core/sites/youtube'

describe('youtube progress bar', () => {
  it('detects when progress styling should apply', () => {
    const base = defaultYoutubeValues()
    expect(isProgressCustomizationActive(base)).toBe(false)
    expect(isProgressCustomizationActive({ ...base, progressTheme: 'neon' })).toBe(true)
    expect(isProgressCustomizationActive({ ...base, progressScrubberEmoji: '🔥' })).toBe(true)
  })

  it('builds css variables for themes', () => {
    const vars = themeCssVars('ocean')
    expect(vars['--tbx-yt-progress-bar']).toContain('#0ea5e9')
    expect(vars['--tbx-yt-progress-height']).toBe('3px')
  })

  it('allows safe scrubber image urls', () => {
    expect(isAllowedScrubberImageUrl('https://example.com/icon.png')).toBe(true)
    expect(isAllowedScrubberImageUrl('data:image/png;base64,abc')).toBe(true)
    expect(isAllowedScrubberImageUrl('javascript:alert(1)')).toBe(false)
  })
})
