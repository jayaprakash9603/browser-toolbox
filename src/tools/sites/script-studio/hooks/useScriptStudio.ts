import { useCallback, useEffect, useRef, useState } from 'react'

import { sendMessage } from '@/core/messaging'
import type { ScriptRecord, ScriptStudioIndex, ScriptStudioSettings, UserScriptsProbe } from '@/core/script-studio'
import {
  DEFAULT_SCRIPT_STUDIO_INDEX,
  extensionSettingsUrl,
  probeUserScripts,
  requestUserScriptsPermission,
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
import { DEFAULT_SCRIPT_STUDIO_SETTINGS } from '@/core/script-studio/settings'
import { newScriptTemplate } from '@/core/script-studio/templates'

export type { UserScriptsProbe }

export function useScriptStudio() {
  const [index, setIndex] = useState<ScriptStudioIndex | null>(null)
  const [settings, setSettings] = useState<ScriptStudioSettings | null>(null)
  const [probe, setProbe] = useState<UserScriptsProbe | null>(null)
  const [loading, setLoading] = useState(true)
  const wasOperational = useRef<boolean | null>(null)

  const refreshProbe = useCallback(async () => {
    const next = await probeUserScripts()
    setProbe(next)
    if (next.operational && wasOperational.current === false) {
      void sendMessage({ type: 'SCRIPT_STUDIO_SYNC' })
    }
    wasOperational.current = next.operational
    return next
  }, [])

  // The "Allow user scripts" toggle lives in chrome://extensions, so re-check whenever the user comes back.
  useEffect(() => {
    const recheck = () => {
      if (document.visibilityState === 'visible') void refreshProbe()
    }
    const onPermissions = () => void refreshProbe()
    window.addEventListener('focus', recheck)
    document.addEventListener('visibilitychange', recheck)
    chrome.permissions?.onAdded?.addListener(onPermissions)
    chrome.permissions?.onRemoved?.addListener(onPermissions)
    return () => {
      window.removeEventListener('focus', recheck)
      document.removeEventListener('visibilitychange', recheck)
      chrome.permissions?.onAdded?.removeListener(onPermissions)
      chrome.permissions?.onRemoved?.removeListener(onPermissions)
    }
  }, [refreshProbe])

  const refresh = useCallback(async () => {
    try {
      const [idx, st] = await Promise.all([getScriptStudioIndex(), getScriptStudioSettings()])
      setIndex(idx)
      setSettings(st)
    } catch {
      setIndex({ ...DEFAULT_SCRIPT_STUDIO_INDEX, scripts: [] })
      setSettings(DEFAULT_SCRIPT_STUDIO_SETTINGS)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void Promise.resolve().then(refresh)
    void Promise.resolve().then(refreshProbe)
    const onChange = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area !== 'local') return
      if (changes.scriptStudio || changes.scriptStudioSettings || Object.keys(changes).some((k) => k.startsWith('ss:'))) {
        void refresh()
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [refresh, refreshProbe])

  const requestPermission = useCallback(async () => {
    const granted = await requestUserScriptsPermission()
    if (granted) await sendMessage({ type: 'SCRIPT_STUDIO_REQUEST_PERMISSION' })
    return refreshProbe()
  }, [refreshProbe])

  const openExtensionSettings = useCallback(() => {
    void chrome.tabs.create({ url: extensionSettingsUrl() })
  }, [])

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
    refreshProbe,
    requestPermission,
    openExtensionSettings,
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
