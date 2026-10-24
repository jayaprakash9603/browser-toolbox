import { afterEach, describe, expect, it } from 'vitest'

import {
  activeFeatures,
  applyInstagramEnhancer,
  formatVideoTime,
  stopAll,
  touchesPage,
} from '@/chrome/content/sites/instagram/manager'
import type { InstagramEnhancerState } from '@/core/sites/instagram/types'

function state(values: InstagramEnhancerState['values'], enabled = true): InstagramEnhancerState {
  return { enabled, values } as InstagramEnhancerState
}

const allOff = { videoControls: false, pictureInPicture: false, mediaDownload: false, playbackSpeed: '1', ghostStories: false }

function addReel(): HTMLVideoElement {
  const wrapper = document.createElement('div')
  wrapper.style.cssText = 'display:flex;justify-content:center'
  const video = document.createElement('video')
  wrapper.append(video)
  document.body.append(wrapper)
  return video
}

afterEach(() => {
  stopAll()
  document.body.innerHTML = ''
})

describe('Instagram overlay', () => {
  it('leaves the page untouched when every feature is off', () => {
    const video = addReel()
    const before = document.documentElement.outerHTML
    applyInstagramEnhancer(state(allOff))
    expect(document.getElementById('tbx-ig-overlay')).toBeNull()
    expect(document.getElementById('toolbox-ig-css')).toBeNull()
    expect(video.playbackRate).toBe(1)
    expect(video.controls).toBe(false)
    expect(document.documentElement.outerHTML).toBe(before)
  })

  it('leaves the page untouched when the master switch is off, even with features selected', () => {
    const features = activeFeatures(state({ ...allOff, mediaDownload: true, playbackSpeed: '2' }, false))
    expect(touchesPage(features)).toBe(false)
  })

  it('changes speed only while a non-1× speed is selected, then restores it', () => {
    const video = addReel()
    applyInstagramEnhancer(state({ ...allOff, playbackSpeed: '1.5' }))
    expect(video.playbackRate).toBe(1.5)
    applyInstagramEnhancer(state(allOff))
    expect(video.playbackRate).toBe(1)
    expect(video.dataset.tbxIgRateSet).toBeUndefined()
  })

  it('never turns on the native controls or restyles the reel container', () => {
    const video = addReel()
    applyInstagramEnhancer(state({ ...allOff, videoControls: true, mediaDownload: true, pictureInPicture: true }))
    expect(video.controls).toBe(false)
    expect(video.parentElement?.style.justifyContent).toBe('center')
    expect(video.parentElement?.style.transform).toBe('')
  })

  it('formats seek times like Instagram', () => {
    expect(formatVideoTime(0)).toBe('0:00')
    expect(formatVideoTime(65.4)).toBe('1:05')
    expect(formatVideoTime(Number.NaN)).toBe('0:00')
  })
})
