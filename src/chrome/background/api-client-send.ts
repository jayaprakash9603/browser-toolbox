import type { ApiClientResponse, ApiClientSendPayload } from 'postman-lite'
import { executeHttpRequest } from 'postman-lite/core'

import { createLogger } from '@/core/logging'

const logger = createLogger('api-client-send')

export function registerApiClientSendHandler(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (
      typeof message !== 'object' ||
      message === null ||
      (message as { type?: string }).type !== 'API_CLIENT_SEND'
    ) {
      return false
    }

    const payload = (message as { payload: ApiClientSendPayload }).payload
    if (!payload?.url) {
      sendResponse({ ok: false, error: 'Missing request URL' } satisfies ApiClientResponse)
      return true
    }
    if (!(payload.timeoutMs > 0)) payload.timeoutMs = 30_000
    void (async () => {
      try {
        const response = await executeHttpRequest(fetch, payload)
        sendResponse(response)
      } catch (error) {
        logger.warn('API_CLIENT_SEND failed', error)
        sendResponse({
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        } satisfies ApiClientResponse)
      }
    })()

    return true
  })
}
