import { describe, expect, it } from 'vitest'

import { isVideoFileUrl, pickVideoUrl } from '@/core/sites/instagram/mediaUrl'
import { playbackRate } from '@/core/sites/instagram/helpers'

describe('pickVideoUrl', () => {
  it('keeps a direct mp4 and drops images and blob players', () => {
    expect(isVideoFileUrl('blob:https://www.instagram.com/abc')).toBe(false)
    expect(isVideoFileUrl('https://cdninstagram.com/poster.jpg')).toBe(false)
    expect(isVideoFileUrl('https://scontent.cdninstagram.com/o1/v/t16/clip.mp4?oe=1')).toBe(true)
    expect(isVideoFileUrl('https://scontent.cdninstagram.com/o1/v/t16/f2/m69/AQN?stp=dst-mp4&oe=1')).toBe(true)
    expect(isVideoFileUrl('https://scontent.cdninstagram.com/v/t51.2885-15/photo.jpg')).toBe(false)
  })

  it('uses the video’s own file before a newer file from another post', () => {
    expect(
      pickVideoUrl(
        ['https://cdninstagram.com/this-reel.mp4'],
        ['https://cdninstagram.com/other-reel.mp4?oh=1920'],
      ),
    ).toBe('https://cdninstagram.com/this-reel.mp4')
  })

  it('prefers the higher-resolution version of the same video', () => {
    expect(
      pickVideoUrl([
        'https://cdninstagram.com/clip.mp4?oh=640',
        'https://cdninstagram.com/browser_native_hd_url/clip.mp4?oh=1080',
      ]),
    ).toBe('https://cdninstagram.com/browser_native_hd_url/clip.mp4?oh=1080')
  })

  it('falls back to a recent response when the video element only has a blob', () => {
    expect(pickVideoUrl(['blob:https://www.instagram.com/1'], ['https://cdninstagram.com/reel.mp4'])).toBe(
      'https://cdninstagram.com/reel.mp4',
    )
  })
})

describe('playbackRate', () => {
  it('reads the selected speed, including a return to 1×', () => {
    expect(playbackRate({ playbackSpeed: '1.5' })).toBe(1.5)
    expect(playbackRate({ playbackSpeed: '1' })).toBe(1)
    expect(playbackRate({ playbackSpeed: 2 })).toBe(2)
  })
})
