import type { InterceptorSettings } from './types'

/** Dynamic DNR rule IDs for HTTP Interceptor (after Web Protection ceiling). */
export const INTERCEPTOR_RULE_ID_BASE = 3_000_000
export const INTERCEPTOR_RULE_ID_MAX = 4_000_000
export const INTERCEPTOR_RULE_PRIORITY = 150

export const INTERCEPTOR_NETLOG_PORT = 'interceptor-netlog'
export const INTERCEPTOR_SESSION_LOG_KEY = 'interceptorNetLog'
export const INTERCEPTOR_PAGE_CONFIG_KEY = 'interceptorPageConfig'

export const DEFAULT_LOG_SIZE = 1000
export const MAX_LOG_SIZE = 5000
export const MAX_LIBRARY_ITEM_BYTES = 512_000

export const DEFAULT_INTERCEPTOR_SETTINGS: InterceptorSettings = {
  paused: false,
  logSize: DEFAULT_LOG_SIZE,
  deepIntercept: false,
  showPageToast: false,
  userScriptsEnabled: false,
}

export const CONTENT_SCRIPT_IDS = {
  isolated: 'interceptor-isolated',
  main: 'interceptor-main',
} as const

export const INTERCEPTOR_FILES = {
  isolatedJs: 'interceptor/scripts/isolated.js',
  mainJs: 'interceptor/scripts/main.js',
} as const

export const PAGE_MESSAGE_KEY = '__toolboxInterceptor'
export const PAGE_COMMAND_KEY = '__toolboxInterceptorCmd'

export const USER_AGENT_PRESETS: Record<string, string> = {
  chromeDesktop:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  chromeAndroid:
    'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36',
  safariIos:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  firefoxDesktop:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0',
}
