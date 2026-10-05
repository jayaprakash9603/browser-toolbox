import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { ToolActions, useTransformTool } from '../_shared'
import { StatCard } from '../line-counter/Tool'
import { analyzeText } from './logic'

export default function WordCounterTool() {
  const { t } = useTranslation()
  const tool = useTransformTool('text.word-counter')
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
        <div className="grid grid-cols-3 gap-2 @[400px]:grid-cols-4">
          <StatCard label={t('text.words')} value={stats.words} />
          <StatCard label={t('text.characters')} value={stats.characters} />
          <StatCard label={t('text.noSpaces')} value={stats.charactersNoSpaces} />
          <StatCard label={t('text.totalLines')} value={stats.lines} />
          <StatCard label={t('text.paragraphCount')} value={stats.paragraphs} />
          <StatCard label={t('text.sentenceCount')} value={stats.sentences} />
          <StatCard label={t('text.readingTime')} value={formatReadingTime(stats.readingTimeSeconds, t)} />
        </div>
        <ToolActions value={input} onClear={() => setInput('')} />
      </div>
    </ToolPage>
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
