import { useState } from 'react'
import { EraserIcon } from 'lucide-react'

import { toolRegistry } from '@/core/registry'
import { addClipboardEntry } from '@/core/clipboard'
import { CopyButton } from '@/shared/components/CopyButton'
import { useTextStats } from '@/shared/hooks/useTextStats'
import { Button } from '@/shared/components/ui/button'

export function useTransformTool(toolId: string) {
  const tool = toolRegistry.get(toolId)
  if (!tool) throw new Error(`Unknown tool: ${toolId}`)
  return tool
}

export function ToolActions({
  value,
  onClear,
  extra,
}: {
  value: string
  onClear: () => void
  extra?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {extra}
      <CopyButton text={value} size="xs" />
      <Button variant="ghost" size="xs" onClick={onClear} disabled={!value}>
        <EraserIcon /> Clear
      </Button>
      <Button
        variant="ghost"
        size="xs"
        disabled={!value.trim()}
        onClick={() => void addClipboardEntry(value)}
      >
        Save to history
      </Button>
    </div>
  )
}

export function StatsBar({ value }: { value: string }) {
  const stats = useTextStats(value)
  return (
    <p className="text-[10px] text-muted-foreground" aria-live="polite">
      {stats.chars} chars · {stats.words} words · {stats.lines} lines
    </p>
  )
}

export function useInputOutput(initial = '') {
  const [input, setInput] = useState(initial)
  const [output, setOutput] = useState('')
  return { input, setInput, output, setOutput }
}
