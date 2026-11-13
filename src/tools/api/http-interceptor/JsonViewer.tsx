import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { formatJson, parseJson } from '@/core/engines/json'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'
import { cn } from '@/shared/utils/cn'

import { JsonTree } from './JsonTree'

const LARGE = 400_000

export function JsonViewer({
  value,
  className,
}: {
  value: string
  className?: string
}) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'pretty' | 'raw'>('pretty')
  const [query, setQuery] = useState('')
  const parsed = useMemo(() => parseJson(value), [value])
  const pretty = parsed.ok ? formatJson(value) : null
  const tooLarge = value.length > LARGE
  const display = tooLarge ? `${value.slice(0, LARGE)}\n…` : value

  const copy = () => void navigator.clipboard.writeText(value)

  if (!value) {
    return <p className="text-xs text-muted-foreground">{t('interceptor.viewer.empty')}</p>
  }

  return (
    <div className={cn('flex min-h-0 flex-col gap-2', className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Button type="button" variant={mode === 'pretty' ? 'secondary' : 'ghost'} size="xs" onClick={() => setMode('pretty')}>
          {t('interceptor.viewer.pretty')}
        </Button>
        <Button type="button" variant={mode === 'raw' ? 'secondary' : 'ghost'} size="xs" onClick={() => setMode('raw')}>
          {t('interceptor.viewer.raw')}
        </Button>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t('interceptor.viewer.search')}
          className="h-7 w-36 text-xs"
        />
        <Button type="button" variant="outline" size="xs" onClick={() => void copy()}>
          {t('interceptor.copy.json')}
        </Button>
      </div>
      {tooLarge && <p className="text-[11px] text-amber-700 dark:text-amber-400">{t('interceptor.viewer.tooLarge')}</p>}
      {mode === 'pretty' && parsed.ok ? (
        <div className="min-h-0 overflow-auto rounded-md border bg-muted/20 p-2">
          <JsonTree value={parsed.value} search={query} />
        </div>
      ) : (
        <pre className="min-h-0 overflow-auto whitespace-pre-wrap break-all rounded-md border bg-muted/20 p-2 font-mono text-[11px]">
          {filterText(pretty?.ok ? pretty.value : display, query)}
        </pre>
      )}
      {!parsed.ok && mode === 'pretty' && (
        <p className="text-[11px] text-muted-foreground">{t('interceptor.viewer.notJson')}</p>
      )}
    </div>
  )
}

function filterText(text: string, query: string): string {
  const q = query.trim().toLowerCase()
  if (!q) return text
  return text
    .split('\n')
    .filter((line) => line.toLowerCase().includes(q))
    .join('\n')
}
