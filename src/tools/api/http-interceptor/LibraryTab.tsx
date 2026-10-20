import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  MAX_LIBRARY_ITEM_BYTES,
  newRuleId,
  upsertLibraryItem,
  deleteLibraryItem,
  type InterceptorState,
  type LibraryItem,
} from '@/core/interceptor'
import { importCharlesXml } from '@/core/interceptor/importers/charles'
import { importModHeaderProfiles } from '@/core/interceptor/importers/modheader'
import { importRequestlyJson, exportRulesJson } from '@/core/interceptor/importers/requestly'
import { importResourceOverride } from '@/core/interceptor/importers/resourceOverride'
import { getInterceptorState, saveRules } from '@/core/interceptor'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Textarea } from '@/shared/components/ui/textarea'
interface Props {
  state: InterceptorState
  onStateChange: (state: InterceptorState) => void
}

export function LibraryTab({ state, onStateChange }: Props) {
  const { t } = useTranslation()
  const [name, setName] = useState('Mock response')
  const [content, setContent] = useState('{}')
  const [importWarnings, setImportWarnings] = useState<string[]>([])

  const addItem = async () => {
    if (content.length > MAX_LIBRARY_ITEM_BYTES) return
    const item: LibraryItem = {
      id: newRuleId(),
      name,
      kind: 'json',
      content,
      updatedAt: Date.now(),
    }
    await upsertLibraryItem(item)
    onStateChange({ ...state, library: [...state.library, item] })
  }

  const onImportFile = async (file: File) => {
    const text = await file.text()
    const ext = file.name.toLowerCase()
    let rules = [...state.rules]
    const warnings: string[] = []
    if (ext.endsWith('.xml')) {
      const r = importCharlesXml(text)
      rules.push(...r.rules)
      warnings.push(...r.warnings)
    } else {
      const rq = importRequestlyJson(text)
      const mod = importModHeaderProfiles(text)
      const ro = importResourceOverride(text)
      rules.push(...rq.rules, ...mod.rules, ...ro.rules)
      warnings.push(...rq.warnings, ...mod.warnings, ...ro.warnings)
    }
    await saveRules(rules)
    const next = await getInterceptorState()
    onStateChange(next)
    setImportWarnings(warnings.filter(Boolean))
  }

  const exportAll = () => {
    const blob = new Blob([exportRulesJson(state.rules, state.groups)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'http-interceptor-rules.json'
    a.click()
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={exportAll}>{t('interceptor.export')}</Button>
        <label className="inline-flex cursor-pointer items-center">
          <Button type="button" variant="outline" size="sm" asChild>
            <span>{t('interceptor.import')}</span>
          </Button>
          <input
            type="file"
            accept=".json,.xml"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void onImportFile(f)
            }}
          />
        </label>
      </div>
      {importWarnings.length > 0 && (
        <ul className="text-xs text-muted-foreground">
          {importWarnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}
      <div className="rounded-lg border p-3">
        <p className="mb-2 text-sm font-medium">{t('interceptor.library.add')}</p>
        <Input value={name} onChange={(e) => setName(e.target.value)} className="mb-2" />
        <Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={6} className="font-mono text-xs" />
        <Button type="button" size="sm" className="mt-2" onClick={() => void addItem()}>Save</Button>
      </div>
      <ul className="space-y-2 text-sm">
        {state.library.map((item) => (
          <li key={item.id} className="flex items-center justify-between rounded-md border px-2 py-1">
            <span>{item.name}</span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                void deleteLibraryItem(item.id).then(() =>
                  onStateChange({ ...state, library: state.library.filter((i) => i.id !== item.id) }),
                )
              }
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
