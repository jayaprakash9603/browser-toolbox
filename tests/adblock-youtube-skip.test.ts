import { describe, expect, it } from 'vitest'

import { vi } from 'vitest'

import {
  isSkipElementClickable,
  skipAdPlayback,
  type YoutubePlayerApi,
} from '@/chrome/content/adblock/youtube/skipAd'

function fakePlayer(opts: {
  ad: boolean
  debug?: string
  progress?: { current: number; duration: number }
  songLength?: number
  video?: { duration: number; currentTime: number }
}): { player: YoutubePlayerApi; seekTo: ReturnType<typeof vi.fn>; video: HTMLVideoElement } {
  const player = document.createElement('div') as unknown as YoutubePlayerApi
  if (opts.ad) player.classList.add('ad-showing')
  const video = document.createElement('video')
  video.className = 'html5-main-video'
  Object.defineProperty(video, 'duration', { configurable: true, value: opts.video?.duration ?? NaN })
  video.currentTime = opts.video?.currentTime ?? 0
  player.appendChild(video)
  const seekTo = vi.fn()
  player.getStatsForNerds = () => ({ debug_info: opts.debug ?? '' })
  player.getProgressState = () => opts.progress
  player.getPlayerResponse = () => ({ videoDetails: { lengthSeconds: String(opts.songLength ?? 0) } })
  player.seekTo = seekTo
  return { player, seekTo, video }
}

describe('skipAdPlayback', () => {
  it('skips a server-stitched ad through the player API', () => {
    const { player, seekTo } = fakePlayer({ ad: true, debug: 'SSAP, AD ...', progress: { current: 2, duration: 15 } })
    expect(skipAdPlayback(player)).toBe('ssap')
    expect(seekTo).toHaveBeenCalledWith(15, true)
  })

  it('seeks a separate ad video whose length differs from the song', () => {
    const { player, video } = fakePlayer({ ad: true, songLength: 248, video: { duration: 15, currentTime: 1 } })
    expect(skipAdPlayback(player)).toBe('client')
    expect(video.currentTime).toBeCloseTo(14.9)
  })

  it('never seeks when the <video> is the song itself', () => {
    const { player, video, seekTo } = fakePlayer({ ad: true, songLength: 248, video: { duration: 248, currentTime: 30 } })
    expect(skipAdPlayback(player)).toBeNull()
    expect(video.currentTime).toBe(30)
    expect(seekTo).not.toHaveBeenCalled()
  })

  it('does nothing without an ad', () => {
    const { player, seekTo } = fakePlayer({ ad: false, debug: 'SSAP, AD', progress: { current: 0, duration: 15 } })
    expect(skipAdPlayback(player)).toBeNull()
    expect(seekTo).not.toHaveBeenCalled()
  })
})

describe('YouTube auto skip', () => {
  it('rejects disabled skip controls', () => {
    const el = document.createElement('button')
    el.className = 'ytp-ad-skip-button ytp-ad-skip-button-disabled'
    document.body.appendChild(el)
    expect(isSkipElementClickable(el)).toBe(false)
    el.remove()
  })

  it('accepts visible skip buttons', () => {
    const el = document.createElement('button')
    el.className = 'ytp-skip-ad-button'
    el.textContent = 'Skip ad'
    el.getBoundingClientRect = () =>
      ({ width: 80, height: 32, top: 0, left: 0, right: 80, bottom: 32, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    document.body.appendChild(el)
    expect(isSkipElementClickable(el)).toBe(true)
    el.remove()
  })
})
