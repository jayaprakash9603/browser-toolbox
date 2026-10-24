export const INSTAGRAM_MATCHES = ['*://*.instagram.com/*', '*://instagram.com/*']

export const CONTENT_SCRIPT_IDS = {
  isolated: 'sites-ig-isolated',
  main: 'sites-ig-main',
} as const

export const SITE_FILES = {
  instagramCss: 'sites/instagram/instagram.css',
  isolatedJs: 'sites/scripts/ig-isolated.js',
  mainJs: 'sites/scripts/ig-main.js',
} as const

/** Page-world bridge. Keep these off the extension barrel so the page script stays small. */
export const PAGE_CMD_KEY = '__toolboxIgCmd'
export const PAGE_EVT_KEY = '__toolboxIgEvt'

export const INSTAGRAM_GHOST_STORY_RULE_ID = 91001
