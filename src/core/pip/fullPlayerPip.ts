export type FullPlayerPipResult = 'entered' | 'unsupported' | 'none' | 'error'

/**
 * Moves the page's whole video player (video + the site's own controls: seek, speed, quality,
 * captions, cast, ...) into a Document Picture-in-Picture window that floats above every tab
 * and app. Works for YouTube and for generic players on any site whose player lives in the
 * top-level document.
 *
 * Must stay fully self-contained (no references to module scope): it is serialized by
 * chrome.scripting.executeScript and also bundled into the auto-PiP page script.
 */
export async function enterFullPlayerPip(): Promise<FullPlayerPipResult> {
  type DocPipApi = {
    window: Window | null
    requestWindow(options?: { width?: number; height?: number }): Promise<Window>
  }
  const api = (window as unknown as { documentPictureInPicture?: DocPipApi }).documentPictureInPicture
  if (!api || window !== window.top) return 'unsupported'
  if (api.window) return 'entered'

  const collect = (root: ParentNode, out: HTMLVideoElement[]) => {
    root.querySelectorAll('video').forEach((v) => out.push(v))
    root.querySelectorAll('*').forEach((el) => {
      if (el.shadowRoot) collect(el.shadowRoot, out)
    })
  }

  const pickVideo = (): HTMLVideoElement | null => {
    const videos: HTMLVideoElement[] = []
    collect(document, videos)
    let best: HTMLVideoElement | null = null
    let bestScore = -1
    for (const v of videos) {
      if (v.readyState === 0) continue
      const r = v.getBoundingClientRect()
      if (r.width < 120 || r.height < 68) continue
      const playing = !v.paused && !v.ended && v.readyState > 2
      const score = (playing ? 1e12 : 0) + r.width * r.height
      if (score > bestScore) {
        bestScore = score
        best = v
      }
    }
    return best
  }

  const parentOf = (node: Element): Element | null => {
    if (node.parentElement) return node.parentElement
    const root = node.getRootNode()
    return root instanceof ShadowRoot ? root.host : null
  }

  // The player container is the outermost ancestor that still hugs the video
  // (controls overlay or sit just below it), stopping before page layout wrappers.
  const findContainer = (video: HTMLVideoElement): HTMLElement => {
    const vr = video.getBoundingClientRect()
    let container: Element = video
    let node: Element = video
    for (let i = 0; i < 15; i++) {
      const parent = parentOf(node)
      if (!parent || parent === document.body || parent === document.documentElement) break
      const r = parent.getBoundingClientRect()
      if (r.width > vr.width * 1.2 + 32 || r.height > vr.height * 1.45 + 72) break
      container = parent
      node = parent
    }
    // Never move a node out of its shadow tree (it would lose the shadow styles).
    while (container.getRootNode() instanceof ShadowRoot) {
      container = (container.getRootNode() as ShadowRoot).host
    }
    return container as HTMLElement
  }

  const resolveTarget = (): { video: HTMLVideoElement; container: HTMLElement } | null => {
    const ytPlayer = document.querySelector<HTMLElement>('#movie_player, .html5-video-player')
    const ytVideo = ytPlayer?.querySelector('video') ?? null
    if (ytPlayer && ytVideo && ytVideo.readyState > 0) return { video: ytVideo, container: ytPlayer }
    const v = pickVideo()
    if (!v) return null
    const c = findContainer(v)
    // A bare <video> has no site controls; native PiP is the better fit there.
    return c === v ? null : { video: v, container: c }
  }
  const target = resolveTarget()
  if (!target || !target.container.parentNode) return 'none'
  const { video, container } = target

  const ratio = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9
  const width = 640
  const height = Math.round(width / ratio)

  let pip: Window
  try {
    pip = await api.requestWindow({ width, height })
  } catch {
    return 'error'
  }
  const pdoc = pip.document

  for (const attr of Array.from(document.documentElement.attributes)) {
    pdoc.documentElement.setAttribute(attr.name, attr.value)
  }
  for (const attr of Array.from(document.body.attributes)) {
    if (attr.name !== 'style') pdoc.body.setAttribute(attr.name, attr.value)
  }

  const sheets: CSSStyleSheet[] = [
    ...Array.from(document.styleSheets),
    ...((document as Document & { adoptedStyleSheets?: CSSStyleSheet[] }).adoptedStyleSheets ?? []),
  ]
  for (const sheet of sheets) {
    try {
      const style = pdoc.createElement('style')
      style.textContent = Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join('\n')
      pdoc.head.appendChild(style)
    } catch {
      if (sheet.href) {
        const link = pdoc.createElement('link')
        link.rel = 'stylesheet'
        link.href = sheet.href
        pdoc.head.appendChild(link)
      }
    }
  }
  const fit = pdoc.createElement('style')
  fit.textContent =
    'html,body{margin:0!important;padding:0!important;width:100%!important;height:100%!important;background:#000!important;overflow:hidden!important}' +
    '.html5-video-container{width:100%!important;height:100%!important}' +
    '.ytp-chrome-bottom{width:calc(100% - 24px)!important;left:12px!important}' +
    '.ytp-gradient-bottom,.ytp-gradient-top{width:100%!important}'
  pdoc.head.appendChild(fit)

  // Recreate the container's ancestor chain (tag, classes, attributes) as empty shells so the
  // site's descendant selectors (e.g. ".page .player .controls") still match in the new window.
  const chain: Element[] = []
  for (let a = container.parentElement; a && a !== document.body && a !== document.documentElement; a = a.parentElement) {
    chain.unshift(a)
  }
  let host: HTMLElement = pdoc.body
  for (const ancestor of chain) {
    const shell = pdoc.createElement(ancestor.tagName.toLowerCase())
    for (const attr of Array.from(ancestor.attributes)) {
      if (attr.name !== 'style') shell.setAttribute(attr.name, attr.value)
    }
    shell.style.cssText =
      'display:block!important;position:static!important;width:100%!important;height:100%!important;' +
      'margin:0!important;padding:0!important;max-width:none!important;max-height:none!important;' +
      'min-width:0!important;min-height:0!important;transform:none!important;overflow:visible!important'
    host.appendChild(shell)
    host = shell
  }

  const originalParent = container.parentNode as Node
  const originalNext = container.nextSibling
  const containerStyle = container.getAttribute('style')
  const videoStyle = video.getAttribute('style')

  const rect = container.getBoundingClientRect()
  const placeholder = document.createElement('div')
  placeholder.style.cssText =
    `width:${rect.width}px;height:${rect.height}px;background:#000;color:#fff;display:flex;` +
    'align-items:center;justify-content:center;font:14px system-ui,sans-serif;'
  placeholder.textContent = 'Playing in Picture-in-Picture'
  originalParent.insertBefore(placeholder, container)

  const fill = (el: HTMLElement, props: Record<string, string>) => {
    for (const [key, value] of Object.entries(props)) el.style.setProperty(key, value, 'important')
  }
  fill(container, {
    position: 'fixed',
    top: '0',
    left: '0',
    right: '0',
    bottom: '0',
    width: '100%',
    height: '100%',
    'max-width': 'none',
    'max-height': 'none',
    margin: '0',
    transform: 'none',
    'aspect-ratio': 'auto',
  })
  fill(video, {
    width: '100%',
    height: '100%',
    'max-width': 'none',
    'max-height': 'none',
    'object-fit': 'contain',
  })
  if (getComputedStyle(video).position === 'absolute') fill(video, { top: '0', left: '0' })

  host.appendChild(container)

  // Re-layout the player on every resize (throttled to one pass per frame) so the video and
  // its controls always fill the window.
  let frame = 0
  const nudge = () => {
    if (frame) return
    frame = window.requestAnimationFrame(() => {
      frame = 0
      window.dispatchEvent(new Event('resize'))
    })
  }
  pip.addEventListener('resize', nudge)
  const observer = new ResizeObserver(nudge)
  observer.observe(pdoc.documentElement)
  nudge()

  // Many players (Prime Video, Netflix, ...) reveal controls and handle shortcuts from listeners
  // on the page's document/window, which never see input in the PiP window. Mirror it there.
  const forward = (event: Event) => {
    let clone: Event
    if (event.type.startsWith('key')) {
      // Focused controls inside the player handle their own keys.
      if (event.target && container.contains(event.target as Node)) return
      clone = new KeyboardEvent(event.type, event as KeyboardEvent)
    } else if (event.type === 'wheel') {
      clone = new WheelEvent(event.type, event as WheelEvent)
    } else if (event.type.startsWith('pointer')) {
      clone = new PointerEvent(event.type, event as PointerEvent)
    } else {
      clone = new MouseEvent(event.type, event as MouseEvent)
    }
    document.dispatchEvent(clone)
  }
  const forwardTypes = ['mousemove', 'pointermove', 'mouseover', 'mouseout', 'wheel', 'keydown', 'keyup']
  for (const type of forwardTypes) pdoc.addEventListener(type, forward, { passive: true })

  const restoreStyle = (el: HTMLElement, value: string | null) => {
    if (value === null) el.removeAttribute('style')
    else el.setAttribute('style', value)
  }

  pip.addEventListener('pagehide', () => {
    pip.removeEventListener('resize', nudge)
    observer.disconnect()
    for (const type of forwardTypes) pdoc.removeEventListener(type, forward)
    restoreStyle(container, containerStyle)
    restoreStyle(video, videoStyle)
    if (placeholder.parentNode) placeholder.parentNode.replaceChild(container, placeholder)
    else if (originalNext && originalNext.parentNode === originalParent) originalParent.insertBefore(container, originalNext)
    else originalParent.appendChild(container)
    // Closed from the floating window while the tab is in the background: stop playback
    // (same as Chrome's own PiP). Returning to the tab keeps it playing.
    if (document.visibilityState === 'hidden') video.pause()
    nudge()
  })
  return 'entered'
}

