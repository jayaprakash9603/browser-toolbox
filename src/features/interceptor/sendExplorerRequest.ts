import type { ApiClientResponse, ApiClientSendPayload } from 'postman-lite'
import { serializeBodyForTransport } from 'postman-lite/core'

import { buildExplorerWireRequest, validateExplorerDraft } from '@/core/interceptor/apiExplorer'
import type { ExplorerDraft } from '@/core/interceptor/apiFinderTypes'
import { requestHostAccess } from '@/core/permissions/originPermissions'

export async function sendExplorerRequest(draft: ExplorerDraft, signal?: AbortSignal): Promise<ApiClientResponse> {
  const invalid = validateExplorerDraft(draft)
  if (invalid) return { ok: false, error: invalid }
  const wire = buildExplorerWireRequest(draft)
  const granted = await requestHostAccess(wire.url)
  if (signal?.aborted) return { ok: false, error: 'Request cancelled' }
  if (!granted) {
    return { ok: false, error: 'Access to this host was not granted. Allow it, then send again.' }
  }
  const body = (await serializeBodyForTransport(wire.body)) as ApiClientSendPayload['body']
  const payload: ApiClientSendPayload = {
    method: wire.method,
    url: wire.url,
    headers: wire.headers,
    body,
    timeoutMs: wire.timeoutMs,
    followRedirects: true,
    maxRedirects: 5,
    followOriginalHttpMethod: false,
    followAuthorizationHeader: false,
    removeRefererHeaderOnRedirect: false,
    sendCookies: wire.sendCookies,
    enableSslVerification: false,
  }
  const requestId = crypto.randomUUID()
  return await new Promise((resolve) => {
    const onAbort = () => {
      void chrome.runtime.sendMessage({ type: 'API_CLIENT_CANCEL', requestId })
      resolve({ ok: false, error: 'Request cancelled' })
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    chrome.runtime.sendMessage(
      { type: 'API_CLIENT_SEND', requestId, payload },
      (response: ApiClientResponse | undefined) => {
        signal?.removeEventListener('abort', onAbort)
        if (chrome.runtime.lastError) {
          resolve({ ok: false, error: chrome.runtime.lastError.message ?? 'Message failed' })
          return
        }
        resolve(response ?? { ok: false, error: 'No response from background' })
      },
    )
  })
}
