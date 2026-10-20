import { describe, expect, it } from 'vitest'

import {
  defaultYoutubeValues,
  bundleToValuePatch,
  getPresetBundle,
  isAllowedScrubberImageUrl,
  isGalleryItemSelected,
  isProgressCustomizationActive,
  searchPresets,
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

  it('applies preset bundles with theme and scrubber image', () => {
    const bundle = getPresetBundle('preset-nyan')
    expect(bundle).toBeTruthy()
    const values = { ...defaultYoutubeValues(), ...bundleToValuePatch(bundle!) }
    expect(values.progressTheme).toBe('rainbow')
    expect(String(values.progressScrubberImage)).toMatch(/^data:image\/svg\+xml/)
    expect(isGalleryItemSelected({ kind: 'bundle', bundle: bundle! }, values)).toBe(true)
  })

  it('filters presets by collection and search', () => {
    const memes = searchPresets('', 'memes')
    expect(memes.length).toBeGreaterThan(5)
    const doge = searchPresets('doge', 'all')
    expect(doge.some((i) => i.kind === 'bundle' && i.bundle.id === 'preset-doge')).toBe(true)
  })
})
