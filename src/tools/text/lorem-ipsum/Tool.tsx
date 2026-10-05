import { useState } from 'react'

import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { Tabs, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import { ToolActions, useTransformTool } from '../_shared'
import { generateLorem, type LoremMode } from './logic'

export default function LoremIpsumTool() {
  const tool = useTransformTool('text.lorem-ipsum')
  const [mode, setMode] = useState<LoremMode>('paragraphs')
  const [count, setCount] = useState(3)
  const [output, setOutput] = useState('')

  const max = mode === 'words' ? 500 : 50

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <Tabs value={mode} onValueChange={(value) => setMode(value as LoremMode)}>
            <TabsList>
              <TabsTrigger value="paragraphs">Paragraphs</TabsTrigger>
              <TabsTrigger value="sentences">Sentences</TabsTrigger>
              <TabsTrigger value="words">Words</TabsTrigger>
            </TabsList>
          </Tabs>
          <Input
            type="number"
            min={1}
            max={max}
            value={count}
            onChange={(event) => {
              const value = Number(event.target.value)
              if (Number.isFinite(value)) setCount(Math.min(Math.max(1, value), max))
            }}
            className="w-20"
            aria-label="Count"
          />
          <Button size="sm" onClick={() => setOutput(generateLorem(mode, count))}>
            Generate
          </Button>
        </div>

        {output && (
          <div>
            <div className="mb-1 flex items-center justify-between">
              <span className="text-xs font-medium">Generated text</span>
              <ToolActions value={output} onClear={() => setOutput('')} />
            </div>
            <TextEditor value={output} readOnly mono={false} ariaLabel="Generated lorem ipsum" minRows={10} />
          </div>
        )}
      </div>
    </ToolPage>
  )
}
