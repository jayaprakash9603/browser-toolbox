import { describe, expect, it } from 'vitest'

import { filterHeadersForCopy, isForbiddenRequestHeader, stripForbiddenHeaders } from '@/core/interceptor/apiSensitive'
import { entryToCurl, entryToFetch, entryToRequestJson } from '@/features/interceptor/curl'
import type { NetLogEntry } from '@/core/interceptor'

const entry: NetLogEntry = {
  id: '1',
  tabId: 1,
  requestId: '1',
  startedAt: 1,
  method: 'POST',
  url: "https://example.com/api/users?q=O'Brien",
  requestHeaders: [
    { name: 'Content-Type', value: 'application/json' },
    { name: 'Authorization', value: 'Bearer secret-token' },
    { name: 'Cookie', value: 'sid=abc' },
  ],
  requestBody: `{"name":"O'Brien"}`,
  appliedRuleIds: [],
  modified: false,
}

describe('copy helpers', () => {
  it('omits secrets from cURL by default and quotes safely', () => {
    const curl = entryToCurl(entry)
    expect(curl).toContain("--request POST")
    expect(curl).toContain("O'\\''Brien")
    expect(curl).not.toContain('secret-token')
    expect(curl).not.toContain('sid=abc')
    expect(entryToCurl(entry, { includeSecrets: true })).toContain('Bearer secret-token')
  })

  it('generates fetch and JSON without secrets by default', () => {
    expect(entryToFetch(entry)).not.toContain('secret-token')
    const json = JSON.parse(entryToRequestJson(entry)) as { headers: { name: string }[] }
    expect(json.headers.some((header) => header.name === 'Authorization')).toBe(false)
  })

  it('strips forbidden replay headers', () => {
    expect(isForbiddenRequestHeader('Host')).toBe(true)
    expect(isForbiddenRequestHeader('Content-Length')).toBe(true)
    expect(isForbiddenRequestHeader('Sec-Fetch-Mode')).toBe(true)
    expect(stripForbiddenHeaders({ Host: 'example.com', 'X-Test': '1' })).toEqual({ 'X-Test': '1' })
    expect(filterHeadersForCopy([{ name: 'Authorization', value: 'x' }])).toEqual([])
  })
})
