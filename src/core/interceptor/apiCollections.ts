import { STORAGE_KEYS } from '@/core/constants'
import { get, set } from '@/core/storage'

import type { ApiCollection, ApiWorkspaceState, ExplorerDraft, SavedApiRequest } from './apiFinderTypes'
import { sanitizeDraftForSave } from './apiExplorer'

const EXPORT_VERSION = 1 as const

function emptyState(): ApiWorkspaceState {
  return { collections: [], requests: [] }
}

export async function getApiWorkspace(): Promise<ApiWorkspaceState> {
  const stored = await get<ApiWorkspaceState>(STORAGE_KEYS.interceptorApiCollections)
  if (!stored) return emptyState()
  return {
    collections: stored.collections ?? [],
    requests: stored.requests ?? [],
  }
}

export async function saveApiWorkspace(state: ApiWorkspaceState): Promise<void> {
  await set(STORAGE_KEYS.interceptorApiCollections, state)
}

export async function createCollection(name: string, description?: string): Promise<ApiCollection> {
  const state = await getApiWorkspace()
  const collection: ApiCollection = {
    id: crypto.randomUUID(),
    name: name.trim() || 'Untitled collection',
    description,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    requestIds: [],
  }
  await saveApiWorkspace({ ...state, collections: [...state.collections, collection] })
  return collection
}

export async function renameCollection(id: string, name: string): Promise<ApiWorkspaceState> {
  const state = await getApiWorkspace()
  const collections = state.collections.map((collection) =>
    collection.id === id ? { ...collection, name: name.trim() || collection.name, updatedAt: Date.now() } : collection,
  )
  const next = { ...state, collections }
  await saveApiWorkspace(next)
  return next
}

export async function deleteCollection(id: string): Promise<ApiWorkspaceState> {
  const state = await getApiWorkspace()
  const next: ApiWorkspaceState = {
    collections: state.collections.filter((collection) => collection.id !== id),
    requests: state.requests.filter((request) => request.collectionId !== id),
  }
  await saveApiWorkspace(next)
  return next
}

