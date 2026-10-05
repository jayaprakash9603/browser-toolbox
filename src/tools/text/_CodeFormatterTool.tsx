import { useState } from 'react'

import { toUserMessage } from '@/core/errors'
import { ErrorState } from '@/shared/components/ErrorState'
import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Button } from '@/shared/components/ui/button'
import { StatsBar, ToolActions, useTransformTool } from './_shared'

interface CodeFormatterToolProps {
  toolId: string
  format: (input: string) => string
  minify: (input: string) => string
  placeholder: string
  errorMessage?: string
}

export function CodeFormatterTool({
  toolId,
  format,
  minify,
  placeholder,
  errorMessage,
}: CodeFormatterToolProps) {
  const tool = useTransformTool(toolId)
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [error, setError] = useState<string | null>(null)

  const run = (fn: (value: string) => string) => {
    try {
      setOutput(fn(input))
      setError(null)
    } catch (err) {
      setError(toUserMessage(err, errorMessage ?? 'Unable to format this content.'))
    }
  }

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <div>
          <TextEditor
            value={input}
            onChange={setInput}
            placeholder={placeholder}
            ariaLabel="Source input"
            onKeyCommand={() => run(format)}
          />
          <StatsBar value={input} />
        </div>
        <div className="flex gap-1.5">
          <Button size="sm" onClick={() => run(format)} disabled={!input.trim()}>
            Beautify
          </Button>
          <Button size="sm" variant="outline" onClick={() => run(minify)} disabled={!input.trim()}>
            Minify
          </Button>
        </div>
        {error && <ErrorState message={error} />}
        {output && !error && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium">Output</span>
              <ToolActions value={output} onClear={() => setOutput('')} />
            </div>
            <TextEditor value={output} readOnly ariaLabel="Formatted output" />
          </div>
        )}
      </div>
    </ToolPage>
  )
}
