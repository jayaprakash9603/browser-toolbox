/** Self-contained functions for chrome.scripting.executeScript (no closures). */

export type PipMeasureResult =
  | { kind: 'pip-active' }
  | { kind: 'none' }
  | { kind: 'candidate'; area: number; playing: boolean; readyState: number }

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
  // Finds the best <video>, including ones inside open shadow roots (many OTT players).
  const collect = (root: ParentNode, out: HTMLVideoElement[]) => {
    root.querySelectorAll('video').forEach((v) => out.push(v))
    root.querySelectorAll('*').forEach((el) => {
      if (el.shadowRoot) collect(el.shadowRoot, out)
    })
  }
  const findBest = (): HTMLVideoElement | null => {
    const videos: HTMLVideoElement[] = []
    collect(document, videos)
    let best: HTMLVideoElement | null = null
    let bestScore = -1
    for (const video of videos) {
      if (video.readyState === 0) continue
      const rect = video.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) continue
      const playing = !video.paused && !video.ended && video.readyState > 2
      const score = (playing ? 1e12 : 0) + rect.width * rect.height
      if (score > bestScore) {
        bestScore = score
        best = video
      }
    }
    return best
  }
  const video = findBest()
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
  // Finds the best <video>, including ones inside open shadow roots (many OTT players).
  const collect = (root: ParentNode, out: HTMLVideoElement[]) => {
    root.querySelectorAll('video').forEach((v) => out.push(v))
    root.querySelectorAll('*').forEach((el) => {
      if (el.shadowRoot) collect(el.shadowRoot, out)
    })
  }
  const findBest = (): HTMLVideoElement | null => {
    const videos: HTMLVideoElement[] = []
    collect(document, videos)
    let best: HTMLVideoElement | null = null
    let bestScore = -1
    for (const video of videos) {
      if (video.readyState === 0) continue
      const rect = video.getBoundingClientRect()
      if (rect.width < 2 || rect.height < 2) continue
      const playing = !video.paused && !video.ended && video.readyState > 2
      const score = (playing ? 1e12 : 0) + rect.width * rect.height
      if (score > bestScore) {
        bestScore = score
        best = video
      }
    }
    return best
  }
  const video = findBest()
  if (!video) return 'none'
  // Some sites disable PiP on the element or replace requestPictureInPicture with a no-op.
  // Undo that and use the browser's own implementation (DRM / content protection untouched).
  type RequestPip = (this: HTMLVideoElement) => Promise<PictureInPictureWindow>
  video.removeAttribute('disablePictureInPicture')
  try {
    Object.defineProperty(video, 'disablePictureInPicture', {
      configurable: true,
      get: () => false,
      set: () => undefined,
    })
  } catch {
    /* non-configurable */
  }
  const current = HTMLVideoElement.prototype.requestPictureInPicture as RequestPip
  const frame = /\[native code\]/.test(Function.prototype.toString.call(current))
    ? null
    : document.createElement('iframe')
  try {
    if (!frame) {
      await current.call(video)
    } else {
      frame.style.display = 'none'
      document.documentElement.appendChild(frame)
      const clean = (frame.contentWindow as (Window & typeof globalThis) | null)?.HTMLVideoElement.prototype
        .requestPictureInPicture as RequestPip | undefined
      await (clean ?? current).call(video)
    }
    return 'entered'
  } catch {
    return 'error'
  } finally {
    frame?.remove()
  }
}

export {
  enterEmbeddedPlayerPip as pipEnterEmbeddedInTopFrame,
  enterFullPlayerPip as pipEnterDocumentInFrame,
} from './fullPlayerPip'
export { enterStreamingPlayerPip as pipEnterStreamingInFrame } from './streamingPlayerPip'
