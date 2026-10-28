import type { CrawlOptions, CrawlProgress } from '@/core/engines/htmlArchive/crawl'
import type { BundlePhase, BundleStats, HtmlBundleJobRequest } from '@/core/htmlBundleJob'

export type ExtensionMessage =
  | { type: 'CONTENT_SCRIPT_PING' }
  | { type: 'GET_SELECTED_ELEMENT' }
  | { type: 'EXTRACT_PAGE_LINKS' }
  | { type: 'OPEN_TOOL'; toolId: string }
  | { type: 'OPEN_COMMAND_PALETTE' }
  | { type: 'CLIPBOARD_CAPTURE_REQUEST' }
  | { type: 'CLIPBOARD_WATCH'; active: boolean }
  | { type: 'CLIPBOARD_CAPTURED'; text: string }
  | { type: 'CONTEXT_MENU_ACTION'; actionId: string; selectionText?: string }
  | { type: 'PICK_ELEMENT_START' }
  | { type: 'PICK_ELEMENT_CANCEL' }
  | { type: 'GET_PAGE_INFO' }
  | { type: 'GET_SEO_DATA' }
  | { type: 'SEO_HIGHLIGHT'; kind: import('@/core/engines/seo/types').SeoHighlightKind }
  | { type: 'SEO_CLEAR_HIGHLIGHT' }
  | { type: 'SCAN_PAGE_IMAGES' }
  | { type: 'GET_STORAGE_SNAPSHOT' }
  | {
      type: 'STORAGE_WRITE'
      area: 'local' | 'session'
      op: 'set' | 'remove' | 'clear' | 'merge'
      key?: string
      value?: string
      entries?: Record<string, string>
    }
  | {
      type: 'START_IMAGE_DOWNLOAD_JOB'
      tabId: number
      pageUrl: string
      pageTitle: string
      mode: 'files' | 'zip'
      subfolder: string
      filenameTemplate: string
      zipFileName?: string
      /** Text files (e.g. a links manifest) added to the ZIP root; ignored in files mode. */
      zipExtraFiles?: { name: string; text: string }[]
      items: { url: string }[]
    }
  | { type: 'CANCEL_IMAGE_DOWNLOAD_JOB'; jobId: string }
  | { type: 'OFFSCREEN_ZIP_FROM_BYTES'; buildId: string; base64: string }
  | { type: 'CAPTURE_VISIBLE'; windowId?: number }
  | {
      type: 'SCAN_HTML_BUNDLE'
      htmlOnly?: boolean
      sameFolderOnly?: boolean
    }
  | {
      type: 'BUILD_HTML_BUNDLE'
      buildId: string
      includeCurrent: boolean
      selectedResolvedUrls: string[]
      includeAssets: boolean
      maxPages?: number
      maxBytes?: number
      crawl?: CrawlOptions
    }
  | { type: 'READ_HTML_BUNDLE_CHUNK'; buildId: string; index: number }
  | {
      type: 'HTML_BUNDLE_PROGRESS'
      buildId: string
      phase: BundlePhase
      done: number
      total: number
      crawl?: CrawlProgress
    }
  | {
      type: 'HTML_BUNDLE_READY'
      buildId: string
      stats: BundleStats
      size: number
      chunkCount: number
    }
  | { type: 'HTML_BUNDLE_FAILED'; buildId: string; error: string }
  | { type: 'CANCEL_HTML_BUNDLE'; buildId: string }
  | {
      type: 'START_HTML_BUNDLE_JOB'
      tabId: number
      pageUrl: string
      pageTitle: string
      fileName: string
      pageCount: number
      request: HtmlBundleJobRequest
    }
  | { type: 'CANCEL_HTML_BUNDLE_JOB'; jobId: string }
  | { type: 'STOP_HTML_BUNDLE_CRAWL'; buildId: string }
  | { type: 'STOP_HTML_BUNDLE_JOB'; jobId: string }
  | { type: 'OFFSCREEN_BUNDLE_CHUNK'; buildId: string; base64: string }
  | { type: 'OFFSCREEN_BUNDLE_FINALIZE'; buildId: string }
  | { type: 'OFFSCREEN_BUNDLE_RELEASE'; buildId: string }
  | { type: 'ADBLOCK_GET_TAB_STATS'; tabId?: number }
  | { type: 'ADBLOCK_RELOAD_TAB'; tabId?: number }
  | { type: 'ADBLOCK_COSMETIC_REPORT'; hidden?: number; youtube?: number }
  | { type: 'ADBLOCK_RESET_TOTALS' }
  | { type: 'PROTECTION_REPORT'; category: string; host: string; source?: string }
  | { type: 'PROTECTION_GET_STATS' }
  | { type: 'PROTECTION_PROCEED_ONCE'; url: string }
  | { type: 'PROTECTION_TRUST_SITE'; host: string }
  | { type: 'PROTECTION_RESET_STATS' }
  | { type: 'PROTECTION_GESTURE'; host?: string }
  | { type: 'PROTECTION_DOWNLOAD_DECISION'; id: number; keep: boolean }
  | { type: 'PROTECTION_ALLOW_OPENED_TAB'; url: string }
  | { type: 'YT_SPONSOR_SEGMENTS'; videoId: string; categories: string[] }
  | { type: 'YT_DISLIKES'; videoId: string }
  | { type: 'YT_DOWNLOAD_TRANSCRIPT'; videoId: string }
  | { type: 'WA_OPEN_PANEL' }
  | { type: 'WA_GET_STATUS' }
  | { type: 'WA_RUNTIME_STATUS'; status: string }
  | { type: 'WA_CACHE_MESSAGE'; payload?: unknown }
  | { type: 'WA_MESSAGE_REVOKED'; payload?: unknown }
  | { type: 'WA_PRESENCE'; payload?: unknown }
  | { type: 'WA_SMART_REPLY_CHECK'; payload?: unknown }
  | { type: 'WA_FIRE_WEBHOOK'; event: string; payload: unknown }
  | { type: 'WA_RUN_BROADCAST'; campaignId: string }
  | { type: 'WA_EXPORT'; kind: string }
  | {
      type: 'WA_EXPORT_CHAT'
      options: import('@/core/sites/whatsapp/chatExport').ChatExportOptions
    }
  | { type: 'WA_OPEN_ANALYTICS' }
  | { type: 'WA_TRANSLATE'; text: string; target: string }
  | {
      type: 'OFFSCREEN_IMAGE_CONVERT'
      base64: string
      sourceMime: string
      format: 'jpg' | 'png' | 'webp' | 'gif' | 'pdf'
      quality: number
      maxSize?: number
      background?: string
    }
  | { type: 'OFFSCREEN_IMAGE_RELEASE'; url: string }
  | { type: 'PIP_TOGGLE'; tabId?: number }
  | { type: 'COLOR_PICK_START' }
  | { type: 'COLOR_PICKED'; hex: string; format?: string; url?: string }
  | { type: 'FORM_MEMORY_CAPTURE'; url: string; title?: string; fields: unknown[] }
  | { type: 'FORM_MEMORY_RUN'; action: 'fill' | 'clear' | 'inspect' | 'save'; tabId?: number }
  | {
      type: 'NETMON_SAMPLE'
      status: import('@/core/netmon/types').NetStatus
      latency: number | null
      ip?: string
    }
  | { type: 'NETMON_OFFSCREEN_READY' }
  | { type: 'NETMON_GET_REALTIME' }
  | { type: 'NETMON_RESET_REALTIME' }
  | {
      type: 'NETMON_OFFSCREEN_CONFIG'
      enabled: boolean
      intervalSec: number
      pingUrl: string
      showIp: boolean
    }
  | {
      type: 'NETMON_OFFSCREEN_SOUND'
      sound: import('@/core/netmon/types').NetSoundId
      volume: number
    }
  | {
      type: 'SHORTCUT_KEY_EVENT'
      modifiers: { key: string; ctrl: boolean; alt: boolean; shift: boolean; meta: boolean }
    }
  | {
      type: 'INTERCEPTOR_PAGE_EVENT'
      tabId?: number
      event: import('@/core/interceptor').InterceptorPageEvent
    }
  | { type: 'INTERCEPTOR_GET_LOG'; tabId?: number }
  | { type: 'INTERCEPTOR_CLEAR_LOG'; tabId?: number }
  | {
      type: 'INTERCEPTOR_TEST_RULE'
      url: string
      pageUrl?: string
    }
  | { type: 'INTERCEPTOR_SYNC' }
  | { type: 'INTERCEPTOR_DEEP_ATTACH'; tabId: number }
  | { type: 'INTERCEPTOR_DEEP_DETACH'; tabId: number }
  | { type: 'GET_TECH_STACK' }
  | { type: 'GET_PAGE_SVGS' }
  | { type: 'SVG_TO_JSX'; markup: string }
  | { type: 'WIREFRAME_TOGGLE'; enabled: boolean }
  | { type: 'FONT_INSPECTOR_TOGGLE'; enabled: boolean }
  | {
      type: 'PAGE_INSPECTOR_SET'
      options: Partial<import('@/chrome/content/pageInspector/model').PageInspectorOptions>
      labels?: Record<string, string>
    }
  | { type: 'PAGE_INSPECTOR_GET' }
  | { type: 'PAGE_INSPECTOR_ACTION'; action: 'undo' | 'reset' | 'deselect' | 'export' }
  | { type: 'PAGE_INSPECTOR_STATE'; state: import('@/chrome/content/pageInspector/model').PageInspectorState }
  | { type: 'GET_READABLE_TEXT'; scope?: 'page' | 'selection' }
  | { type: 'GET_MARKDOWN_FROM_PAGE'; mode: 'selection' | 'article' }
  | {
      type: 'CHECK_HTTP_URLS'
      items: { href: string; text: string }[]
      options?: import('@/core/engines/linkChecker/check').LinkCheckRequestOptions
    }
  | { type: 'GET_PAGE_LINKS' }
  | { type: 'LOCATE_PAGE_LINK'; index: number; href: string }
  | { type: 'MARK_PAGE_LINKS'; marks: import('@/core/engines/linkChecker/report').PageLinkMark[] }
  | { type: 'CLEAR_PAGE_LINK_MARKS' }
  | { type: 'REDIRECT_TRACE_GET'; tabId?: number }
  | { type: 'REDIRECT_TRACE_CLEAR'; tabId?: number }
  | { type: 'SCRAPER_DETECT'; candidateIndex?: number }
  | { type: 'SCRAPER_EXTRACT'; config: import('@/core/scraper').ScrapeConfig }
  | { type: 'SCRAPER_HIGHLIGHT'; rowSelector: string; containerSelector?: string }
  | { type: 'SCRAPER_CLEAR' }
  | {
      type: 'SCRAPER_PICK_START'
      mode: import('@/core/scraper').ScraperPickMode
      rowSelector?: string
    }
  | { type: 'SCRAPER_PICK_CANCEL' }
  | { type: 'SCRAPER_SUGGEST_NEXT' }
  | { type: 'SCRAPER_ROW_COUNT'; rowSelector: string }
  | { type: 'SCRAPER_WAIT_DATA'; rowSelector: string; maxWaitMs: number }
  | { type: 'SCRAPER_NEXT'; selector: string; rowSelector: string; maxWaitMs: number }
  | { type: 'SCRAPER_SCROLL'; rowSelector: string; maxWaitMs: number }
  | {
      type: 'SCRAPER_JOB_START'
      tabId: number
      config: import('@/core/scraper').ScrapeConfig
      rows?: import('@/core/scraper').ScrapeRow[]
    }
  | { type: 'SCRAPER_JOB_STOP'; tabId: number }
  | { type: 'SCRAPER_JOB_GET'; tabId: number }
  | {
      type: 'SCREENSHOT_START'
      mode: import('@/core/screenshot/types').ScreenshotMode
      urls?: string[]
    }
  | { type: 'SCREENSHOT_GET_SESSION'; sessionId: string }
  | { type: 'SCREENSHOT_MENU_OPEN' }
  | { type: 'SCREENSHOT_BATCH_URLS'; urls: string[] }
  | {
      type: 'SCREENSHOT_PROGRESS'
      phase: string
      current: number
      total: number
    }
  | { type: 'SCREENSHOT_MENU_ACTION'; action: 'history' | 'options' }
  | { type: 'SCREENSHOT_SELECTION_SLICE' }
  | {
      type: 'RECORDER_START'
      source: import('@/core/recorder/types').RecordingSource
      settings: import('@/core/recorder/types').RecorderSettings
    }
  | { type: 'RECORDER_REQUEST_MIC' }
  | { type: 'RECORDER_MIC_RESULT'; granted: boolean }
  | { type: 'RECORDER_PAUSE' }
  | { type: 'RECORDER_RESUME' }
  | { type: 'RECORDER_STOP' }
  | { type: 'RECORDER_STATUS' }
  | { type: 'RECORDER_STARTED'; id: string }
  | { type: 'RECORDER_HEARTBEAT'; id: string }
  | { type: 'RECORDER_FINISHED'; id: string; error?: string }
  | { type: 'RECORDER_CONTROL'; id: string; action: 'pause' | 'resume' | 'stop' }
  | {
      type: 'OFFSCREEN_RECORDER_START'
      id: string
      streamId: string
      settings: import('@/core/recorder/types').RecorderSettings
      /** Capture immediately (the stream ID expires quickly) but start recording after this delay. */
      delayMs?: number
    }
  | { type: 'RECORDER_STATE'; session: import('@/core/recorder/types').RecorderSession | null }
  | { type: 'TIMER_RECONCILE' }
  | { type: 'SCRIPT_STUDIO_SYNC' }
  | { type: 'SCRIPT_STUDIO_PROBE' }
  | { type: 'SCRIPT_STUDIO_REQUEST_PERMISSION' }
  | { type: 'SCRIPT_STUDIO_GET_STATE' }
  | { type: 'SCRIPT_STUDIO_CHECK_UPDATES'; scriptIds?: string[] }
  | { type: 'SCRIPT_STUDIO_SET_GLOBAL'; enabled: boolean }

