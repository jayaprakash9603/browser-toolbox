import { useState } from 'react'

import {
  backupFromZip,
  backupToJson,
  backupToTextArea,
  backupToZip,
  buildBackupPayload,
  parseBackupJson,
} from '@/core/script-studio/backup'
import {
  getScriptCode,
  getScriptExternals,
  getScriptStudioIndex,
  getScriptStudioSettings,
  getScriptValues,
  setScriptStudioIndex,
  setScriptStudioSettings,
  upsertScriptRecord,
  recordFromSource,
} from '@/core/script-studio'
import { Button } from '@/shared/components/ui/button'
import { Textarea } from '@/shared/components/ui/textarea'
import { Checkbox } from '@/shared/components/ui/checkbox'

export function BackupView() {
  const [includeValues, setIncludeValues] = useState(true)
  const [includeSettings, setIncludeSettings] = useState(true)
  const [includeExternals, setIncludeExternals] = useState(false)
  const [text, setText] = useState('')
  const [installUrl, setInstallUrl] = useState('')

  const buildPayload = async () => {
    const index = await getScriptStudioIndex()
    const settings = await getScriptStudioSettings()
    const scripts = []
    for (const s of index.scripts) {
      const code = (await getScriptCode(s.id)) ?? ''
      scripts.push({
        id: s.id,
        code,
        values: await getScriptValues(s.id),
        externals: await getScriptExternals(s.id),
      })
    }
    return buildBackupPayload(index, settings, scripts, {
      includeValues,
      includeSettings,
      includeExternals,
    })
  }

  const exportJson = async () => {
    const payload = await buildPayload()
    const blob = new Blob([backupToJson(payload)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'script-studio-backup.json'
    a.click()
  }

  const exportZip = async () => {
    const payload = await buildPayload()
    const bytes = backupToZip(payload)
    const blob = new Blob([new Uint8Array(bytes)], { type: 'application/zip' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'script-studio-backup.zip'
    a.click()
  }

  const exportTextArea = async () => {
    const payload = await buildPayload()
    setText(backupToTextArea(payload))
  }

  const importText = async () => {
    const payload = parseBackupJson(text)
    await applyPayload(payload)
  }

  const importZip = async (file: File) => {
    const buf = new Uint8Array(await file.arrayBuffer())
    const payload = backupFromZip(buf)
    await applyPayload(payload)
  }

  const installFromUrl = async () => {
    if (!installUrl) return
    const res = await fetch(installUrl)
    const code = await res.text()
    const id = crypto.randomUUID()
    const record = recordFromSource(id, code, { installUrl })
    await upsertScriptRecord(record, code)
    window.location.hash = `#/edit/${id}`
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 text-sm">
      <div className="flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-xs">
          <Checkbox checked={includeValues} onCheckedChange={(c) => setIncludeValues(Boolean(c))} />
          Storage values
        </label>
        <label className="flex items-center gap-2 text-xs">
          <Checkbox checked={includeSettings} onCheckedChange={(c) => setIncludeSettings(Boolean(c))} />
          Settings
        </label>
        <label className="flex items-center gap-2 text-xs">
          <Checkbox checked={includeExternals} onCheckedChange={(c) => setIncludeExternals(Boolean(c))} />
          Externals cache
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={() => void exportJson()}>
          Export JSON file
        </Button>
        <Button variant="secondary" onClick={() => void exportZip()}>
          Export Zip
        </Button>
        <Button variant="outline" onClick={() => void exportTextArea()}>
          Export to textarea
        </Button>
        <label className="inline-flex cursor-pointer items-center rounded-md border px-3 py-2 text-xs hover:bg-muted">
          Import Zip
          <input type="file" accept=".zip" className="hidden" onChange={(e) => e.target.files?.[0] && void importZip(e.target.files[0])} />
        </label>
      </div>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="Paste backup JSON…" />
      <Button onClick={() => void importText()}>Import from textarea</Button>
      <div className="flex gap-2">
        <input
          className="flex-1 rounded-md border px-2 py-1 text-xs"
          placeholder="Install from URL (*.user.js)"
          value={installUrl}
          onChange={(e) => setInstallUrl(e.target.value)}
        />
        <Button onClick={() => void installFromUrl()}>Install</Button>
      </div>
    </div>
  )
}

async function applyPayload(payload: ReturnType<typeof parseBackupJson>) {
  await setScriptStudioIndex(payload.index)
  await setScriptStudioSettings(payload.settings)
  for (const s of payload.scripts) {
    const record = payload.index.scripts.find((r) => r.id === s.id)
    if (record) await upsertScriptRecord(record, s.code)
    else {
      const rec = recordFromSource(s.id, s.code)
      await upsertScriptRecord(rec, s.code)
    }
    if (s.values) {
      const { setScriptValues } = await import('@/core/script-studio')
      await setScriptValues(s.id, s.values)
    }
  }
}
