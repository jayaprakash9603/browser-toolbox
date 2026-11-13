import { beforeEach, describe, expect, it } from 'vitest'

import {
  createCollection,
  deleteCollection,
  exportWorkspace,
  getApiWorkspace,
  importWorkspace,
  parseCollectionImport,
  saveRequestToCollection,
} from '@/core/interceptor/apiCollections'
import { appendApiHistory, clearApiHistory, getApiHistory } from '@/core/interceptor/apiHistory'
import type { ExplorerDraft } from '@/core/interceptor/apiFinderTypes'
import { resetChromeMockStorage } from './setup'

const draft: ExplorerDraft = {
  id: 'draft',
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
}

describe('api collections and history', () => {
  beforeEach(() => {
    resetChromeMockStorage()
  })

  it('creates collections and saves requests without mixing with traffic', async () => {
    const collection = await createCollection('User APIs')
    const saved = await saveRequestToCollection(collection.id, 'List users', draft)
    const state = await getApiWorkspace()
    expect(state.collections).toHaveLength(1)
    expect(state.requests[0].id).toBe(saved.id)
    const deleted = await deleteCollection(collection.id)
    expect(deleted.collections).toHaveLength(0)
    expect(deleted.requests).toHaveLength(0)
  })

  it('round-trips export/import JSON', async () => {
    const collection = await createCollection('Auth')
    await saveRequestToCollection(collection.id, 'Login', draft)
    const raw = exportWorkspace(await getApiWorkspace())
    expect(parseCollectionImport(raw).collections[0].name).toBe('Auth')
    resetChromeMockStorage()
    const imported = await importWorkspace(raw, false)
    expect(imported.requests).toHaveLength(1)
  })

  it('keeps explorer history separate from collections', async () => {
    await appendApiHistory({
      id: 'h1',
      at: Date.now(),
      method: 'GET',
      url: 'https://api.example.com/users',
      result: 'ok',
      status: 200,
      durationMs: 12,
      draft,
    })
    expect(await getApiHistory()).toHaveLength(1)
    expect((await getApiWorkspace()).collections).toHaveLength(0)
    await clearApiHistory()
    expect(await getApiHistory()).toHaveLength(0)
  })
})
