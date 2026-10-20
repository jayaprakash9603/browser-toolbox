(function () {
  if (!navigator.mediaSession || !navigator.mediaSession.setActionHandler) return
  if (window.__tbxPipAuto) return
  window.__tbxPipAuto = true

  function pickPlayingVideo() {
    const videos = document.querySelectorAll('video')
    for (const video of videos) {
      if (video.readyState === 0) continue
      if (!video.paused && !video.ended && video.readyState > 2) return video
    }
    return null
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

    let frame = 0\n    const nudge = function () {\n      if (frame) return\n      frame = window.requestAnimationFrame(function () {\n        frame = 0\n        window.dispatchEvent(new Event('resize'))\n      })\n    }\n    pip.addEventListener('resize', nudge)\n    const observer = new ResizeObserver(nudge)\n    observer.observe(pip.document.documentElement)\n    nudge()
    pip.addEventListener('pagehide', function () {
      pip.removeEventListener('resize', nudge)
      observer.disconnect()
      if (next && next.parentNode === parent) parent.insertBefore(player, next)
      else parent.appendChild(player)
      placeholder.remove()
      nudge()
    })
    return true
  }

  async function onEnterPip() {
    if (isYoutubeWatch() && (await enterYoutubeDocumentPip())) return
    const video = pickPlayingVideo()
    if (!video) return
    video.removeAttribute('disablePictureInPicture')
    try {
      await video.requestPictureInPicture()
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
  // Sites such as YouTube replace media-session handlers; keep ours registered.
  document.addEventListener('playing', register, true)
  setInterval(register, 4000)
})()
