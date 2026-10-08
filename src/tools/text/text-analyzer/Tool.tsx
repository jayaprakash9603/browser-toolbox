import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { analyzeText } from '@/core/engines/text'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { ToolActions, useTransformTool } from '../_shared'

export default function TextAnalyzerTool() {
  const { t } = useTranslation()
  const tool = useTransformTool('text.analyzer')
  const [input, setInput] = useState('')
  const stats = useMemo(() => analyzeText(input), [input])

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <TextEditor
          value={input}
          onChange={setInput}
          placeholder={t('text.pasteOrType')}
          ariaLabel={t('text.analyzeInput')}
          minRows={8}
        />
        <Tabs defaultValue="metrics">
          <TabsList>
            <TabsTrigger value="metrics">{t('text.tabMetrics')}</TabsTrigger>
            <TabsTrigger value="lines">{t('text.tabLines')}</TabsTrigger>
          </TabsList>
          <TabsContent value="metrics">
            <div className="grid grid-cols-3 gap-2 @[400px]:grid-cols-4">
              <StatCard label={t('text.words')} value={stats.words} />
              <StatCard label={t('text.characters')} value={stats.characters} />
              <StatCard label={t('text.noSpaces')} value={stats.charactersNoSpaces} />
              <StatCard label={t('text.paragraphCount')} value={stats.paragraphs} />
              <StatCard label={t('text.sentenceCount')} value={stats.sentences} />
              <StatCard
                label={t('text.readingTime')}
                value={formatReadingTime(stats.readingTimeSeconds, t)}
              />
              <StatCard label={t('text.avgWordLength')} value={stats.avgWordLength} />
              <StatCard label={t('text.avgSentenceLength')} value={stats.avgSentenceLength} />
            </div>
          </TabsContent>
          <TabsContent value="lines">
            <div className="grid grid-cols-3 gap-2">
              <StatCard label={t('text.totalLines')} value={stats.lines} />
              <StatCard label={t('text.nonBlank')} value={stats.lines - stats.blankLines} />
              <StatCard label={t('text.blank')} value={stats.blankLines} />
            </div>
          </TabsContent>
        </Tabs>
        <ToolActions value={input} onClear={() => setInput('')} />
      </div>
    </ToolPage>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border p-2.5 text-center">
      <p className="text-base font-semibold tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}

function formatReadingTime(seconds: number, t: ReturnType<typeof useTranslation>['t']): string {
  if (seconds < 60) return t('text.seconds', { count: seconds })
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return remainingSeconds === 0
    ? t('text.minutes', { count: minutes })
    : `${t('text.minutes', { count: minutes })} ${t('text.seconds', { count: remainingSeconds })}`
}
