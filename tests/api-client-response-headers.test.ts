import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  initApiClientResponseHeaderCapture,
  registerApiClientHeaderCapture,
  resetApiClientResponseHeaderCaptureForTests,
  takeApiClientCapturedHeaders,
} from '@/chrome/background/api-client-response-headers'

type WebRequestListener<T> = (details: T) => void

const webRequestBeforeRequest: WebRequestListener<chrome.webRequest.OnBeforeRequestDetails>[] =
  []
const webRequestHeadersReceived: WebRequestListener<chrome.webRequest.OnHeadersReceivedDetails>[] =
  []

const url = 'https://api.example.test/resource'

beforeEach(() => {
  webRequestBeforeRequest.length = 0
  webRequestHeadersReceived.length = 0
  resetApiClientResponseHeaderCaptureForTests()
  Object.assign(chrome, {
    webRequest: {
      onBeforeRequest: {
        addListener: vi.fn((listener: WebRequestListener<chrome.webRequest.OnBeforeRequestDetails>) => {
          webRequestBeforeRequest.push(listener)
        }),
      },
      onHeadersReceived: {
        addListener: vi.fn(
          (listener: WebRequestListener<chrome.webRequest.OnHeadersReceivedDetails>) => {
            webRequestHeadersReceived.push(listener)
          },
        ),
      },
      onCompleted: { addListener: vi.fn() },
      onErrorOccurred: { addListener: vi.fn() },
    },
  })
  vi.mocked(chrome.permissions.contains).mockResolvedValue(true as never)
  initApiClientResponseHeaderCapture()
})

describe('api-client-response-headers', () => {
  it('stores raw response headers from webRequest for a correlated request', async () => {
    await registerApiClientHeaderCapture('req-1', url, 'GET')

    const chromeRequestId = '7'
    for (const listener of webRequestBeforeRequest) {
      listener({
        tabId: -1,
        requestId: chromeRequestId,
        url,
        method: 'GET',
      } as unknown as chrome.webRequest.OnBeforeRequestDetails)
    }
    for (const listener of webRequestHeadersReceived) {
      listener({
        requestId: chromeRequestId,
        responseHeaders: [
          { name: 'Set-Cookie', value: 'a=1' },
          { name: 'Set-Cookie', value: 'b=2' },
          { name: 'x-amzn-RequestId', value: 'wire-id' },
        ],
      } as unknown as chrome.webRequest.OnHeadersReceivedDetails)
    }

    const rows = takeApiClientCapturedHeaders('req-1')
    expect(rows).toEqual([
      ['Set-Cookie', 'a=1'],
      ['Set-Cookie', 'b=2'],
      ['x-amzn-RequestId', 'wire-id'],
    ])
  })
})
