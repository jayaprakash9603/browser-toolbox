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
