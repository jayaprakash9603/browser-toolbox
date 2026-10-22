import { YOUTUBE_SKIP_BUTTON_SELECTORS } from './selectors'

export function isSkipElementClickable(el: HTMLElement): boolean {
  if (!el.isConnected) return false
  if (el.getAttribute('aria-disabled') === 'true' || el.hasAttribute('disabled')) return false
  if (el.classList.contains('ytp-ad-skip-button-disabled')) return false
  const container = el.closest('.ytp-ad-skip-button-container')
  if (container?.classList.contains('ytp-ad-skip-button-disabled')) return false
  const style = getComputedStyle(el)
  if (style.display === 'none' || style.visibility === 'hidden' || style.pointerEvents === 'none') return false
  const rect = el.getBoundingClientRect()
  return rect.width >= 2 && rect.height >= 2
}

function playerRoot(): HTMLElement | null {
  return document.querySelector<HTMLElement>('#movie_player, .html5-video-player')
}

export function findSkipButton(): HTMLElement | null {
  const scope = playerRoot() ?? document
  for (const selector of YOUTUBE_SKIP_BUTTON_SELECTORS) {
    const el = scope.querySelector<HTMLElement>(selector)
    if (el && isSkipElementClickable(el)) return el
  }
  for (const el of scope.querySelectorAll<HTMLElement>(
    'button, div[role="button"], span[role="button"], .ytp-button',
  )) {
    const label = `${el.getAttribute('aria-label') ?? ''} ${el.textContent ?? ''}`.toLowerCase()
    if (!/\bskip\b/.test(label)) continue
    if (isSkipElementClickable(el)) return el
  }
  return null
}

export function forceClick(el: HTMLElement): void {
  try {
    el.click()
  } catch {
    /* player may reject direct click */
  }
  const opts: MouseEventInit = { bubbles: true, cancelable: true, view: window, buttons: 1 }
  for (const type of ['pointerdown', 'mousedown', 'pointerup', 'mouseup', 'click'] as const) {
    el.dispatchEvent(new MouseEvent(type, opts))
  }
}

export interface YoutubePlayerApi extends HTMLElement {
  getStatsForNerds?: () => { debug_info?: string } | undefined
  getProgressState?: () => { current?: number; duration?: number } | undefined
  getPlayerResponse?: () => { videoDetails?: { lengthSeconds?: string | number } } | undefined
  seekTo?: (seconds: number, allowSeekAhead?: boolean) => void
}

/**
 * Jump to the end of the ad that is playing (MAIN world, needs the player API).
 * Server-stitched ads share the <video> with the song, so they are skipped through the player
 * (whose progress state then describes the ad), exactly like uBO. A separate ad video is
 * seeked only when its length differs from the song's, so the song itself is never skipped.
 */
export function skipAdPlayback(player: YoutubePlayerApi): 'ssap' | 'client' | null {
  if (!player.classList.contains('ad-showing')) return null
  const debug = player.getStatsForNerds?.()?.debug_info ?? ''
  if (debug.startsWith('SSAP, AD')) {
    const progress = player.getProgressState?.()
    const duration = Number(progress?.duration)
    if (!(duration > 0) || Number(progress?.current) >= duration - 0.25) return null
    player.seekTo?.(duration, true)
    return 'ssap'
  }
  const video = player.querySelector<HTMLVideoElement>('video.html5-main-video, video')
  const songLength = Number(player.getPlayerResponse?.()?.videoDetails?.lengthSeconds)
  if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return null
  if (!(songLength > 0) || Math.abs(video.duration - songLength) <= 2) return null
  const end = video.duration - 0.1
  if (video.currentTime >= end) return null
  video.currentTime = end
  return 'client'
}

/** Click “Skip ad” in the page context (MAIN world). Returns true if a click was attempted. */
export function tryAutoSkipAd(): boolean {
  const button = findSkipButton()
  if (!button) return false
  forceClick(button)
  return true
}
