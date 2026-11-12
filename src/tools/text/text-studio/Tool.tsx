import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  analyzeText,
  CASE_STYLES,
  cleanWhitespace,
  convertCase,
  DEFAULT_WHITESPACE_OPTIONS,
  removeDuplicateLines,
  sortLines,
} from '@/core/engines/text'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Button } from '@/shared/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { useTransformTool } from '../_shared'

type Mode = 'format' | 'case' | 'clean' | 'analyze' | 'lines'

export default function TextStudioTool() {
  const { t } = useTranslation()
  const tool = useTransformTool('text.studio')
  const [mode, setMode] = useState<Mode>('format')
  const [input, setInput] = useState('')
  const [result, setResult] = useState('')

  const stats = useMemo(() => analyzeText(input), [input])
  const apply = (next: string) => {
    setInput(next)
    setResult('')
  }
  const run = (action: Mode | string) => {
    if (action === 'clean') {
      apply(cleanWhitespace(input, DEFAULT_WHITESPACE_OPTIONS))
    } else if (action === 'lines') {
      apply(removeDuplicateLines(input, { caseSensitive: false, trimFirst: true }).output)
    } else if (action === 'format') {
      apply(input.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n'))
    } else if (action.startsWith('case:')) {
      apply(convertCase(input, action.slice(5) as Parameters<typeof convertCase>[1]))
    } else if (action.startsWith('sort:')) {
      apply(sortLines(input, action.slice(5) as Parameters<typeof sortLines>[1]))
    }
  }

  return (
    <ToolPage tool={tool} contentClassName="flex min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-2.5">
        <div className="flex shrink-0 items-center gap-2 overflow-x-auto pb-0.5">
          <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
            <TabsList variant="attached" fullWidth>
              <TabsTrigger value="format">Format</TabsTrigger>
              <TabsTrigger value="case">Case</TabsTrigger>
              <TabsTrigger value="clean">Clean</TabsTrigger>
              <TabsTrigger value="analyze">Analyze</TabsTrigger>
              <TabsTrigger value="lines">Lines</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button size="sm" variant="ghost" className="ml-auto shrink-0" onClick={() => apply('Try an example text.\nTry another line.')}>
            Try example
          </Button>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {mode === 'format' && <Button size="sm" onClick={() => run('format')} disabled={!input}>Beautify</Button>}
          {mode === 'case' && CASE_STYLES.slice(0, 6).map((style) => <Button key={style.id} size="sm" variant="outline" onClick={() => run(`case:${style.id}`)} disabled={!input}>{style.label}</Button>)}
          {mode === 'clean' && <Button size="sm" onClick={() => run('clean')} disabled={!input}>Clean whitespace</Button>}
          {mode === 'lines' && <Button size="sm" onClick={() => run('lines')} disabled={!input}>Remove duplicates</Button>}
          {mode === 'analyze' && <span className="text-xs text-muted-foreground">{stats.words} words · {stats.characters} characters · {stats.lines} lines</span>}
        </div>

        <TextEditor
          value={input}
          onChange={setInput}
          fill
          enableSearch={false}
          label={t('common.input')}
          ariaLabel={t('text.input')}
          placeholder="Paste or type text…"
          status={result ? { tone: 'valid', text: result } : null}
        />
      </div>
    </ToolPage>
  )
}