export async function saveRequestToCollection(
  collectionId: string,
  name: string,
  draft: ExplorerDraft,
  options?: { description?: string; tags?: string[]; notes?: string; includeSecrets?: boolean },
): Promise<SavedApiRequest> {
  const state = await getApiWorkspace()
  let collections = state.collections
  if (!collections.some((collection) => collection.id === collectionId)) {
    collections = [
      ...collections,
      {
        id: collectionId,
        name: 'Untitled collection',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        requestIds: [],
      },
    ]
  }
  const request: SavedApiRequest = {
    id: crypto.randomUUID(),
    collectionId,
    name: name.trim() || draft.method + ' ' + draft.url,
    description: options?.description,
    tags: options?.tags ?? [],
    notes: options?.notes,
    draft: sanitizeDraftForSave(draft, Boolean(options?.includeSecrets)),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
  const next: ApiWorkspaceState = {
    collections: collections.map((collection) =>
      collection.id === collectionId
        ? { ...collection, requestIds: [...collection.requestIds, request.id], updatedAt: Date.now() }
        : collection,
    ),
    requests: [...state.requests, request],
  }
  await saveApiWorkspace(next)
  return request
}

export async function duplicateRequest(requestId: string): Promise<SavedApiRequest | null> {
  const state = await getApiWorkspace()
  const source = state.requests.find((request) => request.id === requestId)
  if (!source) return null
  const copy: SavedApiRequest = {
    ...source,
    id: crypto.randomUUID(),
    name: `${source.name} (copy)`,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    draft: { ...source.draft, id: crypto.randomUUID() },
  }
  const next: ApiWorkspaceState = {
    collections: state.collections.map((collection) =>
      collection.id === source.collectionId
        ? { ...collection, requestIds: [...collection.requestIds, copy.id], updatedAt: Date.now() }
        : collection,
    ),
    requests: [...state.requests, copy],
  }
  await saveApiWorkspace(next)
  return copy
}

export async function moveRequest(requestId: string, collectionId: string): Promise<ApiWorkspaceState> {
  const state = await getApiWorkspace()
  const request = state.requests.find((item) => item.id === requestId)
  if (!request) return state
  const from = request.collectionId
  const next: ApiWorkspaceState = {
    collections: state.collections.map((collection) => {
      if (collection.id === from) {
        return { ...collection, requestIds: collection.requestIds.filter((id) => id !== requestId), updatedAt: Date.now() }
      }
      if (collection.id === collectionId) {
        return {
          ...collection,
          requestIds: collection.requestIds.includes(requestId)
            ? collection.requestIds
            : [...collection.requestIds, requestId],
          updatedAt: Date.now(),
        }
      }
      return collection
    }),
    requests: state.requests.map((item) =>
      item.id === requestId ? { ...item, collectionId, updatedAt: Date.now() } : item,
    ),
  }
  await saveApiWorkspace(next)
  return next
}

export async function deleteSavedRequest(requestId: string): Promise<ApiWorkspaceState> {
  const state = await getApiWorkspace()
  const next: ApiWorkspaceState = {
    collections: state.collections.map((collection) => ({
      ...collection,
      requestIds: collection.requestIds.filter((id) => id !== requestId),
    })),
    requests: state.requests.filter((request) => request.id !== requestId),
  }
  await saveApiWorkspace(next)
  return next
}

export async function updateSavedRequest(
  requestId: string,
  patch: Partial<Pick<SavedApiRequest, 'name' | 'description' | 'tags' | 'notes' | 'draft'>>,
): Promise<ApiWorkspaceState> {
  const state = await getApiWorkspace()
  const next: ApiWorkspaceState = {
    ...state,
    requests: state.requests.map((request) =>
      request.id === requestId ? { ...request, ...patch, updatedAt: Date.now() } : request,
    ),
  }
  await saveApiWorkspace(next)
  return next
}

export async function reorderCollectionRequests(collectionId: string, requestIds: string[]): Promise<ApiWorkspaceState> {
  const state = await getApiWorkspace()
  const next: ApiWorkspaceState = {
    ...state,
    collections: state.collections.map((collection) =>
      collection.id === collectionId ? { ...collection, requestIds, updatedAt: Date.now() } : collection,
    ),
  }
  await saveApiWorkspace(next)
  return next
}

export interface CollectionExportFile {
  version: typeof EXPORT_VERSION
  kind: 'one-panel-api-collections'
  exportedAt: number
  collections: ApiCollection[]
  requests: SavedApiRequest[]
}

export function exportWorkspace(state: ApiWorkspaceState): string {
  const payload: CollectionExportFile = {
    version: EXPORT_VERSION,
    kind: 'one-panel-api-collections',
    exportedAt: Date.now(),
    collections: state.collections,
    requests: state.requests,
  }
  return JSON.stringify(payload, null, 2)
}

export function parseCollectionImport(raw: string): ApiWorkspaceState {
  const parsed = JSON.parse(raw) as Partial<CollectionExportFile>
  if (parsed.kind !== 'one-panel-api-collections' || parsed.version !== EXPORT_VERSION) {
    throw new Error('Not a One Panel API collection export.')
  }
  return {
    collections: parsed.collections ?? [],
    requests: parsed.requests ?? [],
  }
}

export async function importWorkspace(raw: string, merge = true): Promise<ApiWorkspaceState> {
  const incoming = parseCollectionImport(raw)
  if (!merge) {
    await saveApiWorkspace(incoming)
    return incoming
  }
  const state = await getApiWorkspace()
  const collections = [...state.collections]
  const requests = [...state.requests]
  for (const collection of incoming.collections) {
    if (!collections.some((item) => item.id === collection.id)) collections.push(collection)
  }
  for (const request of incoming.requests) {
    if (!requests.some((item) => item.id === request.id)) requests.push(request)
  }
  const next = { collections, requests }
  await saveApiWorkspace(next)
  return next
}
