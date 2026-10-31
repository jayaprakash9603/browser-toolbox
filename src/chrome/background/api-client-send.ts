import type { ApiClientResponse, ApiClientSendPayload } from 'postman-lite'
import { deserializeBodyFromTransport, executeHttpRequest } from 'postman-lite/core'

import { createLogger } from '@/core/logging'

const logger = createLogger('api-client-send')

const inFlight = new Map<string, AbortController>()

function messageType(message: unknown): string | undefined {
  if (typeof message !== 'object' || message === null) return undefined
  return (message as { type?: string }).type
}

async function runRequest(
  requestId: string | undefined,
  payload: ApiClientSendPayload,
): Promise<ApiClientResponse> {
  const controller = new AbortController()
  if (requestId) inFlight.set(requestId, controller)
  try {
    const body = deserializeBodyFromTransport(payload.body)
    return await executeHttpRequest(fetch, { ...payload, body }, { signal: controller.signal })
  } catch (error) {
    logger.warn('API_CLIENT_SEND failed', error)
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  } finally {
    if (requestId) inFlight.delete(requestId)
  }
}

export function registerApiClientSendHandler(): void {
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const type = messageType(message)

    if (type === 'API_CLIENT_CANCEL') {
      const { requestId } = message as { requestId?: string }
      if (requestId) inFlight.get(requestId)?.abort()
      return false
    }

    if (type !== 'API_CLIENT_SEND') return false

    const { requestId, payload } = message as { requestId?: string; payload: ApiClientSendPayload }
    if (!payload?.url) {
      sendResponse({ ok: false, error: 'Missing request URL' } satisfies ApiClientResponse)
      return true
    }
    if (!(payload.timeoutMs > 0)) payload.timeoutMs = 30_000
    void runRequest(requestId, payload).then(sendResponse)
    return true
  })
}
