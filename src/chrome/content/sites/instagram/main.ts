import { PAGE_CMD_KEY, PAGE_EVT_KEY } from '@/core/sites/instagram/constants'
import { isVideoFileUrl } from '@/core/sites/instagram/mediaUrl'

type Guarded = Window & { __toolboxIgMain?: boolean }

const PRIORITY_KEYS = [
  'url',
  'src',
  'video_url',
  'contentUrl',
  'browser_native_hd_url',
  'browser_native_sd_url',
  'playback_url',
  'video_versions',
  'videoVersions',
]

let remembered: string[] = []

function noteUrl(url: string): void {
  if (!isVideoFileUrl(url)) return
  remembered = [url, ...remembered.filter((item) => item !== url)].slice(0, 40)
}

function noteText(text: string): void {
  const sample = text.length > 1_500_000 ? text.slice(0, 1_500_000) : text
  if (!/mp4|video_versions|fbcdn|cdninstagram/i.test(sample)) return
  const matches = sample.match(/https?:\\?\/\\?\/[^"'\\\s<>]+/g) ?? []
  for (const raw of matches) {
    noteUrl(raw.replace(/\\u0026/g, '&').replace(/\\\//g, '/').replace(/\\+$/g, ''))
  }
}

function installCapture(): void {
  const origFetch = window.fetch
  window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
    const result = origFetch.call(window, input, init)
    void Promise.resolve(result)
      .then((res) => {
        try {
          const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url
          noteUrl(url)
          const type = res.headers.get('content-type') ?? ''
          if (!/json|text|javascript/i.test(type)) return
          void res.clone().text().then(noteText).catch(() => {})
        } catch {
          /* ignore */
        }
      })
      .catch(() => {})
    return result
  }

  const origOpen = XMLHttpRequest.prototype.open
  XMLHttpRequest.prototype.open = function (this: XMLHttpRequest, ...args: unknown[]) {
    const url = args[1]
    this.addEventListener('load', () => {
      try {
        if (typeof url === 'string' || url instanceof URL) noteUrl(String(url))
        if (typeof this.responseText === 'string') noteText(this.responseText)
      } catch {
        /* arraybuffer responses have no responseText */
      }
    })
    return (origOpen as (...inner: unknown[]) => void).apply(this, args)
  } as typeof XMLHttpRequest.prototype.open
}

function stringsIn(value: unknown, depth: number, seen: Set<object>, out: string[]): void {
  if (depth > 6 || value == null) return
  if (typeof value === 'string') {
    if (value.includes('http')) out.push(value)
    return
  }
  if (typeof value !== 'object' || value instanceof Node || seen.has(value)) return
  seen.add(value)
  if (Array.isArray(value)) {
    for (let index = 0; index < Math.min(value.length, 6); index += 1) {
      stringsIn(value[index], depth + 1, seen, out)
    }
    return
  }
  const obj = value as Record<string, unknown>
  let found = false
  for (const key of PRIORITY_KEYS) {
    if (!(key in obj)) continue
    const before = out.length
    stringsIn(obj[key], depth + 1, seen, out)
    if (out.slice(before).some((url) => isVideoFileUrl(url))) found = true
  }
  if (found) return
  const keys = Object.keys(obj)
  for (let index = 0; index < Math.min(keys.length, 20); index += 1) {
    const key = keys[index]
    if (PRIORITY_KEYS.includes(key) || key === 'children' || key.startsWith('_')) continue
    stringsIn(obj[key], depth + 1, seen, out)
  }
}

function urlsFromFiber(video: HTMLVideoElement): string[] {
  const ordered: string[] = []
  let node: Node | null = video
  let fiber: Record<string, unknown> | null = null
  for (let hop = 0; hop < 6 && node && !fiber; hop += 1) {
    const key = Object.keys(node).find(
      (name) => name.startsWith('__reactFiber$') || name.startsWith('__reactInternalInstance$'),
    )
    if (key) fiber = (node as unknown as Record<string, unknown>)[key] as Record<string, unknown>
    else node = node.parentNode
  }
  const seen = new Set<object>()
  for (let hop = 0; hop < 5 && fiber; hop += 1) {
    const before = ordered.length
    stringsIn(fiber.memoizedProps, 0, seen, ordered)
    if (ordered.slice(before).some((url) => isVideoFileUrl(url))) break
    fiber = (fiber.return as Record<string, unknown> | null) ?? null
  }
  return ordered
}

function desiredRate(): number | null {
  const raw = document.documentElement.dataset.tbxIgRate
  if (!raw) return null
  const rate = Number(raw)
  return Number.isFinite(rate) && rate > 0 ? rate : null
}

function pipEnabled(): boolean {
  return document.documentElement.dataset.tbxIgPip === '1'
}

function applyRate(video: HTMLVideoElement, rate: number): void {
  if (Math.abs(video.playbackRate - rate) > 0.01) video.playbackRate = rate
  if (Math.abs(video.defaultPlaybackRate - rate) > 0.01) video.defaultPlaybackRate = rate
}

function enforcePlayers(): void {
  const rate = desiredRate()
  const pip = pipEnabled()
  if (rate == null && !pip) return
  document.querySelectorAll('video').forEach((video) => {
    if (rate != null) applyRate(video, rate)
    if (pip && video.disablePictureInPicture) video.disablePictureInPicture = false
  })
}

function togglePip(video: HTMLVideoElement): void {
  const now = Date.now()
  const last = Number(video.dataset.tbxIgPipAt ?? 0)
  if (now - last < 400) return
  video.dataset.tbxIgPipAt = String(now)
  video.disablePictureInPicture = false
  try {
    if (document.pictureInPictureElement) void document.exitPictureInPicture().catch(() => {})
    else void video.requestPictureInPicture().catch(() => {})
  } catch {
    /* not ready */
  }
}

function onCommand(event: MessageEvent): void {
  if (event.source !== window) return
  const data = event.data as { [PAGE_CMD_KEY]?: string; token?: string } | null
  if (!data || data[PAGE_CMD_KEY] !== 'resolve' || !data.token) return
  const video = document.querySelector<HTMLVideoElement>(`video[data-tbx-ig-pick="${data.token}"]`)
  const preferred: string[] = []
  if (video) {
    if (video.currentSrc) preferred.push(video.currentSrc)
    if (video.src) preferred.push(video.src)
    preferred.push(...urlsFromFiber(video))
  }
  window.postMessage({ [PAGE_EVT_KEY]: 'resolved', token: data.token, preferred, extra: remembered }, '*')
}

function onClick(event: MouseEvent): void {
  const target = event.target
  if (!(target instanceof Element) || !target.closest('#tbx-ig-overlay')) return
  if (!target.closest('[data-tbx-ig-action="pip"]')) return
  const id = target.closest<HTMLElement>('[data-tbx-ig-for]')?.dataset.tbxIgFor
  const video = id ? document.querySelector<HTMLVideoElement>(`video[data-tbx-ig-id="${id}"]`) : null
  if (video) togglePip(video)
}

const guarded = window as Guarded
if (!guarded.__toolboxIgMain && window === window.top) {
  guarded.__toolboxIgMain = true
  installCapture()
  window.addEventListener('message', onCommand)
  document.addEventListener('click', onClick, true)
  document.addEventListener('play', enforcePlayers, true)
  document.addEventListener('playing', enforcePlayers, true)
  document.addEventListener('ratechange', enforcePlayers, true)
  window.setInterval(enforcePlayers, 400)
}
