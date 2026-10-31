import { useMemo, useState } from 'react'

import { useDeepLinkTab } from '@/shared/hooks/useDeepLinkTab'
import { usePayloadText } from '@/shared/hooks/usePayloadText'
import { SparklesIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { formatXml, minifyXml, validateXml, xmlToJson } from '@/core/engines/xml'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { TextPaneGrid } from '@/shared/components/TextPaneGrid'
import { Button } from '@/shared/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { JsonErrorView, OutputPane, useDevTool } from '../_shared'

const EXAMPLE = '<note>\n  <to>Ada</to>\n  <body>Hi</body>\n</note>'

type XmlTab = 'format' | 'validate' | 'convert'

export default function XmlToolkitTool() {
  const { t } = useTranslation()
  const tool = useDevTool('developer.xml-toolkit')
  const [tab, setTab] = useDeepLinkTab('tab', ['format', 'validate', 'convert'] as const, 'format')
  const [input, setInput] = useState('')
  usePayloadText(tool.id, setInput)

  const validation = useMemo(() => (input.trim() ? validateXml(input) : null), [input])
  const valid = validation?.valid === true
  const json = useMemo(() => (valid ? xmlToJson(input) : null), [valid, input])

  const apply = (transform: typeof formatXml) => {
    const result = transform(input)
    if (result.ok) setInput(result.value)
  }

  const status = validation
    ? valid
      ? { tone: 'valid' as const, text: t('dev.xmlValid') }
      : { tone: 'invalid' as const, text: t('editor.invalid') }
    : null

  const output =
    tab === 'convert' && json?.ok ? (
      <OutputPane value={json.value} error={null} language="json" label="JSON" onClear={() => setInput('')} fill />
    ) : null

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <Tabs value={tab} onValueChange={(v) => setTab(v as XmlTab)} className="min-h-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <TabsList className="max-w-full justify-start">
            <TabsTrigger value="format">{t('dev.tabFormat')}</TabsTrigger>
            <TabsTrigger value="validate">{t('dev.tabValidate')}</TabsTrigger>
            <TabsTrigger value="convert">{t('dev.tabConvertJson')}</TabsTrigger>
          </TabsList>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setInput(EXAMPLE)}>
            <SparklesIcon /> {t('dev.tryExample')}
          </Button>
        </div>

        <TabsContent value="format" className="mt-0 flex-none">
          <div className="flex flex-wrap items-center gap-2">
            <Button size="sm" disabled={!valid} onClick={() => apply(formatXml)}>
              {t('text.beautify')}
            </Button>
            <Button size="sm" variant="outline" disabled={!valid} onClick={() => apply(minifyXml)}>
              {t('text.minify')}
            </Button>
          </div>
        </TabsContent>
        <TabsContent value="validate" className="mt-0 flex-none">
          {valid && (
            <p className="rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
              {t('dev.xmlValidDetail')}
            </p>
          )}
        </TabsContent>
        <TabsContent value="convert" className="mt-0 hidden data-[state=active]:hidden" />

        <TextPaneGrid split={Boolean(output)}>
          <TextEditor
            value={input}
            onChange={setInput}
            placeholder={t('dev.xmlPlaceholder')}
            ariaLabel={t('dev.xmlInput')}
            label="XML"
            language="xml"
            status={status}
            onKeyCommand={() => apply(formatXml)}
            fill
          />
          {output}
        </TextPaneGrid>

        {validation && !validation.valid && validation.error && (
          <div className="scrollbar-styled max-h-32 shrink-0">
            <JsonErrorView
              message={validation.error.message}
              line={validation.error.line}
              column={validation.error.column}
            />
          </div>
        )}
        {tab === 'convert' && json && !json.ok && <JsonErrorView message={json.error} />}
      </Tabs>
    </ToolPage>
  )
}
