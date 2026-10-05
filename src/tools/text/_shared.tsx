import { useState } from 'react'
import { EraserIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {extra}
      <CopyButton text={value} size="xs" />
      <Button variant="ghost" size="xs" onClick={onClear} disabled={!value}>
        <EraserIcon /> {t('text.clear')}
      </Button>
      <Button
        variant="ghost"
        size="xs"
        disabled={!value.trim()}
        onClick={() => void addClipboardEntry(value)}
      >
        {t('text.saveHistory')}
      </Button>
    </div>
  )
}

export function StatsBar({ value }: { value: string }) {
  const stats = useTextStats(value)
  const { t } = useTranslation()
  return (
    <p className="text-[10px] text-muted-foreground" aria-live="polite">
      {t('common.chars', { count: stats.chars })} · {t('common.words', { count: stats.words })} · {t('common.lines', { count: stats.lines })}
    </p>
  )
}

export function useInputOutput(initial = '') {
  const [input, setInput] = useState(initial)
  const [output, setOutput] = useState('')
  return { input, setInput, output, setOutput }
}
