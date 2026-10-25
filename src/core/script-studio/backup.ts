import { strFromU8, strToU8, unzipSync, zipSync } from 'fflate'

import type { BackupPayload, ExternalCacheEntry, ScriptStudioIndex, ScriptStudioSettings } from './types'
import { mergeSettings } from './settings'

export type BackupOptions = {
  includeValues: boolean
  includeSettings: boolean
  includeExternals: boolean
}

const BACKUP_JSON = 'script-studio-backup.json'

export function buildBackupPayload(
  index: ScriptStudioIndex,
  settings: ScriptStudioSettings,
  scripts: { id: string; code: string; values: Record<string, unknown>; externals: ExternalCacheEntry[] }[],
  options: BackupOptions,
): BackupPayload {
  return {
    version: 1,
    exportedAt: Date.now(),
    index,
    settings: options.includeSettings ? settings : mergeSettings(),
    scripts: scripts.map((s) => ({
      id: s.id,
      code: s.code,
      values: options.includeValues ? s.values : {},
      externals: options.includeExternals ? s.externals : [],
    })),
  }
}

export function backupToJson(payload: BackupPayload): string {
  return JSON.stringify(payload, null, 2)
}

export function parseBackupJson(text: string): BackupPayload {
  const parsed = JSON.parse(text) as BackupPayload
  if (parsed.version !== 1) throw new Error('Unsupported backup version')
  return parsed
}

export function backupToZip(payload: BackupPayload): Uint8Array {
  const json = backupToJson(payload)
  return zipSync({ [BACKUP_JSON]: strToU8(json) })
}

export function backupFromZip(bytes: Uint8Array): BackupPayload {
  const files = unzipSync(bytes)
  const entry = files[BACKUP_JSON]
  if (!entry) throw new Error('Missing backup file in archive')
  return parseBackupJson(strFromU8(entry))
}

export function backupToTextArea(payload: BackupPayload): string {
  return backupToJson(payload)
}
