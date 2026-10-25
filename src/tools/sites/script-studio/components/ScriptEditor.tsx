import { js_beautify } from 'js-beautify'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { parseMetadata } from '@/core/script-studio'
import type { ScriptRecord, ScriptStudioSettings } from '@/core/script-studio'
import { GM_GRANTS } from '@/core/script-studio/grants'
import { CodeEditor } from '@/shared/components/CodeEditor'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

type Props = {
  record: ScriptRecord
  settings: ScriptStudioSettings
  code: string
  values: Record<string, unknown>
  onSave: (code: string, record: ScriptRecord) => void
  onValuesSave: (values: Record<string, unknown>) => void
}

export function ScriptEditor({ record, settings, code, values, onSave, onValuesSave }: Props) {
  const { t } = useTranslation()
  const [source, setSource] = useState(code)
  const [localRecord, setLocalRecord] = useState(record)
  const [storageRows, setStorageRows] = useState<{ key: string; value: string }[]>([])

  useEffect(() => setSource(code), [code])
  useEffect(() => setLocalRecord(record), [record])

  useEffect(() => {
    setStorageRows(
      Object.entries(values).map(([key, value]) => ({
        key,
        value: typeof value === 'string' ? value : JSON.stringify(value),
      })),
    )
  }, [values])

  useEffect(() => {
    if (!settings.editorAutosave) return
    const tmr = setTimeout(() => onSave(source, localRecord), 800)
    return () => clearTimeout(tmr)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounced save
  }, [source, localRecord, settings.editorAutosave])

  const meta = parseMetadata(source)

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => {
            onSave(source, localRecord)
          }}
        >
          {t('scriptStudio.editor.save')}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setSource(js_beautify(source, { indent_size: settings.editorIndent }))}
        >
          {t('scriptStudio.editor.beautify')}
        </Button>
      </div>

      <Tabs defaultValue="code" className="flex min-h-0 flex-1 flex-col">
        <TabsList>
          <TabsTrigger value="code">{t('scriptStudio.editor.tabs.code')}</TabsTrigger>
          <TabsTrigger value="settings">{t('scriptStudio.editor.tabs.settings')}</TabsTrigger>
          <TabsTrigger value="storage">{t('scriptStudio.editor.tabs.storage')}</TabsTrigger>
          <TabsTrigger value="externals">{t('scriptStudio.editor.tabs.externals')}</TabsTrigger>
          <TabsTrigger value="info">{t('scriptStudio.editor.tabs.info')}</TabsTrigger>
        </TabsList>

        <TabsContent value="code" className="min-h-[320px] flex-1 data-[state=active]:flex data-[state=active]:flex-col">
          <CodeEditor value={source} onChange={setSource} language="javascript" className="min-h-[300px] flex-1" ariaLabel="Script source" />
        </TabsContent>

        <TabsContent value="settings" className="space-y-2 text-xs">
          <label className="block">
            Run-at override
            <select
              className="mt-1 w-full rounded-md border px-2 py-1"
              value={localRecord.overrides.runAt ?? meta?.runAt ?? 'document-idle'}
              onChange={(e) =>
                setLocalRecord({
                  ...localRecord,
                  overrides: { ...localRecord.overrides, runAt: e.target.value as ScriptRecord['overrides']['runAt'] },
                })
              }
            >
              <option value="document-start">document-start</option>
              <option value="document-idle">document-idle</option>
              <option value="document-end">document-end</option>
              <option value="context-menu">context-menu</option>
            </select>
          </label>
          <label className="block">
            Position
            <Input
              type="number"
              value={localRecord.overrides.position ?? localRecord.position}
              onChange={(e) =>
                setLocalRecord({
                  ...localRecord,
                  overrides: { ...localRecord.overrides, position: Number(e.target.value) },
                })
              }
            />
          </label>
          <label className="block">
            Tags (comma-separated)
            <Input
              value={(localRecord.overrides.tags ?? []).join(', ')}
              onChange={(e) =>
                setLocalRecord({
                  ...localRecord,
                  overrides: {
                    ...localRecord.overrides,
                    tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                  },
                })
              }
            />
          </label>
        </TabsContent>

        <TabsContent value="storage" className="space-y-2">
          {storageRows.map((row, i) => (
            <div key={row.key} className="flex gap-2">
              <Input value={row.key} readOnly className="w-1/3" />
              <Input
                value={row.value}
                onChange={(e) => {
                  const next = [...storageRows]
                  next[i] = { ...row, value: e.target.value }
                  setStorageRows(next)
                }}
                className="flex-1"
              />
            </div>
          ))}
          <Button
            size="sm"
            onClick={() => {
              const obj: Record<string, unknown> = {}
              for (const row of storageRows) {
                try {
                  obj[row.key] = JSON.parse(row.value)
                } catch {
                  obj[row.key] = row.value
                }
              }
              onValuesSave(obj)
            }}
          >
            Save storage
          </Button>
        </TabsContent>

        <TabsContent value="externals" className="text-xs text-muted-foreground">
          <p>@require and @resource bodies are fetched at install/update and cached in the background.</p>
          <ul className="mt-2 list-disc pl-4">
            {meta?.requires.map((r) => (
              <li key={r.url}>{r.url}</li>
            ))}
            {meta?.resources.map((r) => (
              <li key={r.name}>
                {r.name}: {r.url}
              </li>
            ))}
          </ul>
        </TabsContent>

        <TabsContent value="info" className="space-y-2 text-xs">
          <p>
            <strong>Grants:</strong> {meta?.grants.join(', ') || 'default sandbox'}
          </p>
          <p>
            <strong>Connect:</strong> {meta?.connects.join(', ') || 'none'}
          </p>
          {meta?.antifeatures.map((a) => (
            <p key={a.type} className="text-amber-600">
              Antifeature {a.type}
            </p>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export function ApiReferencePanel() {
  return (
    <div className="space-y-2 text-xs">
      {GM_GRANTS.map((g) => (
        <div key={g.id} className="rounded-lg border p-2">
          <code className="font-mono text-[11px]">{g.id}</code>
          <p className="text-muted-foreground">{g.summary}</p>
        </div>
      ))}
    </div>
  )
}
