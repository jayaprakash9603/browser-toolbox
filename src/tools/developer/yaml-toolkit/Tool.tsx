import { useMemo, useState } from 'react'
import { SparklesIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { formatYaml, jsonToYaml, validateYaml, yamlToJson } from '@/core/engines/yaml'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { TextPaneGrid } from '@/shared/components/TextPaneGrid'
import { Button } from '@/shared/components/ui/button'
import { Segmented } from '@/shared/components/ui/segmented'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { JsonErrorView, OutputPane, useDevTool } from '../_shared'

const EXAMPLE = 'name: Ada\nage: 36\nroles:\n  - dev\n  - qa\n'
const JSON_EXAMPLE = '{\n  "name": "Ada",\n  "roles": ["dev", "qa"]\n}'

type YamlTab = 'validate' | 'convert' | 'fromJson'

export default function YamlToolkitTool() {
  const { t } = useTranslation()
  const tool = useDevTool('developer.yaml-toolkit')
  const [tab, setTab] = useState<YamlTab>('validate')
  const [input, setInput] = useState('')
  const [jsonInput, setJsonInput] = useState('')
  const [indent, setIndent] = useState<'2' | '4'>('2')

  const validation = useMemo(() => (input.trim() ? validateYaml(input) : null), [input])
  const valid = validation?.valid === true
  const json = useMemo(() => (valid ? yamlToJson(input) : null), [valid, input])
  const fromJson = useMemo(() => (jsonInput.trim() ? jsonToYaml(jsonInput) : null), [jsonInput])
  const fromJsonMode = tab === 'fromJson'

  const beautify = () => {
    const result = formatYaml(input, Number(indent))
    if (result.ok) setInput(result.value)
  }

  const yamlStatus = validation
    ? valid
      ? { tone: 'valid' as const, text: t('dev.yamlValidBadge') }
      : { tone: 'invalid' as const, text: t('editor.invalid') }
    : null
  const jsonStatus = fromJson
    ? fromJson.ok
      ? { tone: 'valid' as const, text: t('editor.valid') }
      : { tone: 'invalid' as const, text: t('editor.invalid') }
    : null

  const output = fromJsonMode
    ? fromJson?.ok
      ? <OutputPane value={fromJson.value} error={null} language="yaml" label="YAML" onClear={() => setJsonInput('')} fill />
      : null
    : tab === 'convert' && json?.ok
      ? <OutputPane value={json.value} error={null} language="json" label="JSON" onClear={() => setInput('')} fill />
      : null

  const error = fromJsonMode
    ? fromJson && !fromJson.ok ? fromJson.error : null
    : validation && !validation.valid
      ? validation.error
      : tab === 'convert' && json && !json.ok
        ? json.error
        : null

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <Tabs value={tab} onValueChange={(v) => setTab(v as YamlTab)} className="min-h-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <TabsList className="scrollbar-none max-w-full overflow-x-auto">
            <TabsTrigger value="validate">{t('dev.tabValidate')}</TabsTrigger>
            <TabsTrigger value="convert">YAML → JSON</TabsTrigger>
            <TabsTrigger value="fromJson">JSON → YAML</TabsTrigger>
          </TabsList>
          <Button
            size="sm"
            variant="ghost"
            className="ml-auto"
            onClick={() => (fromJsonMode ? setJsonInput(JSON_EXAMPLE) : setInput(EXAMPLE))}
          >
            <SparklesIcon /> {t('dev.tryExample')}
          </Button>
        </div>

        <TabsContent value="validate" className="mt-0 flex-none">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={!valid} onClick={beautify}>
              {t('text.beautify')}
            </Button>
            <span className="ml-1 text-xs text-muted-foreground">{t('editor.indent')}</span>
            <Segmented
              value={indent}
              onValueChange={setIndent}
              ariaLabel={t('editor.indent')}
              size="sm"
              options={[
                { value: '2', label: '2' },
                { value: '4', label: '4' },
              ]}
            />
            {valid && <span className="text-xs text-emerald-700 dark:text-emerald-400">{t('dev.yamlValid')}</span>}
          </div>
        </TabsContent>
        <TabsContent value="convert" className="mt-0 hidden" />
        <TabsContent value="fromJson" className="mt-0 hidden" />

        <TextPaneGrid split={Boolean(output)}>
          {fromJsonMode ? (
            <TextEditor
              key="json"
              value={jsonInput}
              onChange={setJsonInput}
              placeholder={t('dev.jsonForYaml')}
              ariaLabel={t('dev.jsonForYaml')}
              label="JSON"
              language="json"
              status={jsonStatus}
              fill
            />
          ) : (
            <TextEditor
              key="yaml"
              value={input}
              onChange={setInput}
              placeholder={t('dev.yamlPlaceholder')}
              ariaLabel={t('dev.yamlInput')}
              label="YAML"
              language="yaml"
              status={yamlStatus}
              onKeyCommand={beautify}
              fill
            />
          )}
          {output}
        </TextPaneGrid>

        {error && (
          <div className="scrollbar-styled max-h-32 shrink-0">
            <JsonErrorView message={error} />
          </div>
        )}
      </Tabs>
    </ToolPage>
  )
}
