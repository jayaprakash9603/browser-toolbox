export const YOUTUBE_COSMETIC_SELECTORS = [
  'ytd-ad-slot-renderer',
  'ytd-banner-promo-renderer',
  'ytd-display-ad-renderer',
  'ytd-promoted-sparkles-web-renderer',
  'ytd-promoted-sparkles-text-search-renderer',
  'ytd-promoted-video-renderer',
  'ytd-compact-promoted-video-renderer',
  'ytd-in-feed-ad-layout-renderer',
  'ytd-search-pyv-renderer',
  'ytd-video-masthead-ad-v3-renderer',
  'ytd-primetime-promo-renderer',
  'ytd-statement-banner-renderer',
  'ytd-rich-item-renderer:has(> #content > ytd-ad-slot-renderer)',
  'ytd-rich-section-renderer:has(ytd-statement-banner-renderer)',
  'ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
  'ytd-merch-shelf-renderer',
  'ytd-player-legacy-desktop-watch-ads-renderer',
  'ytd-enforcement-message-view-model',
  'tp-yt-paper-dialog:has(> ytd-enforcement-message-view-model)',
  '#masthead-ad',
  '#player-ads',
  '#panels > ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
  '.ytp-ad-overlay-slot',
  '.ytp-ad-overlay-container',
  '.ytp-ad-image-overlay',
  '.ytp-suggested-action-badge',
  '.ytd-companion-slot-renderer',
  'ytm-promoted-sparkles-web-renderer',
  'ytm-companion-ad-renderer',
  'ad-slot-renderer',
] as const

export const YOUTUBE_AD_PLAYER_CLASSES = ['ad-showing', 'ad-interrupting'] as const

export const YOUTUBE_AD_UI_SELECTORS = [
  '.ytp-ad-player-overlay',
  '.ytp-ad-player-overlay-layout',
  '.ytp-ad-text',
  '.ytp-ad-preview-container',
  '.ytp-ad-simple-ad-badge',
  '.video-ads .ytp-ad-module > *',
] as const

export const YOUTUBE_SKIP_BUTTON_SELECTORS = [
  '.ytp-ad-skip-button',
  '.ytp-ad-skip-button-modern',
  '.ytp-skip-ad-button',
  'button.ytp-ad-skip-button-modern',
  '.ytp-ad-button-icon',
  'button.ytp-ad-skip-button-slot',
  '.video-ads .ytp-ad-skip-button-container button',
] as const
