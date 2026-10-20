/** Self-contained functions for chrome.scripting.executeScript (no closures). */

export type PipMeasureResult =
  | { kind: 'pip-active' }
  | { kind: 'none' }
  | { kind: 'candidate'; area: number; playing: boolean; readyState: number }

function bestVideoInDocument(): HTMLVideoElement | null {
  const videos = Array.from(document.querySelectorAll('video'))
  let best: HTMLVideoElement | null = null
  let bestScore = -1
  for (const video of videos) {
    if (video.readyState === 0) continue
    const rect = video.getBoundingClientRect()
    if (rect.width < 2 || rect.height < 2) continue
    const area = rect.width * rect.height
    const playing = !video.paused && !video.ended && video.readyState > 2
    const score = (playing ? 1e12 : 0) + area
    if (score > bestScore) {
      bestScore = score
      best = video
    }
  }
  return best
}

export function pipTryExitInFrame(): 'exited' | null {
  const docPip = (window as unknown as { documentPictureInPicture?: { window: Window | null } })
    .documentPictureInPicture
  if (docPip?.window) {
    docPip.window.close()
    return 'exited'
  }
  if (document.pictureInPictureElement) {
    void document.exitPictureInPicture()
    return 'exited'
  }
  return null
}

export function pipMeasureInFrame(): PipMeasureResult {
  if (document.pictureInPictureElement) return { kind: 'pip-active' }
  const video = bestVideoInDocument()
  if (!video) return { kind: 'none' }
  const rect = video.getBoundingClientRect()
  const playing = !video.paused && !video.ended && video.readyState > 2
  return {
    kind: 'candidate',
    area: rect.width * rect.height,
    playing,
    readyState: video.readyState,
  }
}

export async function pipEnterInFrame(): Promise<'entered' | 'none' | 'error'> {
  const video = bestVideoInDocument()
  if (!video) return 'none'
  video.removeAttribute('disablePictureInPicture')
  try {
    await video.requestPictureInPicture()
    return 'entered'
  } catch {
    return 'error'
  }
}

/**
 * Moves the whole YouTube player (all native controls: seek, speed, quality, captions, ...)
 * into a Document Picture-in-Picture window that floats above every tab and app.
 * Self-contained: runs via chrome.scripting.executeScript in the MAIN world.
 */
export async function pipEnterDocumentInFrame(): Promise<'entered' | 'unsupported' | 'none' | 'error'> {
  type DocPipApi = {
    window: Window | null
    requestWindow(options?: { width?: number; height?: number }): Promise<Window>
  }
  const api = (window as unknown as { documentPictureInPicture?: DocPipApi }).documentPictureInPicture
  if (!api) return 'unsupported'

  const player = document.querySelector<HTMLElement>('#movie_player, .html5-video-player')
  const video = player?.querySelector('video') ?? null
  if (!player || !video || !player.parentElement) return 'none'

  const ratio = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9
  const width = 560
  const height = Math.round(width / ratio)

  let pip: Window
  try {
    pip = await api.requestWindow({ width, height })
  } catch {
    return 'error'
  }

  // Keep the page layout stable while the player lives in the floating window.
  const originalParent = player.parentElement
  const originalNext = player.nextSibling
  const placeholder = document.createElement('div')
  const rect = player.getBoundingClientRect()
  placeholder.style.cssText = `width:${rect.width}px;height:${rect.height}px;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font:14px system-ui,sans-serif;`
  placeholder.textContent = 'Playing in Picture-in-Picture'
  originalParent.insertBefore(placeholder, player)

  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const style = pip.document.createElement('style')
      style.textContent = Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join('\n')
      pip.document.head.appendChild(style)
    } catch {
      if (sheet.href) {
        const link = pip.document.createElement('link')
        link.rel = 'stylesheet'
        link.href = sheet.href
        pip.document.head.appendChild(link)
      }
    }
  }
  const fit = pip.document.createElement('style')
  fit.textContent =
    'html,body{margin:0;height:100%;background:#000;overflow:hidden}' +
    '#movie_player,.html5-video-player{position:fixed!important;inset:0!important;width:100%!important;height:100%!important}' +
    '.html5-video-container{width:100%!important;height:100%!important}' +
    '.html5-main-video{width:100%!important;height:100%!important;left:0!important;top:0!important;object-fit:contain}' +
    '.ytp-chrome-bottom{width:calc(100% - 24px)!important;left:12px!important}' +
    '.ytp-gradient-bottom,.ytp-gradient-top{width:100%!important}'
  pip.document.head.appendChild(fit)
  pip.document.body.append(player)

  // Re-layout the player on every resize (throttled to one pass per frame) so the video and\n  // control bar always fill the window.\n  let frame = 0\n  const nudge = () => {\n    if (frame) return\n    frame = window.requestAnimationFrame(() => {\n      frame = 0\n      window.dispatchEvent(new Event('resize'))\n    })\n  }\n  pip.addEventListener('resize', nudge)\n  const observer = new ResizeObserver(nudge)\n  observer.observe(pip.document.documentElement)\n  nudge()

  pip.addEventListener('pagehide', () => {
    pip.removeEventListener('resize', nudge)
    observer.disconnect()
    if (originalNext && originalNext.parentNode === originalParent) {
      originalParent.insertBefore(player, originalNext)
    } else {
      originalParent.appendChild(player)
    }
    placeholder.remove()
    nudge()
  })
  return 'entered'
}