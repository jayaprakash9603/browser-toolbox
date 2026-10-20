(function () {
  if (!navigator.mediaSession || !navigator.mediaSession.setActionHandler) return
  if (window.__tbxPipAuto) return
  window.__tbxPipAuto = true

  function collectVideos(root, out) {
    root.querySelectorAll('video').forEach(function (v) { out.push(v) })
    root.querySelectorAll('*').forEach(function (el) {
      if (el.shadowRoot) collectVideos(el.shadowRoot, out)
    })
  }

  function pickPlayingVideo() {
    const videos = []
    collectVideos(document, videos)
    let best = null
    let bestArea = -1
    for (const video of videos) {
      if (video.readyState === 0 || video.paused || video.ended || video.readyState <= 2) continue
      const r = video.getBoundingClientRect()
      const area = r.width * r.height
      if (area > bestArea) { bestArea = area; best = video }
    }
    return best
  }
  function isYoutubeWatch() {
    const h = location.hostname
    const yt = h === 'www.youtube.com' || h === 'youtube.com' || h === 'm.youtube.com'
    return yt && (location.pathname === '/watch' || location.pathname.indexOf('/live/') === 0)
  }

  // YouTube: move the whole player (all controls) into a Document PiP window.
  async function enterYoutubeDocumentPip() {
    const api = window.documentPictureInPicture
    if (!api || api.window) return !!(api && api.window)
    const player = document.querySelector('#movie_player, .html5-video-player')
    const video = player && player.querySelector('video')
    if (!player || !video || !player.parentElement) return false

    const ratio = video.videoWidth && video.videoHeight ? video.videoWidth / video.videoHeight : 16 / 9
    const width = 560
    const height = Math.round(width / ratio)
    let pip
    try {
      pip = await api.requestWindow({ width: width, height: height })
    } catch (e) {
      return false
    }

    const parent = player.parentElement
    const next = player.nextSibling
    const placeholder = document.createElement('div')
    const rect = player.getBoundingClientRect()
    placeholder.style.cssText =
      'width:' + rect.width + 'px;height:' + rect.height + 'px;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font:14px system-ui,sans-serif;'
    placeholder.textContent = 'Playing in Picture-in-Picture'
    parent.insertBefore(placeholder, player)

    for (const sheet of Array.from(document.styleSheets)) {
      try {
        const style = pip.document.createElement('style')
        style.textContent = Array.from(sheet.cssRules)
          .map(function (r) { return r.cssText })
          .join('\n')
        pip.document.head.appendChild(style)
      } catch (e) {
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

    let frame = 0
    const nudge = function () {
      if (frame) return
      frame = window.requestAnimationFrame(function () {
        frame = 0
        window.dispatchEvent(new Event('resize'))
      })
    }
    pip.addEventListener('resize', nudge)
    const observer = new ResizeObserver(nudge)
    observer.observe(pip.document.documentElement)
    nudge()
    pip.addEventListener('pagehide', function () {
      pip.removeEventListener('resize', nudge)
      observer.disconnect()
      if (next && next.parentNode === parent) parent.insertBefore(player, next)
      else parent.appendChild(player)
      placeholder.remove()
      // Closed from the floating window while the tab is hidden: stop playback.
      if (document.visibilityState === 'hidden') video.pause()
      nudge()
    })
    return true
  }

  async function onEnterPip() {
    if (isYoutubeWatch() && (await enterYoutubeDocumentPip())) return
    const video = pickPlayingVideo()
    if (!video) return
    video.removeAttribute('disablePictureInPicture')
    video.disablePictureInPicture = false
    try {
      await video.requestPictureInPicture()
      video.addEventListener(
        'leavepictureinpicture',
        function () {
          if (document.visibilityState === 'hidden') video.pause()
        },
        { once: true },
      )
    } catch (e) {
      /* page may block PiP */
    }
  }

  function register() {
    try {
      navigator.mediaSession.setActionHandler('enterpictureinpicture', onEnterPip)
    } catch (e) {
      /* unsupported */
    }
  }

  register()
  // Embedded players (Dailymotion, Vimeo, news sites, ...) live in cross-origin iframes where
  // the keyboard shortcut cannot grant the user gesture PiP needs. Show a small button over the
  // video inside the frame so the click itself is the gesture.
  function installFrameButton() {
    if (window === window.top || !document.pictureInPictureEnabled) return

    function bestVideo() {
      const videos = []
      collectVideos(document, videos)
      let best = null
      let bestArea = 0
      for (const v of videos) {
        if (v.readyState === 0) continue
        const r = v.getBoundingClientRect()
        const area = r.width * r.height
        if (r.width >= 160 && r.height >= 90 && area > bestArea) { bestArea = area; best = v }
      }
      return best
    }

    const btn = document.createElement('button')
    btn.type = 'button'
    btn.setAttribute('aria-label', 'Picture-in-Picture')
    btn.title = 'Picture-in-Picture'
    btn.style.cssText =
      'all:initial;position:fixed;z-index:2147483647;width:36px;height:36px;display:none;' +
      'align-items:center;justify-content:center;cursor:pointer;border-radius:8px;' +
      'background:rgba(20,20,20,.72);color:#fff;box-shadow:0 1px 6px rgba(0,0,0,.4);'
    btn.innerHTML =
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="14" rx="2"/>' +
      '<rect x="12" y="10" width="8" height="6" rx="1" fill="currentColor"/></svg>'

    let hideTimer = 0
    function show() {
      const v = bestVideo()
      if (!v) { btn.style.display = 'none'; return }
      const r = v.getBoundingClientRect()
      btn.style.left = Math.max(8, r.left + 8) + 'px'
      btn.style.top = Math.max(8, r.top + 8) + 'px'
      btn.style.display = 'flex'
      clearTimeout(hideTimer)
      hideTimer = setTimeout(function () { btn.style.display = 'none' }, 2800)
    }

    btn.addEventListener('click', function (e) {
      e.preventDefault()
      e.stopPropagation()
      const v = bestVideo()
      if (!v) return
      if (document.pictureInPictureElement) { void document.exitPictureInPicture(); return }
      v.removeAttribute('disablePictureInPicture')
      v.disablePictureInPicture = false
      v.requestPictureInPicture().catch(function () { /* blocked by page */ })
    })
    btn.addEventListener('mouseenter', function () { clearTimeout(hideTimer) })
    btn.addEventListener('mouseleave', show)

    document.addEventListener('mousemove', show, { passive: true, capture: true })
    document.documentElement.appendChild(btn)
  }
  installFrameButton()

  // Sites such as YouTube replace media-session handlers; keep ours registered.
  document.addEventListener('playing', register, true)
  setInterval(register, 4000)
})()
