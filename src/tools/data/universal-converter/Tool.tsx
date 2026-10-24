import { useMemo, useState } from 'react'

import { useDeepLinkParam } from '@/shared/hooks/useDeepLinkTab'
import { useTranslation } from 'react-i18next'

import { csvToJson } from '@/core/engines/csv'
import {
  formatJson,
  jsonToCsv,
  jsonToXml,
  jsonToMarkdownTable,
  parseJson,
} from '@/core/engines/json'
import { xmlToJson } from '@/core/engines/xml'
import { jsonToYaml, yamlToJson } from '@/core/engines/yaml'
import { toolRegistry } from '@/core/registry'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { TextPaneGrid } from '@/shared/components/TextPaneGrid'
import { Button } from '@/shared/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import type { EditorLanguage } from '@/shared/lib/code-editor/languages'
import { OutputPane } from '@/tools/developer/_shared'

type DataFormat = 'json' | 'csv' | 'xml' | 'yaml' | 'markdown' | 'tsv'

const FORMATS: DataFormat[] = ['json', 'csv', 'xml', 'yaml', 'markdown', 'tsv']

function editorLanguage(format: DataFormat): EditorLanguage {
  if (format === 'json') return 'json'
  if (format === 'xml') return 'xml'
  if (format === 'yaml') return 'yaml'
  return 'text'
}

function convert(input: string, from: DataFormat, to: DataFormat): string {
  if (from === to) return input
  if (from === 'tsv' && to === 'csv') {
    return input.replace(/\t/g, ',')
  }
  if (from === 'csv' && to === 'tsv') {
    return input.replace(/,/g, '\t')
  }

  let jsonValue: unknown
  if (from === 'json') {
    const parsed = parseJson(input)
    if (!parsed.ok) throw new Error(parsed.error.message)
    jsonValue = parsed.value
  } else if (from === 'csv' || from === 'tsv') {
    const csv = from === 'tsv' ? input.replace(/\t/g, ',') : input
    const parsed = csvToJson(csv)
    if (!parsed.ok) throw new Error(parsed.error)
    const inner = parseJson(String(parsed.value))
    if (!inner.ok) throw new Error(inner.error.message)
    jsonValue = inner.value
  } else if (from === 'xml') {
    const parsed = xmlToJson(input)
    if (!parsed.ok) throw new Error(parsed.error)
    const inner = parseJson(String(parsed.value))
    if (!inner.ok) throw new Error(inner.error.message)
    jsonValue = inner.value
  } else if (from === 'yaml') {
    const parsed = yamlToJson(input)
    if (!parsed.ok) throw new Error(parsed.error)
    const inner = parseJson(String(parsed.value))
    if (!inner.ok) throw new Error(inner.error.message)
    jsonValue = inner.value
  } else {
    throw new Error('Markdown table input is not supported as a source format.')
  }

  if (to === 'json') {
    const formatted = formatJson(JSON.stringify(jsonValue))
    if (!formatted.ok) throw new Error(formatted.error.message)
    return formatted.value
  }
  if (to === 'csv') {
    const csv = jsonToCsv(jsonValue)
    if (!csv.ok) throw new Error(csv.error.message)
    return csv.value
  }
  if (to === 'tsv') {
    const csv = jsonToCsv(jsonValue)
    if (!csv.ok) throw new Error(csv.error.message)
    return csv.value.replace(/,/g, '\t')
  }
  if (to === 'xml') {
    const xml = jsonToXml(jsonValue)
    if (!xml.ok) throw new Error(xml.error.message)
    return xml.value
  }
  if (to === 'yaml') {
    const json = formatJson(JSON.stringify(jsonValue))
    if (!json.ok) throw new Error(json.error.message)
    const yaml = jsonToYaml(json.value)
    if (!yaml.ok) throw new Error(yaml.error)
    return yaml.value
  }
  if (to === 'markdown') {
    const table = jsonToMarkdownTable(jsonValue)
    if (!table.ok) throw new Error(table.error.message)
    return table.value
  }
  return input
}

export default function UniversalConverterTool() {
  const { t } = useTranslation()
  const tool = toolRegistry.get('data.universal-converter')
  if (!tool) throw new Error('data.universal-converter')
  const [input, setInput] = useState('')
  const [from, setFrom] = useDeepLinkParam('from', FORMATS, 'json')
  const [to, setTo] = useDeepLinkParam('to', FORMATS, 'csv')
  const [output, setOutput] = useState('')
  const [error, setError] = useState('')

  const canConvert = useMemo(() => input.trim().length > 0 && from !== to, [input, from, to])
  const inputLanguage = editorLanguage(from)
  const outputLanguage = editorLanguage(to)

  const run = () => {
    try {
      setError('')
      setOutput(convert(input, from, to))
    } catch (conversionError) {
      setOutput('')
      setError(conversionError instanceof Error ? conversionError.message : t('data.convertFailed'))
    }
  }

  const clearOutput = () => {
    setOutput('')
    setError('')
  }

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Select value={from} onValueChange={(v) => setFrom(v as DataFormat)}>
            <SelectTrigger className="w-32" aria-label={t('data.inputFormat')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMATS.map((format) => (
                <SelectItem key={format} value={format}>
                  {format.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-xs text-muted-foreground">→</span>
          <Select value={to} onValueChange={(v) => setTo(v as DataFormat)}>
            <SelectTrigger className="w-32" aria-label={t('data.outputFormat')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FORMATS.map((format) => (
                <SelectItem key={format} value={format}>
                  {format.toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" disabled={!canConvert} onClick={run}>
            {t('data.convert')}
          </Button>
        </div>

        <TextPaneGrid split>
          <TextEditor
            value={input}
            onChange={setInput}
            placeholder={t('data.inputPlaceholder')}
            ariaLabel={t('data.input')}
            label={t('common.input')}
            language={inputLanguage}
            fill
            onKeyCommand={(command) => {
              if (command === 'submit' && canConvert) run()
            }}
          />
          <OutputPane
            value={output}
            error={error || null}
            language={outputLanguage}
            label={t('text.output')}
            onClear={clearOutput}
            fill
          />
        </TextPaneGrid>
      </div>
    </ToolPage>
  )
}
