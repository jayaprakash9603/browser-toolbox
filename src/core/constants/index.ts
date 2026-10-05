export const STORAGE_VERSION = 1

export const STORAGE_KEYS = {
  settings: 'settings',
  favorites: 'favorites',
  recentTools: 'recentTools',
  clipboardHistory: 'clipboardHistory',
  meta: 'meta',
} as const

export const APP_NAME = 'Browser Toolbox'

export const MAX_RECENT_TOOLS = 8
export const DEFAULT_CLIPBOARD_HISTORY_LIMIT = 100
export const MAX_CLIPBOARD_HISTORY_LIMIT = 1000
