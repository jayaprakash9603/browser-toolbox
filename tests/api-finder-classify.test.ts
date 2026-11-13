import { describe, expect, it } from 'vitest'

import {
  aggregateEndpoints,
  classifyCapture,
  finderStats,
  ingestCapture,
  matchesFinderFilter,
  normalizeRoutePath,
} from '@/core/interceptor/apiFinder'
import type { ApiEndpoint, CaptureRecord } from '@/core/interceptor/apiFinderTypes'

function record(partial: Partial<CaptureRecord> & Pick<CaptureRecord, 'id' | 'url'>): CaptureRecord {
  return {
    method: 'GET',
    ...partial,
  }
}

describe('classifyCapture', () => {
  it('includes JSON GET endpoints', () => {
    const result = classifyCapture(
      record({
        id: '1',
        url: 'https://api.example.com/v1/users',
        resourceType: 'xmlhttprequest',
        mimeType: 'application/json',
        status: 200,
      }),
    )
    expect(result?.include).toBe(true)
    expect(result?.kind).toBe('json')
  })

  it('includes POST JSON', () => {
    const result = classifyCapture(
      record({
        id: '2',
        method: 'POST',
        url: 'https://api.example.com/users',
        resourceType: 'fetch',
        requestBody: '{"name":"Ada"}',
        requestHeaders: [{ name: 'content-type', value: 'application/json' }],
        status: 201,
      }),
    )
    expect(result?.kind).toBe('json')
  })

  it('excludes images, stylesheets, fonts, and scripts', () => {
    expect(
      classifyCapture(record({ id: 'img', url: 'https://cdn.example.com/a.png', resourceType: 'image' })),
    ).toBeNull()
    expect(
      classifyCapture(record({ id: 'css', url: 'https://cdn.example.com/app.css', resourceType: 'stylesheet' })),
    ).toBeNull()
    expect(
      classifyCapture(record({ id: 'font', url: 'https://cdn.example.com/a.woff2', resourceType: 'font' })),
    ).toBeNull()
    expect(
      classifyCapture(record({ id: 'js', url: 'https://cdn.example.com/app.js', resourceType: 'script' })),
    ).toBeNull()
  })

  it('classifies XML and form and websocket metadata', () => {
    expect(
      classifyCapture(
        record({
          id: 'xml',
          url: 'https://api.example.com/feed',
          resourceType: 'xmlhttprequest',
          mimeType: 'application/xml',
        }),
      )?.kind,
    ).toBe('xml')
    expect(
      classifyCapture(
        record({
          id: 'form',
          method: 'POST',
          url: 'https://api.example.com/login',
          resourceType: 'xmlhttprequest',
          requestHeaders: [{ name: 'content-type', value: 'application/x-www-form-urlencoded' }],
          requestBody: 'user=a',
        }),
      )?.kind,
    ).toBe('form')
    expect(
      classifyCapture(
        record({ id: 'ws', url: 'wss://api.example.com/socket', resourceType: 'websocket' }),
      )?.kind,
    ).toBe('websocket')
  })

  it('detects GraphQL from payload, not from a random JSON POST', () => {
    const gql = classifyCapture(
      record({
        id: 'gql',
        method: 'POST',
        url: 'https://api.example.com/graphql',
        resourceType: 'xmlhttprequest',
        requestBody: JSON.stringify({ query: 'query GetUser { id }', operationName: 'GetUser' }),
      }),
    )
    expect(gql?.kind).toBe('graphql')
    expect(gql?.graphql?.operationName).toBe('GetUser')

    const json = classifyCapture(
      record({
        id: 'json',
        method: 'POST',
        url: 'https://api.example.com/users',
        resourceType: 'xmlhttprequest',
        requestBody: JSON.stringify({ name: 'Ada' }),
      }),
    )
    expect(json?.kind).toBe('json')
    expect(json?.graphql).toBeUndefined()
  })

  it('does not treat /graphql as GraphQL without a GraphQL payload', () => {
    const result = classifyCapture(
      record({
        id: 'plain',
        method: 'POST',
        url: 'https://api.example.com/graphql',
        resourceType: 'xmlhttprequest',
        requestBody: JSON.stringify({ ping: true }),
        mimeType: 'application/json',
      }),
    )
    expect(result?.kind).not.toBe('graphql')
  })
})