/**
 * Embedded players from another origin (Dailymotion, Vimeo, news embeds) cannot open a Document
 * PiP window themselves and cannot be moved without reloading. Instead, open a fresh copy of the
 * same embed inside a Document PiP window from the top-level page, resume it at the current
 * position, and pause the original. On close, the original jumps to where the copy stopped.
 *
 * Talks to the auto-PiP page script inside the embed via postMessage ({ __tbxPip: ... }).
 * Must stay fully self-contained (serialized by chrome.scripting.executeScript).
 */
export async function enterEmbeddedPlayerPip(): Promise<FullPlayerPipResult> {
  type DocPipApi = {
    window: Window | null
    requestWindow(options?: { width?: number; height?: number }): Promise<Window>
  }
  type Snapshot = { frame: HTMLIFrameElement; t: number; playing: boolean; ratio: number }
  const api = (window as unknown as { documentPictureInPicture?: DocPipApi }).documentPictureInPicture
  if (!api || window !== window.top) return 'unsupported'
  if (api.window) return 'entered'

  const frames = Array.from(document.querySelectorAll('iframe')).filter((f) => {
    const r = f.getBoundingClientRect()
    return r.width >= 160 && r.height >= 90 && !!f.contentWindow && !!f.src
  })
  if (frames.length === 0) return 'none'

  // Ask every candidate embed for its playback state; only embeds running our script reply.
  const snapshots = await new Promise<Snapshot[]>((resolve) => {
    const replies: Snapshot[] = []
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { __tbxPip?: string; t?: number; playing?: boolean; ratio?: number } | null
      if (!data || data.__tbxPip !== 'snapshot') return
      const frame = frames.find((f) => f.contentWindow === event.source)
      if (frame) {
        replies.push({ frame, t: Number(data.t) || 0, playing: !!data.playing, ratio: Number(data.ratio) || 16 / 9 })
      }
    }
    window.addEventListener('message', onMessage)
    for (const f of frames) f.contentWindow?.postMessage({ __tbxPip: 'snapshot-request' }, '*')
    window.setTimeout(() => {
      window.removeEventListener('message', onMessage)
      resolve(replies)
    }, 350)
  })
  if (snapshots.length === 0) return 'none'
  snapshots.sort((a, b) => Number(b.playing) - Number(a.playing))
  const target = snapshots[0]
  const original = target.frame

  const width = 640
  const height = Math.round(width / target.ratio)
  let pip: Window
  try {
    pip = await api.requestWindow({ width, height })
  } catch {
    return 'error'
  }

  original.contentWindow?.postMessage({ __tbxPip: 'pause' }, '*')

  const url = new URL(original.src, location.href)
  const hash = url.hash.replace(/^#/, '')
  url.hash = `${hash ? `${hash}&` : ''}tbx-pip-t=${target.t.toFixed(2)}`

  const pdoc = pip.document
  const style = pdoc.createElement('style')
  style.textContent =
    'html,body{margin:0;width:100%;height:100%;background:#000;overflow:hidden}' +
    'iframe{position:fixed;inset:0;width:100%;height:100%;border:0}'
  pdoc.head.appendChild(style)
  const copy = pdoc.createElement('iframe')
  const allow = new Set(
    (original.getAttribute('allow') ?? '')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean),
  )
  for (const feature of ['autoplay', 'fullscreen', 'picture-in-picture', 'encrypted-media']) allow.add(feature)
  copy.setAttribute('allow', Array.from(allow).join('; '))
  copy.setAttribute('allowfullscreen', '')
  copy.src = url.toString()
  pdoc.body.appendChild(copy)

  let lastT = target.t
  const onTime = (event: MessageEvent) => {
    const data = event.data as { __tbxPip?: string; t?: number } | null
    if (data?.__tbxPip === 'time' && event.source === copy.contentWindow) lastT = Number(data.t) || lastT
  }
  pip.addEventListener('message', onTime)

  pip.addEventListener('pagehide', () => {
    pip.removeEventListener('message', onTime)
    original.contentWindow?.postMessage(
      { __tbxPip: 'seek', t: lastT, play: document.visibilityState === 'visible' },
      '*',
    )
  })
  return 'entered'
}
