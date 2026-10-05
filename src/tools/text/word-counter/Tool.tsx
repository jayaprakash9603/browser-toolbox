import { useMemo, useState } from 'react'

import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { ToolActions, useTransformTool } from '../_shared'
import { StatCard } from '../line-counter/Tool'
import { analyzeText, formatReadingTime } from './logic'

export default function WordCounterTool() {
  const tool = useTransformTool('text.word-counter')
  const [input, setInput] = useState('')
  const stats = useMemo(() => analyzeText(input), [input])

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <TextEditor
          value={input}
          onChange={setInput}
          placeholder="Start typing or paste text…"
          ariaLabel="Text to analyze"
          minRows={8}
        />
        <div className="grid grid-cols-3 gap-2 @[400px]:grid-cols-4">
          <StatCard label="Words" value={stats.words} />
          <StatCard label="Characters" value={stats.characters} />
          <StatCard label="No spaces" value={stats.charactersNoSpaces} />
          <StatCard label="Lines" value={stats.lines} />
          <StatCard label="Paragraphs" value={stats.paragraphs} />
          <StatCard label="Sentences" value={stats.sentences} />
          <StatCard label="Reading time" value={formatReadingTime(stats.readingTimeSeconds)} />
        </div>
        <ToolActions value={input} onClear={() => setInput('')} />
      </div>
    </ToolPage>
  )
}
