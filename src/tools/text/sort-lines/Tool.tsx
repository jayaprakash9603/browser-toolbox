import { useState } from 'react'

import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Switch } from '@/shared/components/ui/switch'
import { StatsBar, ToolActions, useTransformTool } from '../_shared'
import { SORT_MODES, sortLines, type SortMode } from './logic'

export default function SortLinesTool() {
  const tool = useTransformTool('text.sort-lines')
  const [input, setInput] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [result, setResult] = useState<{ mode: SortMode; output: string } | null>(null)

  const run = (mode: SortMode) => setResult({ mode, output: sortLines(input, mode, caseSensitive) })

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <div>
          <TextEditor
            value={input}
            onChange={setInput}
            placeholder={'banana\nApple\n10\n2'}
            ariaLabel="Lines to sort"
          />
          <StatsBar value={input} />
        </div>

        <label className="flex w-fit items-center gap-2 text-xs">
          <Switch checked={caseSensitive} onCheckedChange={setCaseSensitive} aria-label="Case sensitive" />
          Case-sensitive
        </label>

        <div className="grid grid-cols-2 gap-1.5 @[380px]:grid-cols-3">
          {SORT_MODES.map((mode) => (
            <button
              key={mode.id}
              onClick={() => run(mode.id)}
              disabled={!input}
              className="h-7 cursor-pointer rounded-md border px-2 text-xs font-medium transition-colors hover:bg-accent disabled:opacity-50"
            >
              {mode.label}
            </button>
          ))}
        </div>

        {result && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium">
                {SORT_MODES.find((m) => m.id === result.mode)?.label}
              </span>
              <ToolActions value={result.output} onClear={() => setResult(null)} />
            </div>
            <TextEditor value={result.output} readOnly ariaLabel="Sorted lines" />
          </div>
        )}
      </div>
    </ToolPage>
  )
}
