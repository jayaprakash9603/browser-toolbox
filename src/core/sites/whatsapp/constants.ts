export const WHATSAPP_MATCHES = ['*://web.whatsapp.com/*']

export const CONTENT_SCRIPT_IDS = {
  isolated: 'sites-wa-isolated',
  main: 'sites-wa-main',
} as const

export const SITE_FILES = {
  whatsappCss: 'sites/whatsapp/whatsapp.css',
  waVendorJs: 'sites/vendor/wppconnect-wa.js',
  isolatedJs: 'sites/scripts/wa-isolated.js',
  mainJs: 'sites/scripts/wa-main.js',
} as const

export const PAGE_CMD_KEY = '__toolboxWaCmd'
export const PAGE_EVT_KEY = '__toolboxWaEvt'

export const MAX_CHAT_BACKGROUND_BYTES = 500_000
export const BROADCAST_DELAY_MIN_SEC = 8
export const BROADCAST_DELAY_MAX_SEC = 20
export const BROADCAST_DAILY_CAP_DEFAULT = 50
export const BROADCAST_DAILY_CAP_MIN = 10
