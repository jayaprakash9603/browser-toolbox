import { useMemo, useState } from 'react'
import { SparklesIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { formatSql, minifySql, SQL_DIALECTS, type SqlDialect } from '@/core/engines/sql'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { JsonErrorView, OutputPane, useDevTool } from '../_shared'

const EXAMPLE =
  "select id, name, email from users where active = true and created_at > '2024-01-01' order by name"

export default function SqlToolkitTool() {
  const { t } = useTranslation()
  const tool = useDevTool('developer.sql-toolkit')
  const [tab, setTab] = useState<'format' | 'minify'>('format')
  const [input, setInput] = useState('')
  const [dialect, setDialect] = useState<SqlDialect>('sql')

  const result = useMemo(() => {
    if (!input.trim()) return null
    return tab === 'format' ? formatSql(input, dialect) : minifySql(input)
  }, [input, dialect, tab])

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)} className="min-h-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <TabsList>
            <TabsTrigger value="format">{t('dev.tabFormat')}</TabsTrigger>
            <TabsTrigger value="minify">{t('text.minify')}</TabsTrigger>
          </TabsList>
          <Select value={dialect} onValueChange={(v) => setDialect(v as SqlDialect)}>
            <SelectTrigger size="sm" className="w-40" aria-label={t('dev.sqlDialect')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SQL_DIALECTS.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setInput(EXAMPLE)}>
            <SparklesIcon /> {t('dev.tryExample')}
          </Button>
        </div>
        <TabsContent value="format" className="mt-0 hidden data-[state=active]:hidden" />
        <TabsContent value="minify" className="mt-0 hidden data-[state=active]:hidden" />

        <TextPaneGrid split={Boolean(result?.ok)}>
          <TextEditor
            value={input}
            onChange={setInput}
            placeholder={t('dev.sqlPlaceholder')}
            ariaLabel={t('dev.sqlInput')}
            label="SQL"
            language="sql"
            fill
          />
          {result?.ok && (
            <OutputPane
              value={result.value}
              error={null}
              language="sql"
              label={tab === 'format' ? t('dev.tabFormat') : t('text.minify')}
              onClear={() => setInput('')}
              fill
            />
          )}
        </TextPaneGrid>
        {result && !result.ok && <JsonErrorView message={result.error} />}
      </Tabs>
    </ToolPage>
  )
}