export type ExtensionMessageType = ExtensionMessage['type']

export type ExtensionResponse<T = unknown> = { ok: true; data: T } | { ok: false; error: string }

const MESSAGE_TYPES = new Set<ExtensionMessageType>([
  'CONTENT_SCRIPT_PING',
  'GET_SELECTED_ELEMENT',
  'EXTRACT_PAGE_LINKS',
  'OPEN_TOOL',
  'OPEN_COMMAND_PALETTE',
  'CLIPBOARD_CAPTURE_REQUEST',
  'CLIPBOARD_WATCH',
  'CLIPBOARD_CAPTURED',
  'CONTEXT_MENU_ACTION',
  'PICK_ELEMENT_START',
  'PICK_ELEMENT_CANCEL',
  'GET_PAGE_INFO',
  'GET_SEO_DATA',
  'SEO_HIGHLIGHT',
  'SEO_CLEAR_HIGHLIGHT',
  'SCAN_PAGE_IMAGES',
  'GET_STORAGE_SNAPSHOT',
  'STORAGE_WRITE',
  'START_IMAGE_DOWNLOAD_JOB',
  'CANCEL_IMAGE_DOWNLOAD_JOB',
  'OFFSCREEN_ZIP_FROM_BYTES',
  'CAPTURE_VISIBLE',
  'SCAN_HTML_BUNDLE',
  'BUILD_HTML_BUNDLE',
  'READ_HTML_BUNDLE_CHUNK',
  'HTML_BUNDLE_PROGRESS',
  'HTML_BUNDLE_READY',
  'HTML_BUNDLE_FAILED',
  'CANCEL_HTML_BUNDLE',
  'START_HTML_BUNDLE_JOB',
  'CANCEL_HTML_BUNDLE_JOB',
  'STOP_HTML_BUNDLE_CRAWL',
  'STOP_HTML_BUNDLE_JOB',
  'OFFSCREEN_BUNDLE_CHUNK',
  'OFFSCREEN_BUNDLE_FINALIZE',
  'OFFSCREEN_BUNDLE_RELEASE',
  'ADBLOCK_GET_TAB_STATS',
  'ADBLOCK_RELOAD_TAB',
  'ADBLOCK_COSMETIC_REPORT',
  'ADBLOCK_RESET_TOTALS',
  'PROTECTION_REPORT',
  'PROTECTION_GET_STATS',
  'PROTECTION_PROCEED_ONCE',
  'PROTECTION_TRUST_SITE',
  'PROTECTION_RESET_STATS',
  'PROTECTION_GESTURE',
  'PROTECTION_DOWNLOAD_DECISION',
  'PROTECTION_ALLOW_OPENED_TAB',
  'YT_SPONSOR_SEGMENTS',
  'YT_DISLIKES',
  'YT_DOWNLOAD_TRANSCRIPT',
  'WA_OPEN_PANEL',
  'WA_GET_STATUS',
  'WA_RUNTIME_STATUS',
  'WA_CACHE_MESSAGE',
  'WA_MESSAGE_REVOKED',
  'WA_PRESENCE',
  'WA_SMART_REPLY_CHECK',
  'WA_FIRE_WEBHOOK',
  'WA_RUN_BROADCAST',
  'WA_EXPORT',
  'WA_EXPORT_CHAT',
  'WA_OPEN_ANALYTICS',
  'WA_TRANSLATE',
  'OFFSCREEN_IMAGE_CONVERT',
  'OFFSCREEN_IMAGE_RELEASE',
  'PIP_TOGGLE',
  'COLOR_PICK_START',
  'COLOR_PICKED',
  'FORM_MEMORY_CAPTURE',
  'FORM_MEMORY_RUN',
  'NETMON_SAMPLE',
  'NETMON_OFFSCREEN_READY',
  'NETMON_GET_REALTIME',
  'NETMON_RESET_REALTIME',
  'NETMON_OFFSCREEN_CONFIG',
  'NETMON_OFFSCREEN_SOUND',
  'SHORTCUT_KEY_EVENT',
  'INTERCEPTOR_PAGE_EVENT',
  'INTERCEPTOR_GET_LOG',
  'INTERCEPTOR_CLEAR_LOG',
  'INTERCEPTOR_TEST_RULE',
  'INTERCEPTOR_SYNC',
  'INTERCEPTOR_DEEP_ATTACH',
  'INTERCEPTOR_DEEP_DETACH',
  'GET_TECH_STACK',
  'GET_PAGE_SVGS',
  'SVG_TO_JSX',
  'WIREFRAME_TOGGLE',
  'FONT_INSPECTOR_TOGGLE',
  'PAGE_INSPECTOR_SET',
  'PAGE_INSPECTOR_GET',
  'PAGE_INSPECTOR_ACTION',
  'PAGE_INSPECTOR_STATE',
  'GET_READABLE_TEXT',
  'GET_MARKDOWN_FROM_PAGE',
  'CHECK_HTTP_URLS',
  'GET_PAGE_LINKS',
  'LOCATE_PAGE_LINK',
  'MARK_PAGE_LINKS',
  'CLEAR_PAGE_LINK_MARKS',
  'REDIRECT_TRACE_GET',
  'REDIRECT_TRACE_CLEAR',
  'SCRAPER_DETECT',
  'SCRAPER_EXTRACT',
  'SCRAPER_HIGHLIGHT',
  'SCRAPER_CLEAR',
  'SCRAPER_PICK_START',
  'SCRAPER_PICK_CANCEL',
  'SCRAPER_SUGGEST_NEXT',
  'SCRAPER_ROW_COUNT',
  'SCRAPER_WAIT_DATA',
  'SCRAPER_NEXT',
  'SCRAPER_SCROLL',
  'SCRAPER_JOB_START',
  'SCRAPER_JOB_STOP',
  'SCRAPER_JOB_GET',
  'SCREENSHOT_START',
  'SCREENSHOT_GET_SESSION',
  'SCREENSHOT_MENU_OPEN',
  'SCREENSHOT_BATCH_URLS',
  'SCREENSHOT_PROGRESS',
  'SCREENSHOT_MENU_ACTION',
  'SCREENSHOT_SELECTION_SLICE',
  'RECORDER_START',
  'RECORDER_REQUEST_MIC',
  'RECORDER_MIC_RESULT',
  'RECORDER_PAUSE',
  'RECORDER_RESUME',
  'RECORDER_STOP',
  'RECORDER_STATUS',
  'RECORDER_STARTED',
  'RECORDER_HEARTBEAT',
  'RECORDER_FINISHED',
  'RECORDER_CONTROL',
  'OFFSCREEN_RECORDER_START',
  'RECORDER_STATE',
  'TIMER_RECONCILE',
  'SCRIPT_STUDIO_SYNC',
  'SCRIPT_STUDIO_PROBE',
  'SCRIPT_STUDIO_REQUEST_PERMISSION',
  'SCRIPT_STUDIO_GET_STATE',
  'SCRIPT_STUDIO_CHECK_UPDATES',
  'SCRIPT_STUDIO_SET_GLOBAL',
])

export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string' &&
    MESSAGE_TYPES.has((value as { type: string }).type as ExtensionMessageType)
  )
}
