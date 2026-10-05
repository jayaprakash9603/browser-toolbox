import { useState } from 'react'

import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Switch } from '@/shared/components/ui/switch'
import { Button } from '@/shared/components/ui/button'
import { StatsBar, ToolActions, useTransformTool } from '../_shared'
import { removeDuplicateLines, type DedupeResult } from './logic'

export default function DuplicateLineRemoverTool() {
  const tool = useTransformTool('text.duplicate-line-remover')
  const [input, setInput] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [trimFirst, setTrimFirst] = useState(true)
  const [result, setResult] = useState<DedupeResult | null>(null)

  const run = () => setResult(removeDuplicateLines(input, { caseSensitive, trimFirst }))

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <div>
          <TextEditor
            value={input}
            onChange={setInput}
            placeholder={'apple\nbanana\napple\norange'}
            ariaLabel="Input lines"
            onKeyCommand={run}
          />
          <StatsBar value={input} />
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={caseSensitive} onCheckedChange={setCaseSensitive} aria-label="Case sensitive" />
            Case-sensitive
          </label>
          <label className="flex items-center gap-2 text-xs">
            <Switch checked={trimFirst} onCheckedChange={setTrimFirst} aria-label="Trim before comparison" />
            Trim before comparing
          </label>
        </div>

        <Button size="sm" onClick={run} disabled={!input}>
          Remove duplicates
        </Button>

        {result && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium">
                Output{' '}
                <span className="text-muted-foreground">({result.removedCount} removed)</span>
              </span>
              <ToolActions value={result.output} onClear={() => setResult(null)} />
            </div>
            <TextEditor value={result.output} readOnly ariaLabel="Deduplicated lines" />
          </div>
        )}
      </div>
    </ToolPage>
  )
}
