import { STORAGE_KEYS } from '@/core/constants'
import { get, remove, set } from '@/core/storage'

import { parseMetadata, pickLocalized } from './metadata'
import { mergeSettings, DEFAULT_SCRIPT_STUDIO_SETTINGS } from './settings'
import type {
  ExternalCacheEntry,
  ScriptRecord,
  ScriptStudioIndex,
  ScriptStudioSettings,
} from './types'

export function scriptCodeKey(id: string): string {
  return `ss:code:${id}`
}

export function scriptValuesKey(id: string): string {
  return `ss:values:${id}`
}

export function scriptExternalsKey(id: string): string {
  return `ss:ext:${id}`
}

export const DEFAULT_SCRIPT_STUDIO_INDEX: ScriptStudioIndex = {
  globalEnabled: true,
  scripts: [],
  trashMode: 'enabled',
}

export function createScriptId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `ss-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function recordFromSource(
  id: string,
  source: string,
  partial?: Partial<ScriptRecord>,
): ScriptRecord {
  const meta = parseMetadata(source)
  const now = Date.now()
  return {
    id,
    uuid: partial?.uuid ?? id,
    enabled: partial?.enabled ?? true,
    trashed: false,
    position: partial?.position ?? 0,
    createdAt: partial?.createdAt ?? now,
    updatedAt: now,
    overrides: partial?.overrides ?? {},
    size: new TextEncoder().encode(source).length,
    name: meta ? pickLocalized(meta.name) : 'Unnamed script',
    version: meta?.version ?? '0.0.0',
    installUrl: partial?.installUrl,
  }
}

export async function getScriptStudioIndex(): Promise<ScriptStudioIndex> {
  const stored = await get<Partial<ScriptStudioIndex>>(STORAGE_KEYS.scriptStudio)
  if (!stored) return { ...DEFAULT_SCRIPT_STUDIO_INDEX, scripts: [] }
  return {
    globalEnabled: stored.globalEnabled ?? DEFAULT_SCRIPT_STUDIO_INDEX.globalEnabled,
    trashMode: stored.trashMode ?? DEFAULT_SCRIPT_STUDIO_INDEX.trashMode,
    scripts: (stored.scripts ?? []).slice().sort((a, b) => a.position - b.position),
  }
}

export async function setScriptStudioIndex(index: ScriptStudioIndex): Promise<void> {
  await set(STORAGE_KEYS.scriptStudio, index)
}

export async function getScriptStudioSettings(): Promise<ScriptStudioSettings> {
  const stored = await get<Partial<ScriptStudioSettings>>(STORAGE_KEYS.scriptStudioSettings)
  return mergeSettings(stored ?? undefined)
}

export async function setScriptStudioSettings(settings: ScriptStudioSettings): Promise<void> {
  await set(STORAGE_KEYS.scriptStudioSettings, settings)
}

export async function getScriptCode(id: string): Promise<string | null> {
  const code = await get<string>(scriptCodeKey(id))
  return code ?? null
}

export async function setScriptCode(id: string, code: string): Promise<void> {
  await set(scriptCodeKey(id), code)
}

export async function getScriptValues(id: string): Promise<Record<string, unknown>> {
  return (await get<Record<string, unknown>>(scriptValuesKey(id))) ?? {}
}

export async function setScriptValues(id: string, values: Record<string, unknown>): Promise<void> {
  await set(scriptValuesKey(id), values)
}

export async function getScriptExternals(id: string): Promise<ExternalCacheEntry[]> {
  return (await get<ExternalCacheEntry[]>(scriptExternalsKey(id))) ?? []
}

export async function setScriptExternals(id: string, entries: ExternalCacheEntry[]): Promise<void> {
  await set(scriptExternalsKey(id), entries)
}

export async function deleteScriptStorage(id: string): Promise<void> {
  await remove(scriptCodeKey(id))
  await remove(scriptValuesKey(id))
  await remove(scriptExternalsKey(id))
}

export async function upsertScriptRecord(
  record: ScriptRecord,
  code: string,
): Promise<ScriptStudioIndex> {
  const index = await getScriptStudioIndex()
  const i = index.scripts.findIndex((s) => s.id === record.id)
  const nextRecord = {
    ...record,
    size: new TextEncoder().encode(code).length,
    updatedAt: Date.now(),
  }
  if (i >= 0) index.scripts[i] = nextRecord
  else index.scripts.push(nextRecord)
  await setScriptCode(record.id, code)
  await setScriptStudioIndex(index)
  return index
}

export async function removeScript(id: string, permanent: boolean): Promise<ScriptStudioIndex> {
  const index = await getScriptStudioIndex()
  const settings = await getScriptStudioSettings()
  const trashMode = settings.trashMode

  if (permanent || trashMode === 'disabled') {
    index.scripts = index.scripts.filter((s) => s.id !== id)
    await deleteScriptStorage(id)
  } else {
    index.scripts = index.scripts.map((s) =>
      s.id === id ? { ...s, trashed: true, trashedAt: Date.now(), enabled: false } : s,
    )
  }
  await setScriptStudioIndex(index)
  return index
}

export async function restoreScript(id: string): Promise<ScriptStudioIndex> {
  const index = await getScriptStudioIndex()
  index.scripts = index.scripts.map((s) =>
    s.id === id ? { ...s, trashed: false, trashedAt: undefined } : s,
  )
  await setScriptStudioIndex(index)
  return index
}

export async function listActiveScripts(index?: ScriptStudioIndex): Promise<ScriptRecord[]> {
  const idx = index ?? (await getScriptStudioIndex())
  return idx.scripts.filter((s) => !s.trashed)
}

export async function factoryResetScriptStudio(): Promise<void> {
  const index = await getScriptStudioIndex()
  for (const s of index.scripts) {
    await deleteScriptStorage(s.id)
  }
  await set(STORAGE_KEYS.scriptStudio, DEFAULT_SCRIPT_STUDIO_INDEX)
  await set(STORAGE_KEYS.scriptStudioSettings, DEFAULT_SCRIPT_STUDIO_SETTINGS)
}