describe('normalizeRoutePath and aggregation', () => {
  it('groups dynamic ids under :id without merging GET and POST', () => {
    expect(normalizeRoutePath('/api/users/123')).toBe('/api/users/:id')
    expect(normalizeRoutePath('/api/users/456/')).toBe('/api/users/:id')
    const store = new Map<string, ApiEndpoint>()
    ingestCapture(
      store,
      record({
        id: 'a',
        url: 'https://api.example.com/api/users/123',
        resourceType: 'xmlhttprequest',
        mimeType: 'application/json',
        startedAt: 1,
      }),
    )
    ingestCapture(
      store,
      record({
        id: 'b',
        url: 'https://api.example.com/api/users/456',
        resourceType: 'xmlhttprequest',
        mimeType: 'application/json',
        startedAt: 2,
      }),
    )
    ingestCapture(
      store,
      record({
        id: 'c',
        method: 'POST',
        url: 'https://api.example.com/api/users/123',
        resourceType: 'xmlhttprequest',
        requestBody: '{}',
        startedAt: 3,
      }),
    )
    const endpoints = [...store.values()]
    const gets = endpoints.filter((item) => item.method === 'GET')
    const posts = endpoints.filter((item) => item.method === 'POST')
    expect(gets).toHaveLength(1)
    expect(gets[0].callCount).toBe(2)
    expect(gets[0].routeTemplate).toBe('/api/users/:id')
    expect(gets[0].occurrences.map((item) => item.url)).toEqual([
      'https://api.example.com/api/users/456',
      'https://api.example.com/api/users/123',
    ])
    expect(posts).toHaveLength(1)
  })

  it('keeps original URLs for query variants on the same route', () => {
    const endpoints = aggregateEndpoints([
      record({
        id: 'q1',
        url: 'https://api.example.com/search?q=a',
        resourceType: 'xmlhttprequest',
        mimeType: 'application/json',
        startedAt: 1,
      }),
      record({
        id: 'q2',
        url: 'https://api.example.com/search?q=b&page=2',
        resourceType: 'xmlhttprequest',
        mimeType: 'application/json',
        startedAt: 2,
      }),
    ])
    expect(endpoints).toHaveLength(1)
    expect(endpoints[0].queryShapes.sort()).toEqual(['q', 'page&q'].sort())
  })

  it('computes finder stats and filters', () => {
    const endpoints = aggregateEndpoints([
      record({
        id: '1',
        url: 'https://a.example/api/x',
        resourceType: 'xmlhttprequest',
        mimeType: 'application/json',
        status: 200,
        startedAt: 1,
      }),
      record({
        id: '2',
        method: 'POST',
        url: 'https://b.example/api/y',
        resourceType: 'xmlhttprequest',
        requestBody: '{}',
        status: 500,
        startedAt: 2,
      }),
    ])
    const stats = finderStats(endpoints)
    expect(stats.endpoints).toBe(2)
    expect(stats.domains).toBe(2)
    expect(stats.getCount).toBe(1)
    expect(stats.postCount).toBe(1)
    expect(stats.errorCount).toBe(1)
    const getEndpoint = endpoints.find((item) => item.method === 'GET')!
    expect(matchesFinderFilter(getEndpoint, new Set(['GET']))).toBe(true)
    expect(matchesFinderFilter(getEndpoint, new Set(['POST']))).toBe(false)
    expect(matchesFinderFilter(endpoints.find((item) => item.method === 'POST')!, new Set(['failed']))).toBe(true)
  })
})
