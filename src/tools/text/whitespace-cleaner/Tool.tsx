import { useState } from 'react'

import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Switch } from '@/shared/components/ui/switch'
import { Button } from '@/shared/components/ui/button'
import { StatsBar, ToolActions, useTransformTool } from '../_shared'
import {
  cleanWhitespace,
  DEFAULT_WHITESPACE_OPTIONS,
  type WhitespaceOptions,
} from './logic'

const OPTION_LABELS: { key: keyof WhitespaceOptions; label: string }[] = [
  { key: 'trimLines', label: 'Trim every line' },
  { key: 'collapseSpaces', label: 'Collapse multiple spaces' },
  { key: 'normalizeLineBreaks', label: 'Normalize line breaks' },
  { key: 'removeBlankLines', label: 'Remove blank lines' },
]

export default function WhitespaceCleanerTool() {
  const tool = useTransformTool('text.whitespace-cleaner')
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [options, setOptions] = useState<WhitespaceOptions>(DEFAULT_WHITESPACE_OPTIONS)

  const clean = () => setOutput(cleanWhitespace(input, options))

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <div>
          <TextEditor
            value={input}
            onChange={setInput}
            placeholder="Paste text with messy whitespace…"
            ariaLabel="Input text"
            onKeyCommand={clean}
          />
          <StatsBar value={input} />
        </div>

        <div className="grid grid-cols-1 gap-2 @[380px]:grid-cols-2">
          {OPTION_LABELS.map(({ key, label }) => (
            <label key={key} className="flex items-center justify-between gap-2 text-xs">
              {label}
              <Switch
                checked={options[key]}
                onCheckedChange={(checked) =>
                  setOptions((prev) => ({ ...prev, [key]: checked }))
                }
                aria-label={label}
              />
            </label>
          ))}
        </div>

        <Button size="sm" onClick={clean} disabled={!input}>
          Clean text
        </Button>

        {output !== '' && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium">Output</span>
              <ToolActions value={output} onClear={() => setOutput('')} />
            </div>
            <TextEditor value={output} readOnly ariaLabel="Cleaned text" />
          </div>
        )}
      </div>
    </ToolPage>
  )
}
