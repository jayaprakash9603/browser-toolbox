(function () {
  if (!navigator.mediaSession || !navigator.mediaSession.setActionHandler) return

  function pickPlayingVideo() {
    const videos = document.querySelectorAll('video')
    for (const video of videos) {
      if (video.readyState === 0) continue
      if (!video.paused && !video.ended && video.readyState > 2) return video
    }
    return null
  }

  try {
    navigator.mediaSession.setActionHandler('enterpictureinpicture', async () => {
      const video = pickPlayingVideo()
      if (!video) return
      video.removeAttribute('disablePictureInPicture')
      try {
        await video.requestPictureInPicture()
      } catch {
        /* page may block PiP */
      }
    })
  } catch {
    /* unsupported */
  }
})()
