import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { PAGE_CMD_KEY, countActiveFeatures, defaultYoutubeValues } from '@/core/sites/youtube'

function send(cmd: string, payload: unknown): void {
  window.dispatchEvent(new MessageEvent('message', { data: { [PAGE_CMD_KEY]: cmd, payload }, source: window }))
}

describe('YouTube reset', () => {
  it('counts nothing as active after resetting to defaults', () => {
    expect(countActiveFeatures({ enabled: true, values: defaultYoutubeValues() })).toBe(0)
  })

  it('counts changed sponsor categories', () => {
    const values = { ...defaultYoutubeValues(), sponsorCategories: ['sponsor'] }
    expect(countActiveFeatures({ enabled: true, values })).toBe(1)
  })
})

describe('YouTube page player', () => {
  let player: HTMLElement & { setPlaybackRate: ReturnType<typeof vi.fn> }
  let video: HTMLVideoElement
  let flexy: HTMLElement
  let sizeButton: HTMLButtonElement

  beforeAll(async () => {
    await import('@/chrome/content/sites/youtube/main')
  })

  beforeEach(() => {
    sessionStorage.clear()
    document.body.innerHTML = ''
    flexy = document.createElement('ytd-watch-flexy')
    player = Object.assign(document.createElement('div'), { id: 'movie_player' }) as unknown as typeof player
    player.setPlaybackRate = vi.fn((rate: number) => {
      video.playbackRate = rate
    })
    video = document.createElement('video')
    video.className = 'html5-main-video'
    sizeButton = document.createElement('button')
    sizeButton.className = 'ytp-size-button'
    sizeButton.addEventListener('click', () => flexy.toggleAttribute('theater'))
    player.append(video, sizeButton)
    flexy.append(player)
    document.body.append(flexy)
  })

  it('returns to 1x when speed is reset to default', () => {
    send('applyPlayer', { defaultSpeed: '2' })
    expect(video.playbackRate).toBe(2)
    send('applyPlayer', { defaultSpeed: '1' })
    expect(video.playbackRate).toBe(1)
  })

  it('restores speeds above 2x set directly on the video', () => {
    send('applyPlayer', { defaultSpeed: '3' })
    expect(video.playbackRate).toBe(3)
    send('applyPlayer', null)
    expect(video.playbackRate).toBe(1)
  })

  it('leaves a speed the user picked alone when the feature never set one', () => {
    video.playbackRate = 1.5
    send('applyPlayer', { defaultSpeed: '1' })
    expect(video.playbackRate).toBe(1.5)
    expect(player.setPlaybackRate).not.toHaveBeenCalled()
  })

  it('enters theater once and leaves it when turned off', () => {
    send('applyPlayer', { alwaysTheater: true })
    send('applyPlayer', { alwaysTheater: true })
    expect(flexy.hasAttribute('theater')).toBe(true)
    send('applyPlayer', { alwaysTheater: false })
    expect(flexy.hasAttribute('theater')).toBe(false)
  })
})
