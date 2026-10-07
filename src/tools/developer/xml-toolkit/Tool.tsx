import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { formatXml, minifyXml, validateXml, xmlToJson } from '@/core/engines/xml'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Badge } from '@/shared/components/ui/badge'
import { Button } from '@/shared/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { JsonErrorView, OutputPane, useDevTool } from '../_shared'

const EXAMPLE = '<note>\n  <to>Ada</to>\n  <body>Hi</body>\n</note>'

export default function XmlToolkitTool() {
  const { t } = useTranslation()
  const tool = useDevTool('developer.xml-toolkit')
  const [tab, setTab] = useState<'format' | 'validate' | 'convert'>('format')
  const [input, setInput] = useState('')

  const validation = useMemo(() => (input.trim() ? validateXml(input) : null), [input])
  const valid = validation?.valid === true
  const formatted = useMemo(() => (valid ? formatXml(input) : null), [valid, input])
  const minified = useMemo(() => (valid ? minifyXml(input) : null), [valid, input])
  const json = useMemo(() => (valid ? xmlToJson(input) : null), [valid, input])

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
          <TabsList>
            <TabsTrigger value="format">{t('dev.tabFormat')}</TabsTrigger>
            <TabsTrigger value="validate">{t('dev.tabValidate')}</TabsTrigger>
            <TabsTrigger value="convert">{t('dev.tabConvertJson')}</TabsTrigger>
          </TabsList>

        <TextEditor
          value={input}
          onChange={setInput}
          placeholder={t('dev.xmlPlaceholder')}
          ariaLabel={t('dev.xmlInput')}
          minRows={6}
        />
        {validation && !validation.valid && validation.error && (
          <JsonErrorView
            message={validation.error.message}
            line={validation.error.line}
            column={validation.error.column}
          />
        )}

        <TabsContent value="format" className="mt-0">
          <div className="flex flex-col gap-2">
            <div className="flex gap-1.5">
              <Button
                size="sm"
                disabled={!valid}
                onClick={() => formatted?.ok && setInput(formatted.value)}
              >
                {t('text.beautify')}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!valid}
                onClick={() => minified?.ok && setInput(minified.value)}
              >
                {t('text.minify')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setInput(EXAMPLE)}>
                {t('dev.tryExample')}
              </Button>
            </div>
            {valid && <Badge variant="outline">{t('dev.xmlValid')}</Badge>}
          </div>
        </TabsContent>

        <TabsContent value="validate" className="mt-0">
          {valid ? (
            <div className="rounded-md border border-green-500/40 bg-green-500/5 p-3 text-xs text-green-700 dark:text-green-400">
              {t('dev.xmlValidDetail')}
            </div>
          ) : (
            validation?.error && (
              <JsonErrorView
                message={validation.error.message}
                line={validation.error.line}
                column={validation.error.column}
              />
            )
          )}
        </TabsContent>

        <TabsContent value="convert" className="mt-0">
          {json &&
            (json.ok ? (
              <OutputPane value={json.value} error={null} onClear={() => setInput('')} />
            ) : (
              <JsonErrorView message={json.error} />
            ))}
        </TabsContent>
          </Tabs>
      </div>
    </ToolPage>
  )
}
