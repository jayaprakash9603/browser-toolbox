import { describe, expect, it } from 'vitest'

import { toolRegistry } from '@/core/registry'
import { registerModules } from '@/modules'

registerModules()
import { TOOL_SEARCH_ENTRIES } from '@/features/search/allToolSearchEntries'
import { JSON_TABS } from '@/tools/developer/json-toolkit/tabs'
import { getYoutubeSearchEntries } from '@/core/sites/youtube/searchEntries'
import { searchAll } from '@/features/search/searchIndex'

describe('searchIndex', () => {
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

  it('finds hide premium upsell for youtube premium query', () => {
    const results = searchAll('youtube premium')
    expect(results.some((item) => item.id === 'sites.youtube:hidePremiumUpsell')).toBe(true)
    const premium = results.find((item) => item.id === 'sites.youtube:hidePremiumUpsell')
    const toolkit = results.find((item) => item.id === 'sites.youtube')
    expect(premium && toolkit && results.indexOf(premium) < results.indexOf(toolkit)).toBe(true)
  })
})
