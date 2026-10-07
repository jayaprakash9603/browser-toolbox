import { AlertTriangleIcon, LightbulbIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { toolRegistry } from '@/core/registry'
import { ErrorState } from '@/shared/components/ErrorState'
import { ToolActions } from '@/tools/text/_shared'

export function useDevTool(toolId: string) {
  const tool = toolRegistry.get(toolId)
  if (!tool) throw new Error(`Unknown tool: ${toolId}`)
  return tool
}

export function JsonErrorView({
  message,
  line,
  column,
  suggestion,
}: {
  message: string
  line?: number
  column?: number
  suggestion?: string
}) {
  const { t } = useTranslation()
  return (
    <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-xs">
      <p className="flex items-center gap-1.5 font-medium text-destructive">
        <AlertTriangleIcon className="size-3.5" />
        {message}
      </p>
      {(line !== undefined || column !== undefined) && (
        <p className="mt-1 text-muted-foreground">
          {t('dev.errorPosition', { line: line ?? '?', column: column ?? '?' })}
        </p>
      )}
      {suggestion && (
        <p className="mt-1 flex items-start gap-1.5 text-muted-foreground">
          <LightbulbIcon className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
          <span>{suggestion}</span>
        </p>
      )}
    </div>
  )
}

export function OutputPane({
  value,
  error,
  onClear,
  mono = true,
}: {
  value: string
  error: string | null
  onClear: () => void
  mono?: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className="flex min-h-0 flex-col">
      <div className="mb-1 flex shrink-0 items-center justify-between">
        <span className="text-xs font-medium">{t('text.output')}</span>
        <ToolActions value={value} onClear={onClear} />
      </div>
      {error ? <ErrorState message={error} /> : null}
      {!error && value && (
        <pre
          className={`max-h-72 overflow-auto rounded-md border bg-muted/40 p-2 text-[11px] ${mono ? 'font-mono' : ''}`}
        >
          {value}
        </pre>
      )}
    </div>
  )
}
