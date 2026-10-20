export type StreamingPipResult = 'entered' | 'unsupported' | 'none' | 'error'

/**
 * Picture-in-Picture for DRM streaming players (Prime Video, Netflix, Hotstar, ...). Their own
 * player UI can't be moved (its layout is driven by the main window), so only the <video> moves
 * into a Document PiP window and a Prime Video-style control layer is drawn around it. Controls
 * press the site's own buttons when they exist, so playback logic stays with the site.
 *
 * Must stay fully self-contained (no references to module scope): it is serialized by
 * chrome.scripting.executeScript and also bundled into the auto-PiP page script.
 */
export async function enterStreamingPlayerPip(): Promise<StreamingPipResult> {
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
  const videos: HTMLVideoElement[] = []
  collect(document, videos)
  let video: HTMLVideoElement | null = null
  let bestScore = -1
  for (const v of videos) {
    if (v.readyState === 0) continue
    const r = v.getBoundingClientRect()
    if (r.width < 120 || r.height < 68) continue
    const score = (!v.paused && !v.ended ? 1e12 : 0) + r.width * r.height
    if (score > bestScore) {
      bestScore = score
      video = v
    }
  }
  if (!video || !video.parentNode) return 'none'
  const v = video

  // Site hooks: Prime Video first, then generic fallbacks.
  const q = (...selectors: string[]): HTMLElement | null => {
    for (const s of selectors) {
      const el = document.querySelector<HTMLElement>(s)
      if (el) return el
    }
    return null
  }
  const site = {
    title: () => q('.atvwebplayersdk-title-text', '[data-uia="video-title"] h4', '.title-text'),
    episode: () => q('.atvwebplayersdk-subtitle-text', '[data-uia="video-title"] span'),
    time: () => q('.atvwebplayersdk-timeindicator-text'),
    captions: () => q('.atvwebplayersdk-captions-text', '.player-timedtext', '.shaka-text-container'),
    playPause: () => q('.atvwebplayersdk-playpause-button', 'button[data-uia="control-play-pause-play"]', 'button[data-uia="control-play-pause-pause"]'),
    back: () => q('.atvwebplayersdk-fastseekback-button', 'button[data-uia="control-back10"]'),
    forward: () => q('.atvwebplayersdk-fastseekforward-button', 'button[data-uia="control-forward10"]'),
    next: () => q('.atvwebplayersdk-nexttitle-button', 'button[data-uia="control-next"]'),
  }

  const ratio = v.videoWidth && v.videoHeight ? v.videoWidth / v.videoHeight : 16 / 9
  let pip: Window
  try {
    pip = await api.requestWindow({ width: 720, height: Math.round(720 / ratio) })
  } catch {
    return 'error'
  }
  const pdoc = pip.document

  const style = pdoc.createElement('style')
  style.textContent = `
    html,body{margin:0;width:100%;height:100%;background:#000;overflow:hidden;color:#fff;
      font-family:"Amazon Ember","Segoe UI",system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased}
    video{position:fixed!important;inset:0!important;width:100%!important;height:100%!important;
      max-width:none!important;max-height:none!important;object-fit:contain!important;transform:none!important;margin:0!important}
    .ui{position:fixed;inset:0;display:flex;flex-direction:column;justify-content:space-between;
      transition:opacity .25s ease;user-select:none}
    .ui.hide{opacity:0;cursor:none}
    .ui.hide *{pointer-events:none}
    .top{display:flex;align-items:flex-start;gap:14px;padding:16px 18px 40px;
      background:linear-gradient(rgba(0,0,0,.75),transparent)}
    .meta{flex:1;min-width:0}
    .title{font-size:20px;font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .ep{margin-top:4px;font-size:14px;color:rgba(255,255,255,.85);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .icons{display:flex;gap:6px}
    button{all:unset;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;color:#fff}
    button:focus-visible{outline:2px solid #fff;outline-offset:2px}
    .ib{width:34px;height:34px;border-radius:50%}
    .ib:hover{background:rgba(255,255,255,.15)}
    .ib svg{width:20px;height:20px}
    .ib.off{opacity:.55}
    .center{display:flex;align-items:center;justify-content:center;gap:28px}
    .skip svg{width:30px;height:30px}
    .play{width:60px;height:60px;border-radius:50%;background:rgba(66,66,66,.85)}
    .play:hover{background:rgba(90,90,90,.95)}
    .play svg{width:30px;height:30px}
    .bottom{padding:40px 18px 14px;background:linear-gradient(transparent,rgba(0,0,0,.8))}
    .bar{display:flex;align-items:center;gap:12px;font-size:12px;font-weight:700;font-variant-numeric:tabular-nums}
    .track{position:relative;flex:1;height:14px;display:flex;align-items:center;cursor:pointer}
    .rail{position:absolute;left:0;right:0;height:2px;background:rgba(255,255,255,.35);border-radius:2px}
    .fill{position:absolute;left:0;height:2px;background:#fff;border-radius:2px}
    .track:hover .rail,.track:hover .fill{height:4px}
    .knob{position:absolute;width:12px;height:12px;margin-left:-6px;border-radius:50%;background:#fff;opacity:0;transition:opacity .15s}
    .track:hover .knob{opacity:1}
    .row{display:flex;justify-content:flex-end;margin-top:10px;min-height:30px}
    .next{padding:6px 12px;border-radius:4px;background:rgba(66,66,66,.9);font-size:13px;font-weight:700}
    .next:hover{background:rgba(90,90,90,.95)}
    .cc{position:fixed;left:50%;bottom:22%;transform:translateX(-50%);max-width:86%;text-align:center;
      font-size:clamp(14px,3.4vw,24px);line-height:1.35;text-shadow:0 0 4px #000,0 0 2px #000;pointer-events:none;white-space:pre-line}
    .cc:empty{display:none}
  `
  pdoc.head.appendChild(style)

  const ICON: Record<string, string> = {
    play: 'M8 5v14l11-7z',
    pause: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z',
    back: 'M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8zm-1.1 11h-.85v-3.26l-1.01.31v-.69l1.77-.63h.09V16zm4.28-1.76c0 .32-.03.6-.1.82s-.17.42-.29.57-.28.26-.45.33-.37.1-.59.1-.41-.03-.59-.1-.33-.18-.46-.33-.23-.34-.3-.57-.11-.5-.11-.82v-.74c0-.32.03-.6.1-.82s.17-.42.29-.57.28-.26.45-.33.37-.1.59-.1.41.03.59.1.33.18.46.33.23.34.3.57.11.5.11.82v.74zm-.85-.86c0-.19-.01-.35-.04-.48s-.07-.23-.12-.31-.11-.14-.19-.17-.16-.05-.25-.05-.18.02-.25.05-.14.09-.19.17-.09.18-.12.31-.04.29-.04.48v.97c0 .19.01.35.04.48s.07.24.12.32.11.14.19.17.16.05.25.05.18-.02.25-.05.14-.09.19-.17.09-.19.11-.32.04-.29.04-.48v-.97z',
    fwd: 'M18 13c0 3.31-2.69 6-6 6s-6-2.69-6-6 2.69-6 6-6v4l5-5-5-5v4c-4.42 0-8 3.58-8 8s3.58 8 8 8 8-3.58 8-8h-2zm-7.46 2.22c-.06.05-.12.09-.2.12s-.17.04-.27.04c-.09 0-.17-.01-.25-.04s-.14-.06-.2-.11-.1-.1-.13-.17-.05-.14-.05-.22h-.85c0 .21.04.39.12.55s.19.28.33.38.29.18.46.23.35.07.53.07c.21 0 .41-.03.6-.08s.34-.14.48-.24.24-.24.32-.39.12-.33.12-.53c0-.23-.06-.44-.18-.61s-.3-.3-.54-.39c.1-.05.2-.1.28-.17s.15-.14.2-.22.1-.16.13-.25.04-.18.04-.27c0-.2-.04-.37-.11-.53s-.17-.28-.3-.38-.28-.18-.46-.23-.37-.08-.59-.08c-.19 0-.38.03-.54.08s-.32.13-.44.23-.23.21-.3.34-.11.29-.11.45h.85c0-.07.02-.14.05-.2s.07-.11.12-.15.11-.07.18-.1.14-.03.22-.03c.1 0 .18.01.25.04s.13.06.18.11.08.11.11.17.04.14.04.22c0 .18-.05.32-.16.43s-.26.16-.48.16h-.43v.66h.45c.11 0 .2.01.29.04s.16.06.22.11.11.12.14.2.05.18.05.29c0 .09-.01.17-.04.24s-.08.11-.13.17zm3.9-3.44c-.18-.07-.37-.1-.59-.1s-.41.03-.59.1-.33.18-.45.33-.23.34-.29.57-.1.5-.1.82v.74c0 .32.04.6.11.82s.17.42.3.57.28.26.46.33.37.1.59.1.41-.03.59-.1.33-.18.45-.33.22-.34.29-.57.1-.5.1-.82v-.74c0-.32-.04-.6-.11-.82s-.17-.42-.3-.57-.28-.26-.46-.33zm.01 2.57c0 .19-.01.35-.04.48s-.06.24-.11.32-.11.14-.19.17-.16.05-.25.05-.18-.02-.25-.05-.14-.09-.19-.17-.09-.19-.12-.32-.04-.29-.04-.48v-.97c0-.19.01-.35.04-.48s.06-.23.12-.31.11-.14.19-.17.16-.05.25-.05.18.02.25.05.14.09.19.17.09.18.12.31.04.29.04.48v.97z',
    cc: 'M19 4H5c-1.11 0-2 .9-2 2v12c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm-8 7H9.5v-.5h-2v3h2V13H11v1c0 .55-.45 1-1 1H7c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1zm7 0h-1.5v-.5h-2v3h2V13H18v1c0 .55-.45 1-1 1h-3c-.55 0-1-.45-1-1v-4c0-.55.45-1 1-1h3c.55 0 1 .45 1 1v1z',
    vol: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z',
    mute: 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.796 8.796 0 0 0 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a8.99 8.99 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4 9.91 6.09 12 8.18V4z',
    tab: 'M19 11h-8v6h8v-6zm4 8V4.98C23 3.88 22.1 3 21 3H3c-1.1 0-2 .88-2 1.98V19c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2zm-2 .02H3V4.97h18v14.05z',
  }
  const svg = (name: string): SVGSVGElement => {
    const s = pdoc.createElementNS('http://www.w3.org/2000/svg', 'svg')
    s.setAttribute('viewBox', '0 0 24 24')
    const p = pdoc.createElementNS('http://www.w3.org/2000/svg', 'path')
    p.setAttribute('d', ICON[name])
    p.setAttribute('fill', 'currentColor')
    s.appendChild(p)
    return s
  }
  const mk = <K extends keyof HTMLElementTagNameMap>(tag: K, cls: string, text?: string): HTMLElementTagNameMap[K] => {
    const n = pdoc.createElement(tag)
    n.className = cls
    if (text) n.textContent = text
    return n
  }
  const iconBtn = (cls: string, name: string, label: string, onClick: () => void): HTMLButtonElement => {
    const b = mk('button', cls)
    b.title = label
    b.setAttribute('aria-label', label)
    b.appendChild(svg(name))
    b.addEventListener('click', (e) => {
      e.stopPropagation()
      onClick()
      poke()
    })
    return b
  }
  const setIcon = (b: HTMLElement, name: string) => b.replaceChildren(svg(name))

  // Time: Prime's own indicator reflects the programme timeline; the <video> clock may be offset.
  const parseClock = (s: string): number => s.split(':').reduce((acc, part) => acc * 60 + Number(part), 0)
  const clock = (): { elapsed: number; total: number } => {
    const text = site.time()?.textContent ?? ''
    const parts = text.match(/\d{1,2}(?::\d{2}){1,2}/g)
    if (parts && parts.length >= 2) return { elapsed: parseClock(parts[0]), total: parseClock(parts[1]) }
    return { elapsed: v.currentTime, total: Number.isFinite(v.duration) ? v.duration : 0 }
  }
  const fmt = (sec: number): string => {
    const s = Math.max(0, Math.floor(sec))
    const h = Math.floor(s / 3600)
    const m = Math.floor((s % 3600) / 60)
    const ss = String(s % 60).padStart(2, '0')
    return h ? `${h}:${String(m).padStart(2, '0')}:${ss}` : `${String(m).padStart(2, '0')}:${ss}`
  }
  const seekBy = (delta: number) => {
    v.currentTime = Math.max(0, v.currentTime + delta)
  }

  const ui = mk('div', 'ui')
  const title = mk('div', 'title')
  const episode = mk('div', 'ep')
  const meta = mk('div', 'meta')
  meta.append(title, episode)

  let ccOn = true
  const ccBtn = iconBtn('ib', 'cc', 'Subtitles', () => {
    ccOn = !ccOn
    ccBtn.classList.toggle('off', !ccOn)
    syncCaptions()
  })
  const volBtn = iconBtn('ib', v.muted ? 'mute' : 'vol', 'Mute', () => {
    v.muted = !v.muted
  })
  const tabBtn = iconBtn('ib', 'tab', 'Back to tab', () => pip.close())
  const icons = mk('div', 'icons')
  icons.append(ccBtn, volBtn, tabBtn)
  const top = mk('div', 'top')
  top.append(meta, icons)

  const togglePlay = () => {
    const btn = site.playPause()
    if (btn) btn.click()
    else if (v.paused) void v.play()
    else v.pause()
  }
  const back = iconBtn('skip', 'back', 'Back 10 seconds', () => {
    const btn = site.back()
    if (btn) btn.click()
    else seekBy(-10)
  })
  const playBtn = iconBtn('play', v.paused ? 'play' : 'pause', 'Play/Pause', togglePlay)
  const fwd = iconBtn('skip', 'fwd', 'Forward 10 seconds', () => {
    const btn = site.forward()
    if (btn) btn.click()
    else seekBy(10)
  })
  const center = mk('div', 'center')
  center.append(back, playBtn, fwd)

  const elapsedEl = mk('span', '')
  const remainEl = mk('span', '')
  const track = mk('div', 'track')
  const rail = mk('div', 'rail')
  const fillEl = mk('div', 'fill')
  const knob = mk('div', 'knob')
  track.append(rail, fillEl, knob)
  track.addEventListener('click', (e) => {
    e.stopPropagation()
    const r = track.getBoundingClientRect()
    const { elapsed, total } = clock()
    if (!total) return
    seekBy(((e.clientX - r.left) / r.width) * total - elapsed)
    poke()
  })
  const bar = mk('div', 'bar')
  bar.append(elapsedEl, track, remainEl)
  const row = mk('div', 'row')
  const nextBtn = mk('button', 'next', 'Next Episode')
  nextBtn.addEventListener('click', (e) => {
    e.stopPropagation()
    site.next()?.click()
  })
  row.appendChild(nextBtn)
  const bottom = mk('div', 'bottom')
  bottom.append(bar, row)

  ui.append(top, center, bottom)
  const cc = mk('div', 'cc')

  // Move the video in; leave a placeholder so the site's layout stays intact.
  const originalParent = v.parentNode as Node
  const originalNext = v.nextSibling
  const videoStyle = v.getAttribute('style')
  const rect = v.getBoundingClientRect()
  const placeholder = document.createElement('div')
  placeholder.style.cssText =
    `width:${rect.width}px;height:${rect.height}px;background:#000;color:#fff;display:flex;` +
    'align-items:center;justify-content:center;font:14px system-ui,sans-serif;'
  placeholder.textContent = 'Playing in Picture-in-Picture'
  originalParent.insertBefore(placeholder, v)
  pdoc.body.append(v, cc, ui)

  const syncCaptions = () => {
    cc.textContent = ccOn ? (site.captions()?.innerText ?? '').trim() : ''
  }
  const sync = () => {
    title.textContent = site.title()?.textContent?.trim() || document.title.replace(/\s*[-|].*$/, '')
    episode.textContent = site.episode()?.textContent?.trim() ?? ''
    const { elapsed, total } = clock()
    elapsedEl.textContent = fmt(elapsed)
    remainEl.textContent = total ? fmt(total - elapsed) : ''
    const pct = total ? `${Math.min(100, (elapsed / total) * 100)}%` : '0%'
    fillEl.style.width = pct
    knob.style.left = pct
    nextBtn.style.display = site.next() ? '' : 'none'
    setIcon(playBtn, v.paused ? 'play' : 'pause')
    setIcon(volBtn, v.muted ? 'mute' : 'vol')
    syncCaptions()
  }
  sync()
  const timer = window.setInterval(sync, 250)
  const mediaEvents = ['play', 'pause', 'volumechange', 'seeked']
  for (const type of mediaEvents) v.addEventListener(type, sync)

  let hideTimer = 0
  const poke = () => {
    ui.classList.remove('hide')
    window.clearTimeout(hideTimer)
    hideTimer = window.setTimeout(() => {
      if (!v.paused) ui.classList.add('hide')
    }, 2500)
  }
  pdoc.addEventListener('mousemove', poke)
  ui.addEventListener('click', (e) => {
    if (e.target === ui || e.target === center) togglePlay()
  })
  const onKey = (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'k') togglePlay()
    else if (e.key === 'ArrowLeft') back.click()
    else if (e.key === 'ArrowRight') fwd.click()
    else if (e.key === 'm') volBtn.click()
    else return
    e.preventDefault()
    poke()
  }
  pdoc.addEventListener('keydown', onKey)
  poke()

  pip.addEventListener('pagehide', () => {
    window.clearInterval(timer)
    window.clearTimeout(hideTimer)
    for (const type of mediaEvents) v.removeEventListener(type, sync)
    if (videoStyle === null) v.removeAttribute('style')
    else v.setAttribute('style', videoStyle)
    if (placeholder.parentNode) placeholder.parentNode.replaceChild(v, placeholder)
    else if (originalNext && originalNext.parentNode === originalParent) originalParent.insertBefore(v, originalNext)
    else originalParent.appendChild(v)
    const realVisibility = Object.getOwnPropertyDescriptor(Document.prototype, 'visibilityState')?.get?.call(document)
    if ((window as unknown as { __tbxPipResume?: boolean }).__tbxPipResume) {
      window.setTimeout(() => void v.play().catch(() => undefined), 0)
    } else if (realVisibility === 'hidden') {
      v.pause()
    }
  })
  return 'entered'
}
