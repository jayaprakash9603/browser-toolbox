import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { formatSql, minifySql, SQL_DIALECTS, type SqlDialect } from '@/core/engines/sql'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Button } from '@/shared/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { JsonErrorView, OutputPane, useDevTool } from '../_shared'

const EXAMPLE = 'select id, name, email from users where active = true and created_at > \'2024-01-01\' order by name'

export default function SqlToolkitTool() {
  const { t } = useTranslation()
  const tool = useDevTool('developer.sql-toolkit')
  const [tab, setTab] = useState<'format' | 'minify'>('format')
  const [input, setInput] = useState('')
  const [dialect, setDialect] = useState<SqlDialect>('sql')

  const formatted = useMemo(() => (input.trim() ? formatSql(input, dialect) : null), [input, dialect])
  const minified = useMemo(() => (input.trim() ? minifySql(input) : null), [input])

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="flex items-center gap-2">
          <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
            <TabsList>
              <TabsTrigger value="format">{t('dev.tabFormat')}</TabsTrigger>
              <TabsTrigger value="minify">{t('text.minify')}</TabsTrigger>
            </TabsList>
          </Tabs>
          <Select value={dialect} onValueChange={(v) => setDialect(v as SqlDialect)}>
            <SelectTrigger size="sm" className="w-40" aria-label={t('dev.sqlDialect')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SQL_DIALECTS.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <TextEditor value={input} onChange={setInput} placeholder={t('dev.sqlPlaceholder')} ariaLabel={t('dev.sqlInput')} minRows={6} />
        <div>
          <Button size="sm" variant="ghost" onClick={() => setInput(EXAMPLE)}>{t('dev.tryExample')}</Button>
        </div>

        <TabsContent value="format" className="mt-0">
          {formatted && (
            formatted.ok
              ? <OutputPane value={formatted.value} error={null} onClear={() => setInput('')} />
              : <JsonErrorView message={formatted.error} />
          )}
        </TabsContent>

        <TabsContent value="minify" className="mt-0">
          {minified && (
            minified.ok
              ? <OutputPane value={minified.value} error={null} onClear={() => setInput('')} />
              : <JsonErrorView message={minified.error} />
          )}
        </TabsContent>
      </div>
    </ToolPage>
  )
}
