import type { ApiClientResponse, ApiClientSendPayload } from 'postman-lite'
import {
  deserializeBodyFromTransport,
  executeHttpRequest,
  preferWireResponseHeaders,
  type FetchFn,
} from 'postman-lite/core'

import { createLogger } from '@/core/logging'
import {
  getHostPermissionPattern,
  hasHostAccess,
} from '@/core/permissions/originPermissions'

import { ensureApiClientDnrBypass } from './api-client-dnr'
import {
  initApiClientResponseHeaderCapture,
  registerApiClientHeaderCapture,
  takeApiClientCapturedHeaders,
} from './api-client-response-headers'
import { classifyWorkerFetchError, sanitizeWorkerFetchInit } from './worker-fetch-init'

const logger = createLogger('api-client-send')

const inFlight = new Map<string, AbortController>()

function messageType(message: unknown): string | undefined {
  if (typeof message !== 'object' || message === null) return undefined
  return (message as { type?: string }).type
}

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  if (input instanceof Request) return input.url
  return String(input)
}

function permissionDeniedMessage(url: string): string | null {
  const pattern = getHostPermissionPattern(url)
  if (!pattern) return null
  const label = pattern.replace(/\/\*$/, '')
  return `Access to ${label} was not granted. Allow it, then send again.`
}

async function assertHostAccessForUrl(url: string): Promise<void> {
  const pattern = getHostPermissionPattern(url)
  if (!pattern) return
  if (!(await hasHostAccess(url))) {
    const message = permissionDeniedMessage(url)
    throw new TypeError(message ?? 'Host access was not granted.')
  }
}

function createPermissionAwareFetch(): FetchFn {
  return async (input, init) => {
    const url = requestUrl(input)
    await assertHostAccessForUrl(url)
    try {
      return await fetch(input, sanitizeWorkerFetchInit(init))
    } catch (error) {
      if (error instanceof TypeError && /failed to fetch/i.test(error.message)) {
        const denied = permissionDeniedMessage(url)
        if (denied && !(await hasHostAccess(url))) {
          throw new TypeError(denied, { cause: error })
        }
        throw new TypeError(
          'Network request failed. Confirm host access, TLS, and that blockers are not stopping this URL.',
          { cause: error },
        )
      }
      throw classifyWorkerFetchError(error, url)
    }
  }
}

function prepareSendPayload(payload: ApiClientSendPayload): ApiClientSendPayload {
  return {
    ...payload,
    body: deserializeBodyFromTransport(payload.body) as ApiClientSendPayload['body'],
  }
}

async function runRequest(
  requestId: string | undefined,
  payload: ApiClientSendPayload,
): Promise<ApiClientResponse> {
  await ensureApiClientDnrBypass()
  const controller = new AbortController()
  if (requestId) inFlight.set(requestId, controller)
  const prepared = prepareSendPayload(payload)
  const fetchFn = createPermissionAwareFetch()
  try {
    if (requestId) {
      await registerApiClientHeaderCapture(requestId, prepared.url, prepared.method)
    }
    const response = await executeHttpRequest(fetchFn, prepared, { signal: controller.signal })
    if (!requestId || !response.headers) return response
    const wireHeaders = takeApiClientCapturedHeaders(requestId)
    if (!wireHeaders) return response
    return {
      ...response,
      headers: preferWireResponseHeaders(response.headers, wireHeaders),
    }
  } catch (error) {
    logger.warn('API_CLIENT_SEND failed', error)
    return { ok: false, error: error instanceof Error ? error.message : String(error) }
  } finally {
    if (requestId) inFlight.delete(requestId)
  }
}

export function registerApiClientSendHandler(): void {
  void ensureApiClientDnrBypass()
  initApiClientResponseHeaderCapture()
  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    const type = messageType(message)

    if (type === 'API_CLIENT_CANCEL') {
      const { requestId } = message as { requestId?: string }
      if (requestId) {
        inFlight.get(requestId)?.abort()
        inFlight.delete(requestId)
      }
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
