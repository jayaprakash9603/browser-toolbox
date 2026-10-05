import { beforeEach, describe, expect, it } from 'vitest'

import { clearAll, get, set } from '@/core/storage'
import { STORAGE_KEYS } from '@/core/constants'
import {
  addClipboardEntry,
  clearHistory,
  deleteEntry,
  getHistory,
  pinEntry,
} from '@/core/clipboard'
import { getFavorites, toggleFavorite } from '@/features/favorites/favoritesService'
import { getRecentTools, trackRecentTool } from '@/features/recent-tools/recentToolsService'
import { DEFAULT_SETTINGS, getSettings, updateSettings } from '@/features/settings/settingsService'
import { resetChromeMockStorage } from './setup'

beforeEach(() => {
  resetChromeMockStorage()
})

describe('storageService', () => {
  it('round-trips typed values', async () => {
    await set('key', { a: 1 })
    expect(await get('key')).toEqual({ a: 1 })
  })
})

describe('settingsService', () => {
  it('returns defaults and merges updates', async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS)
    const next = await updateSettings({ theme: 'dark' })
    expect(next.theme).toBe('dark')
    expect(next.clipboardHistoryEnabled).toBe(true)
  })
})

describe('favoritesService', () => {
  it('toggles favorites', async () => {
    expect(await toggleFavorite('text.word-counter')).toBe(true)
    expect(await getFavorites()).toEqual(['text.word-counter'])
    expect(await toggleFavorite('text.word-counter')).toBe(false)
    expect(await getFavorites()).toEqual([])
  })
})

describe('recentToolsService', () => {
  it('keeps most-recent-first without duplicates', async () => {
    await trackRecentTool('a')
    await trackRecentTool('b')
    await trackRecentTool('a')
    const recent = await getRecentTools()
    expect(recent.map((r) => r.toolId)).toEqual(['a', 'b'])
  })
})

describe('clipboardService', () => {
  it('adds entries with counts and dedupes by moving to front', async () => {
    await addClipboardEntry('hello world')
    await addClipboardEntry('second')
    const bumped = await addClipboardEntry('hello world')
    const history = await getHistory()
    expect(history).toHaveLength(2)
    expect(history[0].text).toBe('hello world')
    expect(history[0].id).toBe(bumped!.id)
    expect(history[0].wordCount).toBe(2)
  })

  it('ignores malformed clipboard history stored by older or corrupted data', async () => {
    const validEntry = {
      id: 'entry-1',
      text: 'saved text',
      createdAt: 1,
      pinned: false,
      charCount: 10,
      wordCount: 2,
    }
    await set(STORAGE_KEYS.clipboardHistory, [validEntry, null, { id: 'missing-text' }])

    expect(await getHistory()).toEqual([validEntry])

    await set(STORAGE_KEYS.clipboardHistory, { stale: true })
    expect(await getHistory()).toEqual([])
  })

  it('respects the history size limit but keeps pinned entries', async () => {
    await updateSettings({ clipboardHistoryLimit: 10 })
    for (let i = 0; i < 15; i++) await addClipboardEntry(`entry ${i}`)
    const first = (await getHistory()).at(-1)!
    await pinEntry(first.id, true)
    for (let i = 15; i < 20; i++) await addClipboardEntry(`entry ${i}`)
    const history = await getHistory()
    expect(history.filter((e) => e.pinned)).toHaveLength(1)
    expect(history.filter((e) => !e.pinned).length).toBeLessThanOrEqual(10)
  })

  it('can be disabled via settings', async () => {
    await updateSettings({ clipboardHistoryEnabled: false })
    expect(await addClipboardEntry('secret')).toBeUndefined()
    expect(await getHistory()).toHaveLength(0)
  })

  it('deletes individual entries and clears all', async () => {
    const a = await addClipboardEntry('a')
    await addClipboardEntry('b')
    await deleteEntry(a!.id)
    expect((await getHistory()).map((e) => e.text)).toEqual(['b'])
    await clearHistory(true)
    expect(await getHistory()).toHaveLength(0)
  })

  it('clearAll resets storage keys', async () => {
    await addClipboardEntry('x')
    await clearAll()
    expect(await get(STORAGE_KEYS.clipboardHistory)).toBeUndefined()
  })
})
