import { useCallback, useEffect, useState } from 'react'

import { sendMessage } from '@/core/messaging'
import type { ScriptRecord, ScriptStudioIndex, ScriptStudioSettings } from '@/core/script-studio'
import {
  getScriptCode,
  getScriptStudioIndex,
  getScriptStudioSettings,
  getScriptValues,
  setScriptCode,
  setScriptStudioIndex,
  setScriptStudioSettings,
  setScriptValues,
  upsertScriptRecord,
  createScriptId,
  recordFromSource,
  removeScript,
  restoreScript,
} from '@/core/script-studio'
import { newScriptTemplate } from '@/core/script-studio/templates'

export type UserScriptsProbe = {
  apiPresent: boolean
  permissionGranted: boolean
  operational: boolean
  error?: string
}

export function useScriptStudio() {
  const [index, setIndex] = useState<ScriptStudioIndex | null>(null)
  const [settings, setSettings] = useState<ScriptStudioSettings | null>(null)
  const [probe, setProbe] = useState<UserScriptsProbe | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    const [idx, st] = await Promise.all([getScriptStudioIndex(), getScriptStudioSettings()])
    setIndex(idx)
    setSettings(st)
    const p = await sendMessage<UserScriptsProbe>({ type: 'SCRIPT_STUDIO_PROBE' })
    if (p) setProbe(p)
    setLoading(false)
  }, [])

  useEffect(() => {
    void refresh()
    const onChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area !== 'local') return
      if (changes.scriptStudio || changes.scriptStudioSettings || Object.keys(changes).some((k) => k.startsWith('ss:'))) {
        void refresh()
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [refresh])

  const requestPermission = useCallback(async () => {
    const res = await sendMessage<UserScriptsProbe & { granted?: boolean }>({
      type: 'SCRIPT_STUDIO_REQUEST_PERMISSION',
    })
    if (res) setProbe(res)
    await sendMessage({ type: 'SCRIPT_STUDIO_SYNC' })
    await refresh()
    return res
  }, [refresh])

  const setGlobalEnabled = useCallback(
    async (enabled: boolean) => {
      await sendMessage({ type: 'SCRIPT_STUDIO_SET_GLOBAL', enabled })
      await refresh()
    },
    [refresh],
  )

  const saveScript = useCallback(
    async (record: ScriptRecord, code: string) => {
      await upsertScriptRecord(record, code)
      await sendMessage({ type: 'SCRIPT_STUDIO_SYNC' })
      await refresh()
    },
    [refresh],
  )

  const createScript = useCallback(async () => {
    const id = createScriptId()
    const code = newScriptTemplate()
    const record = recordFromSource(id, code, { position: (index?.scripts.length ?? 0) + 1 })
    await saveScript(record, code)
    return id
  }, [index?.scripts.length, saveScript])

  const toggleScript = useCallback(
    async (record: ScriptRecord, enabled: boolean) => {
      await saveScript({ ...record, enabled }, (await getScriptCode(record.id)) ?? '')
    },
    [saveScript],
  )

  const updateSettings = useCallback(
    async (patch: Partial<ScriptStudioSettings>) => {
      if (!settings) return
      const next = { ...settings, ...patch }
      await setScriptStudioSettings(next)
      setSettings(next)
      await sendMessage({ type: 'SCRIPT_STUDIO_SYNC' })
    },
    [settings],
  )

  const trashScript = useCallback(
    async (id: string) => {
      await removeScript(id, false)
      await sendMessage({ type: 'SCRIPT_STUDIO_SYNC' })
      await refresh()
    },
    [refresh],
  )

  const restoreScriptById = useCallback(
    async (id: string) => {
      await restoreScript(id)
      await refresh()
    },
    [refresh],
  )

  const loadCode = getScriptCode
  const loadValues = getScriptValues
  const saveValues = async (id: string, values: Record<string, unknown>) => {
    await setScriptValues(id, values)
    await sendMessage({ type: 'SCRIPT_STUDIO_SYNC' })
  }

  const patchIndex = async (patch: Partial<ScriptStudioIndex>) => {
    const current = await getScriptStudioIndex()
    const next = { ...current, ...patch }
    await setScriptStudioIndex(next)
    setIndex(next)
  }

  return {
    index,
    settings,
    probe,
    loading,
    refresh,
    requestPermission,
    setGlobalEnabled,
    saveScript,
    createScript,
    toggleScript,
    updateSettings,
    trashScript,
    restoreScriptById,
    loadCode,
    loadValues,
    saveValues,
    patchIndex,
    setScriptCode,
  }
}
