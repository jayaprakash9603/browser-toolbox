import type { BundleStats, HtmlBundleJobRequest } from '@/core/htmlBundleJob'

export type ExtensionMessage =
  | { type: 'CONTENT_SCRIPT_PING' }
  | { type: 'GET_SELECTED_ELEMENT' }
  | { type: 'EXTRACT_PAGE_LINKS' }
  | { type: 'OPEN_TOOL'; toolId: string }
  | { type: 'OPEN_COMMAND_PALETTE' }
  | { type: 'CLIPBOARD_CAPTURE_REQUEST' }
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
      type: 'START_IMAGE_DOWNLOAD_JOB'
      tabId: number
      pageUrl: string
      pageTitle: string
      mode: 'files' | 'zip'
      subfolder: string
      filenameTemplate: string
      zipFileName?: string
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
    }
  | { type: 'READ_HTML_BUNDLE_CHUNK'; buildId: string; index: number }
  | {
      type: 'HTML_BUNDLE_PROGRESS'
      buildId: string
      phase: 'pages' | 'assets' | 'zip' | 'transfer'
      done: number
      total: number
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
  | { type: 'WA_EXPORT_CHAT'; options: import('@/core/sites/whatsapp/chatExport').ChatExportOptions }
  | { type: 'WA_OPEN_ANALYTICS' }
  | { type: 'WA_TRANSLATE'; text: string; target: string }
  | {
      type: 'OFFSCREEN_IMAGE_CONVERT'
      base64: string
      sourceMime: string
      format: 'jpg' | 'png' | 'webp' | 'gif' | 'pdf'
      quality: number
    }
  | { type: 'OFFSCREEN_IMAGE_RELEASE'; url: string }
  | { type: 'PIP_TOGGLE'; tabId?: number }
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
  | { type: 'NETMON_OFFSCREEN_SOUND'; sound: import('@/core/netmon/types').NetSoundId; volume: number }
  | { type: 'SHORTCUT_KEY_EVENT'; modifiers: { key: string; ctrl: boolean; alt: boolean; shift: boolean; meta: boolean } }
  | { type: 'INTERCEPTOR_PAGE_EVENT'; tabId?: number; event: import('@/core/interceptor').InterceptorPageEvent }
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
  | { type: 'GET_READABLE_TEXT' }
  | { type: 'GET_MARKDOWN_FROM_PAGE'; mode: 'selection' | 'article' }
  | { type: 'CHECK_HTTP_URLS'; items: { href: string; text: string }[] }
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

export type ExtensionMessageType = ExtensionMessage['type']

export type ExtensionResponse<T = unknown> = { ok: true; data: T } | { ok: false; error: string }

const MESSAGE_TYPES = new Set<ExtensionMessageType>([
  'CONTENT_SCRIPT_PING',
  'GET_SELECTED_ELEMENT',
  'EXTRACT_PAGE_LINKS',
  'OPEN_TOOL',
  'OPEN_COMMAND_PALETTE',
  'CLIPBOARD_CAPTURE_REQUEST',
  'CONTEXT_MENU_ACTION',
  'PICK_ELEMENT_START',
  'PICK_ELEMENT_CANCEL',
  'GET_PAGE_INFO',
  'GET_SEO_DATA',
  'SEO_HIGHLIGHT',
  'SEO_CLEAR_HIGHLIGHT',
  'SCAN_PAGE_IMAGES',
  'GET_STORAGE_SNAPSHOT',
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
  'GET_READABLE_TEXT',
  'GET_MARKDOWN_FROM_PAGE',
  'CHECK_HTTP_URLS',
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
])

export function isExtensionMessage(value: unknown): value is ExtensionMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string' &&
    MESSAGE_TYPES.has((value as { type: string }).type as ExtensionMessageType)
  )
}
