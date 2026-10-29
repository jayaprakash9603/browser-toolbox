import { describe, expect, it } from 'vitest'

import { toolRegistry } from '@/core/registry'
import { registerModules } from '@/modules'

registerModules()
import { TOOL_SEARCH_ENTRIES } from '@/features/search/allToolSearchEntries'
import { JSON_TABS } from '@/tools/developer/json-toolkit/tabs'
import { getYoutubeSearchEntries } from '@/core/sites/youtube/searchEntries'
import {
  getAllSearchItems,
  groupSearchResults,
  searchAll,
  toolsVisibleForQuery,
} from '@/features/search/searchIndex'

describe('searchIndex', () => {
  it('indexes hundreds of tool options including YouTube controls', () => {
    const items = getAllSearchItems()
    const options = items.filter((item) => item.kind === 'option')
    expect(options.length).toBeGreaterThan(150)
    expect(options.some((item) => item.id === 'sites.youtube:hidePremiumUpsell')).toBe(true)
  })

  it('has unique option entry ids per tool', () => {
    for (const tool of toolRegistry.getAll()) {
      const entries =
        tool.id === 'sites.youtube'
          ? getYoutubeSearchEntries()
          : tool.searchEntries ?? TOOL_SEARCH_ENTRIES[tool.id] ?? []
      const ids = entries.map((e) => e.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })

  it('json toolkit tab params are valid', () => {
    const entries = TOOL_SEARCH_ENTRIES['developer.json-toolkit'] ?? []
    for (const entry of entries) {
      const tab = entry.params.tab
      if (tab) expect(JSON_TABS).toContain(tab)
    }
  })

  it('ranks validate json to json toolkit validate option', () => {
    const results = searchAll('validate json')
    expect(results.length).toBeGreaterThan(0)
    expect(results[0].id).toBe('developer.json-toolkit:validate')
  })

  it('finds dark theme setting', () => {
    const results = searchAll('dark theme')
    expect(results.some((item) => item.id === 'setting:theme')).toBe(true)
  })

  it('finds hide live youtube option', () => {
    const results = searchAll('hide live')
    expect(results.some((item) => item.id === 'sites.youtube:hideLive')).toBe(true)
  })

  it('still shows API Request Builder when options also match api request', () => {
    const results = searchAll('api request')
    const grouped = groupSearchResults(results)
    expect(grouped.options.length).toBeGreaterThan(0)
    const visible = toolsVisibleForQuery(grouped.tools, grouped.options.length, 'api request')
    expect(visible.some((item) => item.id === 'api.request-builder')).toBe(true)
  })

  it('ranks JSON format option above JSON Toolkit for format json', () => {
    const results = searchAll('format json')
    const grouped = groupSearchResults(results)
    expect(grouped.options.length).toBeGreaterThan(0)
    expect(results[0]?.id).toBe('text.formatter:json')
    const visible = toolsVisibleForQuery(grouped.tools, grouped.options.length, 'format json')
    expect(visible.length).toBeLessThanOrEqual(8)
  })

  it('finds QR and barcode options for bar code', () => {
    const results = searchAll('bar code')
    expect(results.some((item) => item.id === 'generators.qr-toolkit')).toBe(true)
    expect(results.some((item) => item.id.startsWith('generators.qr-toolkit:barcode'))).toBe(true)
    const encode = searchAll('encode base64')
    expect(encode[0]?.title).toBe('Encode base64')
  })

  it('puts JSON-related options before tools for json query', () => {
    const results = searchAll('json')
    const grouped = groupSearchResults(results)
    expect(grouped.options.length).toBeGreaterThan(0)
    expect(results[0]?.kind).toBe('option')
    expect(['text.formatter:json', 'developer.json-toolkit:validate', 'developer.json-toolkit:format']).toContain(
      results[0]?.id,
    )
  })

  it('finds hide premium upsell for youtube premium query', () => {
    const results = searchAll('youtube premium')
    expect(results.some((item) => item.id === 'sites.youtube:hidePremiumUpsell')).toBe(true)
    expect(results[0]?.kind).toBe('option')
    expect(results[0]?.id).toBe('sites.youtube:hidePremiumUpsell')
  })
})
