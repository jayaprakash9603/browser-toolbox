import { js_beautify } from 'js-beautify'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { parseMetadata } from '@/core/script-studio'
import type { ScriptRecord, ScriptStudioSettings } from '@/core/script-studio'
import { GM_GRANTS } from '@/core/script-studio/grants'
import { CodeEditor } from '@/shared/components/CodeEditor'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Label } from '@/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'

const RUN_AT_OPTIONS = ['document-start', 'document-end', 'document-idle', 'context-menu'] as const

function toRows(values: Record<string, unknown>) {
  return Object.entries(values).map(([key, value]) => ({
    key,
    value: typeof value === 'string' ? value : JSON.stringify(value),
  }))
}

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
  const [overrides, setOverrides] = useState(record.overrides)
  const [tagsText, setTagsText] = useState((record.overrides.tags ?? []).join(', '))
  const [storageRows, setStorageRows] = useState(() => toRows(values))
  const [prevValues, setPrevValues] = useState(values)
  if (values !== prevValues) {
    setPrevValues(values)
    setStorageRows(toRows(values))
  }
  const saved = useRef({ source: code, overrides: record.overrides })

  // Fields outside the editor (enabled, position, update info) can change elsewhere, so always save on top of the latest record.
  const save = () => {
    saved.current = { source, overrides }
    onSave(source, { ...record, overrides })
  }

  useEffect(() => {
    if (!settings.editorAutosave) return
    if (saved.current.source === source && saved.current.overrides === overrides) return
    const tmr = setTimeout(save, 800)
    return () => clearTimeout(tmr)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- debounced save
  }, [source, overrides, settings.editorAutosave])

  const meta = parseMetadata(source)

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={save}
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

        <TabsContent value="settings" className="flex max-w-md flex-col gap-3 text-xs">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ss-run-at">Run-at override</Label>
            <Select
              value={overrides.runAt ?? meta?.runAt ?? 'document-idle'}
              onValueChange={(v) => setOverrides({ ...overrides, runAt: v as ScriptRecord['overrides']['runAt'] })}
            >
              <SelectTrigger id="ss-run-at" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RUN_AT_OPTIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {value}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ss-position">Position</Label>
            <Input
              id="ss-position"
              type="number"
              value={overrides.position ?? record.position}
              onChange={(e) => setOverrides({ ...overrides, position: Number(e.target.value) })}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="ss-tags">Tags (comma-separated)</Label>
            <Input
              id="ss-tags"
              value={tagsText}
              onChange={(e) => {
                setTagsText(e.target.value)
                setOverrides({
                  ...overrides,
                  tags: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                })
              }}
            />
          </div>
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
