import { useState } from 'react'
import { ArrowLeftRightIcon } from 'lucide-react'

import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Button } from '@/shared/components/ui/button'
import { Badge } from '@/shared/components/ui/badge'
import { useTransformTool } from '../_shared'
import { compareText, type DiffResult } from './logic'

export default function TextDiffTool() {
  const tool = useTransformTool('text.diff')
  const [inputA, setInputA] = useState('')
  const [inputB, setInputB] = useState('')
  const [result, setResult] = useState<DiffResult | null>(null)

  const compare = () => setResult(compareText(inputA, inputB, 'lines'))
  const swap = () => {
    setInputA(inputB)
    setInputB(inputA)
    setResult(null)
  }
  const clear = () => {
    setInputA('')
    setInputB('')
    setResult(null)
  }

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <div className="grid grid-cols-1 gap-2 @[460px]:grid-cols-2">
          <div>
            <p className="mb-1 text-xs font-medium">Input A</p>
            <TextEditor value={inputA} onChange={setInputA} ariaLabel="Input A" minRows={5} />
          </div>
          <div>
            <p className="mb-1 text-xs font-medium">Input B</p>
            <TextEditor value={inputB} onChange={setInputB} ariaLabel="Input B" minRows={5} />
          </div>
        </div>

        <div className="flex gap-1.5">
          <Button size="sm" onClick={compare} disabled={!inputA && !inputB}>
            Compare
          </Button>
          <Button size="sm" variant="outline" onClick={swap}>
            <ArrowLeftRightIcon /> Swap
          </Button>
          <Button size="sm" variant="ghost" onClick={clear}>
            Clear
          </Button>
        </div>

        {result && (
          <div>
            <div className="mb-1.5 flex items-center gap-1.5">
              <Badge variant="secondary">+{result.added}</Badge>
              <Badge variant="secondary">-{result.removed}</Badge>
              <Badge variant="outline">{result.unchanged} unchanged</Badge>
            </div>
            <div
              className="max-h-72 overflow-y-auto rounded-md border font-mono text-[11px] leading-relaxed"
              aria-label="Diff result"
            >
              {result.changes.map((change, index) => (
                <pre
                  key={index}
                  className={
                    change.added
                      ? 'bg-green-500/15 px-2 py-0.5 whitespace-pre-wrap text-green-700 dark:text-green-400'
                      : change.removed
                        ? 'bg-red-500/15 px-2 py-0.5 whitespace-pre-wrap text-red-700 dark:text-red-400'
                        : 'px-2 py-0.5 whitespace-pre-wrap text-muted-foreground'
                  }
                >
                  {change.added ? '+ ' : change.removed ? '- ' : '  '}
                  {change.value.replace(/\n$/, '')}
                </pre>
              ))}
            </div>
          </div>
        )}
      </div>
    </ToolPage>
  )
}
