import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  MAX_RESPONSE_BYTES,
  parseRequestHeaders,
  parseRequestUrl,
  redactJsonSecrets,
  redactResponseHeaders,
  sendHttpRequest,
} from '@/core/network/httpClient'

describe('HTTP request client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(chrome.permissions.contains).mockResolvedValue(true as never)
  })

  it('accepts HTTP(S) URLs but rejects embedded credentials and other schemes', () => {
    expect(parseRequestUrl('http://localhost:3000/health').hostname).toBe('localhost')
    expect(() => parseRequestUrl('file:///private/data')).toThrow(/HTTP or HTTPS/)
    expect(() => parseRequestUrl('https://user:secret@example.com')).toThrow(/credentials/)
  })

  it('parses headers as string-valued JSON', () => {
    expect(parseRequestHeaders('{"Accept":"application/json"}').get('accept')).toBe(
      'application/json',
    )
    expect(() => parseRequestHeaders('[]')).toThrow(/JSON object/)
    expect(() => parseRequestHeaders('{"x-count":1}')).toThrow(/string/)
  })

  it('requires the selected host permission before making a request', async () => {
    vi.mocked(chrome.permissions.contains).mockResolvedValueOnce(false as never)
    const fetcher = vi.fn() as unknown as typeof fetch

    await expect(
      sendHttpRequest(
        { url: 'https://api.example.com', method: 'GET', headers: new Headers(), body: '' },
        fetcher,
      ),
    ).rejects.toThrow(/Grant access/)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('sends a request and returns response metadata and text', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response('{"ok":true}', {
        status: 201,
        headers: { 'content-type': 'application/json', 'x-request-id': 'abc' },
      }),
    ) as unknown as typeof fetch

    const response = await sendHttpRequest(
      {
        url: 'https://api.example.com/v1',
        method: 'POST',
        headers: new Headers({ 'content-type': 'application/json' }),
        body: '{"name":"Ada"}',
      },
      fetcher,
    )

    expect(response).toMatchObject({
      status: 201,
      body: '{"ok":true}',
      headers: { 'x-request-id': 'abc' },
    })
    expect(fetcher).toHaveBeenCalledWith(
      new URL('https://api.example.com/v1'),
      expect.objectContaining({ method: 'POST', body: '{"name":"Ada"}' }),
    )
  })

  it('rejects a GET body before fetching', async () => {
    const fetcher = vi.fn() as unknown as typeof fetch

    await expect(
      sendHttpRequest(
        { url: 'https://api.example.com', method: 'GET', headers: new Headers(), body: 'data' },
        fetcher,
      ),
    ).rejects.toThrow(/cannot include a body/)
    expect(fetcher).not.toHaveBeenCalled()
  })

  it('limits response size', async () => {
    const fetcher = vi.fn().mockResolvedValue(
      new Response('x'.repeat(MAX_RESPONSE_BYTES + 1)),
    ) as unknown as typeof fetch

    await expect(
      sendHttpRequest(
        { url: 'https://api.example.com', method: 'GET', headers: new Headers(), body: '' },
        fetcher,
      ),
    ).rejects.toThrow(/1 MiB limit/)
  })

  it('redacts sensitive fields from JSON responses', () => {
    expect(redactJsonSecrets('{"profile":{"name":"Ada","access_token":"abc"}}')).toBe(
      '{\n  "profile": {\n    "name": "Ada",\n    "access_token": "[REDACTED]"\n  }\n}',
    )
    expect(redactJsonSecrets('plain text')).toBe('plain text')
    expect(redactResponseHeaders({ 'x-api-key': 'secret', 'content-type': 'text/plain' })).toEqual({
      'x-api-key': '[REDACTED]',
      'content-type': 'text/plain',
    })
  })

  it('aborts requests that exceed the timeout', async () => {
    const fetcher = vi.fn(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
        }),
    ) as unknown as typeof fetch

    await expect(
      sendHttpRequest(
        { url: 'https://api.example.com', method: 'GET', headers: new Headers(), body: '' },
        fetcher,
        5,
      ),
    ).rejects.toThrow(/timed out/)
  })
})