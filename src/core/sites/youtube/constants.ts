export const YOUTUBE_MATCHES = [
  '*://*.youtube.com/*',
  '*://youtube.com/*',
  '*://*.youtube-nocookie.com/*',
]

export const CONTENT_SCRIPT_IDS = {
  isolated: 'sites-yt-isolated',
  main: 'sites-yt-main',
} as const

export const SITE_FILES = {
  youtubeCss: 'sites/youtube/youtube.css',
  isolatedJs: 'sites/scripts/yt-isolated.js',
  mainJs: 'sites/scripts/yt-main.js',
} as const

export const PAGE_CMD_KEY = '__toolboxYtCmd'
export const PAGE_EVT_KEY = '__toolboxYtEvt'

export const MAX_SCRUBBER_IMAGE_BYTES = 200_000
