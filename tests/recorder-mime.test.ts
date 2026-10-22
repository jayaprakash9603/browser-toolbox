import { describe, expect, it } from 'vitest'

import { baseMime, extensionForMime, pickMimeType } from '@/core/recorder/mime'

describe('recorder mime selection', () => {
  it('prefers mp4 when supported', () => {
    const type = pickMimeType((t) => t.startsWith('video/mp4'))
    expect(extensionForMime(type)).toBe('mp4')
  })

  it('falls back to webm vp9', () => {
    expect(pickMimeType((t) => t.startsWith('video/webm'))).toBe('video/webm;codecs=vp9,opus')
  })

  it('returns plain webm when nothing reports support', () => {
    expect(pickMimeType(() => false)).toBe('video/webm')
  })

  it('strips codec parameters', () => {
    expect(baseMime('video/webm;codecs=vp9,opus')).toBe('video/webm')
  })
})
