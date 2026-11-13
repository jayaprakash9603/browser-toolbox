import { describe, expect, it } from 'vitest'

import {
  applyEnabledParams,
  buildExplorerWireRequest,
  draftFromCapture,
  isMutatingMethod,
  newKv,
  sanitizeDraftForSave,
  validateExplorerDraft,
} from '@/core/interceptor/apiExplorer'
import type { CaptureRecord, ExplorerDraft } from '@/core/interceptor/apiFinderTypes'

const capture: CaptureRecord = {
  id: 'row-1',
  method: 'POST',
  url: 'https://api.example.com/users?active=1',
  requestHeaders: [
    { name: 'Content-Type', value: 'application/json' },
    { name: 'Authorization', value: 'Bearer abc' },
    { name: 'Host', value: 'api.example.com' },
  ],
  requestBody: '{"name":"Ada"}',
}

function draft(partial: Partial<ExplorerDraft> = {}): ExplorerDraft {
  return {
    id: 'd1',
    method: 'GET',
    url: 'https://api.example.com/users',
    params: [],
    headers: [],
    auth: { type: 'none' },
    bodyMode: 'none',
    bodyText: '',
    formFields: [],
    cookies: [],
    sendCookies: false,
    timeoutMs: 30_000,
    ...partial,
  }
}

describe('explorer draft', () => {
  it('builds a draft from captured traffic and drops forbidden headers', () => {
    const built = draftFromCapture(capture)
    expect(built.method).toBe('POST')
    expect(built.params[0]).toMatchObject({ key: 'active', value: '1' })
    expect(built.bodyMode).toBe('json')
    expect(built.auth).toEqual({ type: 'bearer', token: 'abc' })
    expect(built.headers.some((header) => header.key.toLowerCase() === 'host')).toBe(false)
  })

  it('updates the URL when params change', () => {
    expect(applyEnabledParams('https://api.example.com/users', [newKv('q', '1')])).toBe(
      'https://api.example.com/users?q=1',
    )
    expect(applyEnabledParams('https://api.example.com/users', [{ ...newKv('q', '1'), enabled: false }])).toBe(
      'https://api.example.com/users',
    )
  })

  it('validates URL, method, and JSON', () => {
    expect(validateExplorerDraft(draft({ url: 'not-a-url' }))).toMatch(/valid absolute URL/i)
    expect(validateExplorerDraft(draft({ bodyMode: 'json', bodyText: '{bad' }))).toMatch(/JSON|position|line/i)
    expect(validateExplorerDraft(draft())).toBeNull()
  })

  it('applies bearer auth and strips Host / Content-Length', () => {
    const wire = buildExplorerWireRequest(
      draft({
        method: 'POST',
        auth: { type: 'bearer', token: 'tok' },
        headers: [newKv('Host', 'evil.example'), newKv('X-Trace', '1')],
        bodyMode: 'json',
        bodyText: '{}',
      }),
    )
    expect(wire.headers.Authorization).toBe('Bearer tok')
    expect(wire.headers['X-Trace']).toBe('1')
    expect(wire.headers.Host).toBeUndefined()
    expect(wire.headers['Content-Type']).toBe('application/json')
  })

  it('places API keys in header or query', () => {
    const header = buildExplorerWireRequest(
      draft({ auth: { type: 'apiKey', key: 'X-Key', value: 'k', in: 'header' } }),
    )
    expect(header.headers['X-Key']).toBe('k')
    const query = buildExplorerWireRequest(
      draft({ auth: { type: 'apiKey', key: 'key', value: 'k', in: 'query' } }),
    )
    expect(query.url).toContain('key=k')
  })

  it('requires confirmation for mutating methods and strips secrets on save', () => {
    expect(isMutatingMethod('POST')).toBe(true)
    expect(isMutatingMethod('GET')).toBe(false)
    const saved = sanitizeDraftForSave(
      draft({ auth: { type: 'bearer', token: 'secret' }, headers: [newKv('Authorization', 'Bearer secret')] }),
      false,
    )
    expect(saved.auth).toEqual({ type: 'bearer', token: '' })
    expect(saved.headers[0].value).toBe('')
  })
})
