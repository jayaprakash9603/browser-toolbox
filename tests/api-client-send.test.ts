import { beforeEach, describe, expect, it, vi } from 'vitest'

import { registerApiClientSendHandler } from '@/chrome/background/api-client-send'
import { API_CLIENT_DNR_RULE_ID } from '@/chrome/background/api-client-dnr'

type RuntimeListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void,
) => boolean | void

const messageListeners: RuntimeListener[] = []

const basePayload = {
  method: 'GET' as const,
  url: 'https://api.example.test/resource',
  headers: {},
  body: null,
  timeoutMs: 30_000,
  followRedirects: true,
  maxRedirects: 5,
  followOriginalHttpMethod: false,
  followAuthorizationHeader: false,
  removeRefererHeaderOnRedirect: false,
  sendCookies: false,
  enableSslVerification: false,
}

beforeEach(() => {
  messageListeners.length = 0
  vi.mocked(chrome.permissions.contains).mockResolvedValue(true as never)
  vi.spyOn(chrome.runtime.onMessage, 'addListener').mockImplementation((listener) => {
    messageListeners.push(listener as RuntimeListener)
  })
  Object.assign(chrome.runtime, { id: 'test-extension-id' })
  registerApiClientSendHandler()
})

function dispatchMessage(message: unknown): Promise<unknown> {
  const listener = messageListeners[messageListeners.length - 1]
  if (!listener) throw new Error('No API client message listener registered')
  return new Promise((resolve) => {
    const keepChannelOpen = listener(message, {} as chrome.runtime.MessageSender, (response) => {
      resolve(response)
    })
    if (!keepChannelOpen) {
      resolve(undefined)
    }
  })
}

describe('API_CLIENT_SEND handler', () => {
  it('registers a DNR bypass rule for extension-initiated requests', () => {
    expect(chrome.declarativeNetRequest.updateSessionRules).toHaveBeenCalledWith(
      expect.objectContaining({
        removeRuleIds: [API_CLIENT_DNR_RULE_ID],
        addRules: expect.arrayContaining([
          expect.objectContaining({
            id: API_CLIENT_DNR_RULE_ID,
            action: { type: 'allow' },
          }),
        ]),
      }),
    )
  })

  it('returns HTTP 500 with body instead of a generic transport error', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response('server fault', {
          status: 500,
          statusText: 'Internal Server Error',
        }),
      ),
    )

    const response = (await dispatchMessage({
      type: 'API_CLIENT_SEND',
      requestId: 'req-500',
      payload: basePayload,
    })) as { status?: number; error?: string; bodyText?: string }

    expect(response.status).toBe(500)
    expect(response.bodyText).toBe('server fault')
    expect(response.error).toBeUndefined()
  })

  it('rejects missing URLs before calling fetch', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    const response = (await dispatchMessage({
      type: 'API_CLIENT_SEND',
      payload: { ...basePayload, url: '' },
    })) as { error?: string }

    expect(response.error).toBe('Missing request URL')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('deserializes multipart bodies before fetch', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await dispatchMessage({
      type: 'API_CLIENT_SEND',
      requestId: 'req-form',
      payload: {
        ...basePayload,
        method: 'POST',
        headers: { 'content-type': 'multipart/form-data' },
        body: {
          kind: 'formData',
          entries: [{ name: 'field', value: 'hello' }],
        },
      },
    })

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit
    expect(init?.body).toBeInstanceOf(FormData)
    expect((init?.body as FormData).get('field')).toBe('hello')
  })

  it('aborts in-flight work when API_CLIENT_CANCEL is received', async () => {
    let abortSignal: AbortSignal | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn((_input: RequestInfo, init?: RequestInit) => {
        abortSignal = init?.signal ?? undefined
        return new Promise(() => undefined)
      }),
    )

    void dispatchMessage({
      type: 'API_CLIENT_SEND',
      requestId: 'req-cancel',
      payload: basePayload,
    })

    await vi.waitFor(() => expect(abortSignal).toBeDefined())
    expect(abortSignal?.aborted).toBe(false)

    const listener = messageListeners[messageListeners.length - 1]!
    listener(
      { type: 'API_CLIENT_CANCEL', requestId: 'req-cancel' },
      {} as chrome.runtime.MessageSender,
      () => undefined,
    )

    expect(abortSignal?.aborted).toBe(true)
  })

  it('maps fetch rejections to a classified message without HTTP status', async () => {
    vi.mocked(chrome.permissions.contains).mockResolvedValue(false as never)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')))

    const response = (await dispatchMessage({
      type: 'API_CLIENT_SEND',
      requestId: 'req-net',
      payload: basePayload,
    })) as { status?: number; error?: string }

    expect(response.status).toBeUndefined()
    expect(response.error).toMatch(/not granted|Network request failed/)
  })
})
