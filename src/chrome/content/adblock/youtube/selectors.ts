/**
 * Not `#player-ads`: uBO explicitly un-hides it (`youtube.com#@##player-ads`) because YouTube
 * treats a hidden companion slot as an ad blocker.
 */
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
  '#masthead-ad',
  '#panels > ytd-engagement-panel-section-list-renderer[target-id="engagement-panel-ads"]',
  '.ytp-ad-overlay-slot',
  '.ytp-ad-overlay-container',
  '.ytp-ad-image-overlay',
  '.ytp-suggested-action-badge',
  'ytm-promoted-sparkles-web-renderer',
  'ytm-companion-ad-renderer',
  'ad-slot-renderer',
  // "Experiencing interruptions? Find out why." toast and snackbar (uBO quick fixes).
  '#toast:has(> #text-container > yt-formatted-string#text.yt-notification-action-renderer)',
  'tp-yt-paper-toast:has(a[href*="check_ad_blockers"])',
  'yt-notification-action-renderer:has(a[href*="check_ad_blockers"])',
  '.ytSnackbarContainerOpened:has(> .snackbarViewModelSwipeable > .snackbarViewModelEngagementBarWrapper .ytAttributedStringWhiteSpacePreWrap[style])',
] as const
