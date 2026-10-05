import { useMemo, useState } from 'react'

import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Switch } from '@/shared/components/ui/switch'
import { StatsBar, ToolActions, useTransformTool } from '../_shared'
import { countMatches, replaceText } from './logic'

export default function FindReplaceTool() {
  const tool = useTransformTool('text.find-replace')
  const [input, setInput] = useState('')
  const [find, setFind] = useState('')
  const [replace, setReplace] = useState('')
  const [options, setOptions] = useState({ caseSensitive: false, wholeWord: false, regex: false })
  const [applied, setApplied] = useState<number | null>(null)

  const matchCount = useMemo(() => countMatches(input, find, options), [input, find, options])

  const apply = () => {
    const result = replaceText(input, find, replace, options)
    setInput(result.output)
    setApplied(result.matchCount)
  }

  const optionDefs = [
    { key: 'caseSensitive', label: 'Case-sensitive' },
    { key: 'wholeWord', label: 'Whole word' },
    { key: 'regex', label: 'Regex' },
  ] as const

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <div>
          <TextEditor
            value={input}
            onChange={(value) => {
              setInput(value)
              setApplied(null)
            }}
            placeholder="Text to search in…"
            ariaLabel="Text"
          />
          <StatsBar value={input} />
        </div>

        <div className="flex flex-col gap-1.5">
          <Input
            value={find}
            onChange={(event) => {
              setFind(event.target.value)
              setApplied(null)
            }}
            placeholder={options.regex ? 'Find (regex)…' : 'Find…'}
            aria-label="Find"
          />
          <Input
            value={replace}
            onChange={(event) => setReplace(event.target.value)}
            placeholder="Replace with…"
            aria-label="Replace with"
          />
        </div>

        <div className="flex flex-wrap gap-4">
          {optionDefs.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 text-xs">
              <Switch
                checked={options[key]}
                onCheckedChange={(checked) => setOptions((prev) => ({ ...prev, [key]: checked }))}
                aria-label={label}
              />
              {label}
            </label>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" onClick={apply} disabled={!find || matchCount === 0}>
            Replace all
          </Button>
          <span className="text-xs text-muted-foreground" aria-live="polite">
            {find ? `${matchCount} match${matchCount === 1 ? '' : 'es'}` : 'Enter text to find'}
            {applied !== null && ` · replaced ${applied}`}
          </span>
        </div>

        <ToolActions value={input} onClear={() => setInput('')} />
      </div>
    </ToolPage>
  )
}
