import { createLogger } from '@/core/logging'
import {
  getScriptCode,
  getScriptStudioIndex,
  getScriptStudioSettings,
  isNewerVersion,
  parseMetadata,
  setScriptCode,
  upsertScriptRecord,
} from '@/core/script-studio'

import { refreshScriptExternals } from './externals'
import { scheduleScriptStudioSync } from './registration'

const logger = createLogger('script-studio-updates')
const ALARM = 'script-studio-updates'

export async function checkScriptUpdates(scriptIds?: string[]): Promise<
  { id: string; name: string; remoteVersion: string; localVersion: string }[]
> {
  const index = await getScriptStudioIndex()
  const settings = await getScriptStudioSettings()
  const updates: { id: string; name: string; remoteVersion: string; localVersion: string }[] = []
  const targets = index.scripts.filter(
    (s) =>
      !s.trashed &&
      (scriptIds ? scriptIds.includes(s.id) : true) &&
      (settings.checkDisabledScripts || s.enabled),
  )

  for (const record of targets) {
    const code = await getScriptCode(record.id)
    if (!code) continue
    const meta = parseMetadata(code)
    if (!meta?.updateUrl) continue
    try {
      const res = await fetch(meta.updateUrl, { cache: 'no-store' })
      const text = await res.text()
      const remoteMeta = parseMetadata(text.includes('==UserScript==') ? text : `// ==UserScript==\n${text}\n// ==/UserScript==\n`)
      const remoteVersion = remoteMeta?.version ?? meta.version
      if (isNewerVersion(remoteVersion, meta.version)) {
        updates.push({
          id: record.id,
          name: record.name,
          remoteVersion,
          localVersion: meta.version,
        })
        if (settings.autoInstallUpdates && meta.downloadUrl && meta.downloadUrl !== 'none') {
          const dl = await fetch(meta.downloadUrl)
          const newCode = await dl.text()
          const newMeta = parseMetadata(newCode)
          if (newMeta) {
            const { setScriptExternals } = await import('@/core/script-studio')
            const ext = await refreshScriptExternals(newMeta, [], true)
            await setScriptExternals(record.id, ext)
            await setScriptCode(record.id, newCode)
            await upsertScriptRecord({ ...record, version: newMeta.version, name: record.name }, newCode)
            scheduleScriptStudioSync()
          }
        }
      }
    } catch (error) {
      logger.warn('update check failed', record.id, error)
    }
  }

  return updates
}

export function registerUpdateAlarms(): void {
  void chrome.alarms.create(ALARM, { periodInMinutes: 60 * 24 })
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name !== ALARM) return
    void (async () => {
      const settings = await getScriptStudioSettings()
      await chrome.alarms.clear(ALARM)
      await chrome.alarms.create(ALARM, { periodInMinutes: Math.max(1, settings.updateIntervalHours * 60) })
      void checkScriptUpdates()
    })()
  })
}
