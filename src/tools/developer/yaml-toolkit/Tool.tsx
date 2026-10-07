import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { formatYaml, jsonToYaml, parseYaml, validateYaml, yamlToJson } from '@/core/engines/yaml'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { JsonErrorView, OutputPane, useDevTool } from '../_shared'

const EXAMPLE = 'name: Ada\nage: 36\nroles:\n  - dev\n  - qa\n'

export default function YamlToolkitTool() {
  const { t } = useTranslation()
  const tool = useDevTool('developer.yaml-toolkit')
  const [tab, setTab] = useState<'validate' | 'convert' | 'fromJson'>('validate')
  const [input, setInput] = useState('')
  const [jsonInput, setJsonInput] = useState('')

  const validation = useMemo(() => (input.trim() ? validateYaml(input) : null), [input])
  const valid = validation?.valid === true
  const formatted = useMemo(() => (valid ? formatYaml(input) : null), [valid, input])
  const json = useMemo(() => (valid ? yamlToJson(input) : null), [valid, input])
  const fromJson = useMemo(() => (jsonInput.trim() ? jsonToYaml(jsonInput) : null), [jsonInput])

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="validate">{t('dev.tabValidate')}</TabsTrigger>
            <TabsTrigger value="convert">YAML → JSON</TabsTrigger>
            <TabsTrigger value="fromJson">JSON → YAML</TabsTrigger>
          </TabsList>
        </Tabs>

        {tab !== 'fromJson' && (
          <>
            <TextEditor value={input} onChange={setInput} placeholder={t('dev.yamlPlaceholder')} ariaLabel={t('dev.yamlInput')} minRows={6} />
            {validation && !validation.valid && validation.error && <JsonErrorView message={validation.error} />}
          </>
        )}

        <TabsContent value="validate" className="mt-0">
          <div className="flex flex-col gap-2">
            <div className="flex gap-1.5">
              <Button size="sm" disabled={!valid} onClick={() => formatted?.ok && setInput(formatted.value)}>{t('text.beautify')}</Button>
              <Button size="sm" variant="ghost" onClick={() => setInput(EXAMPLE)}>{t('dev.tryExample')}</Button>
            </div>
            {valid && (
              <div className="rounded-md border border-green-500/40 bg-green-500/5 p-3 text-xs text-green-700 dark:text-green-400">{t('dev.yamlValid')}</div>
            )}
            {valid && parseYaml(input).ok && <Badge variant="outline">{t('dev.yamlValidBadge')}</Badge>}
          </div>
        </TabsContent>

        <TabsContent value="convert" className="mt-0">
          {json && (
            json.ok
              ? <OutputPane value={json.value} error={null} onClear={() => setInput('')} />
              : <JsonErrorView message={json.error} />
          )}
        </TabsContent>

        <TabsContent value="fromJson" className="mt-0">
          <div className="flex flex-col gap-2">
            <TextEditor value={jsonInput} onChange={setJsonInput} placeholder={t('dev.jsonForYaml')} ariaLabel={t('dev.jsonForYaml')} minRows={6} />
            {fromJson && (
              fromJson.ok
                ? <OutputPane value={fromJson.value} error={null} onClear={() => setJsonInput('')} />
                : <JsonErrorView message={fromJson.error} />
            )}
          </div>
        </TabsContent>
      </div>
    </ToolPage>
  )
}
