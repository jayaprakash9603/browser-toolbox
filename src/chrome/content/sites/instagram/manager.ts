import {
  isFeatureOn,
  playbackRate,
  type InstagramEnhancerState,
} from '@/core/sites/instagram'
import { SITE_FILES } from '@/core/sites/instagram/constants'

const STYLE_LINK_ID = 'toolbox-ig-css'
const ACTIVE_ATTR = 'data-tbx-ig-active'
const observerKey = '__toolboxIgObserver'

type Guarded = Window & { [observerKey]?: MutationObserver }

function ensureCssLink(): void {
  if (document.getElementById(STYLE_LINK_ID)) return
  const link = document.createElement('link')
  link.id = STYLE_LINK_ID
  link.rel = 'stylesheet'
  link.href = chrome.runtime.getURL(SITE_FILES.instagramCss)
  document.head.appendChild(link)
}

function findMediaUrl(video: HTMLVideoElement): string | null {
  return video.currentSrc || video.src || null
}

function attachDownloadButton(video: HTMLVideoElement): void {
  if (video.dataset.tbxIgDl === '1') return
  video.dataset.tbxIgDl = '1'
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.className = 'tbx-ig-download'
  btn.textContent = '↓'
  btn.title = 'Download media'
  btn.addEventListener('click', (e) => {
    e.stopPropagation()
    const url = findMediaUrl(video)
    if (!url) return
    const a = document.createElement('a')
    a.href = url
    a.download = `instagram-${Date.now()}.mp4`
    a.rel = 'noopener'
    a.click()
  })
  const parent = video.parentElement
  if (parent) {
    parent.style.position = parent.style.position || 'relative'
    parent.appendChild(btn)
  }
}

function enhanceVideo(video: HTMLVideoElement, state: InstagramEnhancerState): void {
  if (isFeatureOn(state.values, 'videoControls')) {
    video.controls = true
  }
  const rate = playbackRate(state.values)
  if (rate !== 1) video.playbackRate = rate
  if (isFeatureOn(state.values, 'mediaDownload')) attachDownloadButton(video)
  if (isFeatureOn(state.values, 'pictureInPicture') && !video.dataset.tbxIgPip) {
    video.dataset.tbxIgPip = '1'
    video.addEventListener(
      'dblclick',
      () => {
        if (document.pictureInPictureElement) void document.exitPictureInPicture()
        else void video.requestPictureInPicture().catch(() => {})
      },
      { passive: true },
    )
  }
}

function scanVideos(state: InstagramEnhancerState): void {
  document.querySelectorAll('video').forEach((v) => enhanceVideo(v, state))
}

function startObserver(state: InstagramEnhancerState): void {
  const guarded = window as Guarded
  guarded[observerKey]?.disconnect()
  const obs = new MutationObserver(() => scanVideos(state))
  obs.observe(document.documentElement, { childList: true, subtree: true })
  guarded[observerKey] = obs
  scanVideos(state)
}

function stopObserver(): void {
  const guarded = window as Guarded
  guarded[observerKey]?.disconnect()
  delete guarded[observerKey]
}

export function applyInstagramEnhancer(state: InstagramEnhancerState): void {
  if (!state.enabled) {
    stopAll()
    return
  }
  ensureCssLink()
  document.documentElement.setAttribute(ACTIVE_ATTR, 'true')
  startObserver(state)
}

export function stopAll(): void {
  stopObserver()
  document.documentElement.removeAttribute(ACTIVE_ATTR)
  document.getElementById(STYLE_LINK_ID)?.remove()
  document.querySelectorAll('.tbx-ig-download').forEach((el) => el.remove())
  document.querySelectorAll('video[data-tbx-ig-dl]').forEach((v) => {
    v.removeAttribute('data-tbx-ig-dl')
    v.removeAttribute('data-tbx-ig-pip')
  })
}
