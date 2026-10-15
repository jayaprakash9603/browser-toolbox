import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCwIcon } from 'lucide-react'

import {
  generateRows,
  rowsToCsv,
  rowsToJson,
  TEST_DATA_KINDS,
  type TestDataKind,
} from '@/core/engines/testdata'
import { ToolPage } from '@/shared/components/ToolPage'
import { Button } from '@/shared/components/ui/button'
import { NumberField, parseNumberInRange } from '@/shared/components/NumberField'
import { Switch } from '@/shared/components/ui/switch'
import { ToolActions } from '@/tools/text/_shared'
import { useQaTool } from '../_shared'

export default function TestDataGeneratorTool() {
  const { t } = useTranslation()
  const tool = useQaTool('qa.test-data-generator')
  const [selected, setSelected] = useState<Set<TestDataKind>>(new Set(['name', 'email']))
  const [countText, setCountText] = useState('5')
  const count = parseNumberInRange(countText, 1, 1000)
  const [format, setFormat] = useState<'json' | 'csv'>('json')
  const [rows, setRows] = useState<Record<string, string>[]>([])

  const toggle = (kind: TestDataKind) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(kind)) next.delete(kind)
      else next.add(kind)
      return next
    })
  }

  const generate = () => {
    if (count === null) return
    setRows(generateRows([...selected], count))
  }
  const output = rows.length > 0 ? (format === 'json' ? rowsToJson(rows) : rowsToCsv(rows)) : ''

  return (
    <ToolPage tool={tool}>
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="grid grid-cols-3 gap-1.5">
          {TEST_DATA_KINDS.map(({ id, label }) => (
            <label key={id} className="flex items-center gap-1.5 text-xs">
              <Switch
                checked={selected.has(id)}
                onCheckedChange={() => toggle(id)}
                aria-label={label}
              />
              {label}
            </label>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <NumberField
            value={countText}
            onChange={setCountText}
            min={1}
            max={1000}
            className="w-20"
            ariaLabel={t('text.count')}
          />
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={format === 'json' ? 'secondary' : 'outline'}
              onClick={() => setFormat('json')}
            >
              JSON
            </Button>
            <Button
              size="sm"
              variant={format === 'csv' ? 'secondary' : 'outline'}
              onClick={() => setFormat('csv')}
            >
              CSV
            </Button>
          </div>
          <Button size="sm" onClick={generate} disabled={selected.size === 0 || count === null}>
            <RefreshCwIcon /> {t('text.generate')}
          </Button>
        </div>
        {rows.length > 0 && (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="mb-1 flex shrink-0 items-center justify-between">
              <span className="text-xs font-medium">
                {t('text.output')} ({rows.length})
              </span>
              <ToolActions value={output} onClear={() => setRows([])} />
            </div>
            <pre className="scrollbar-both min-h-0 flex-1 overflow-auto rounded-lg border bg-muted/30 p-3 font-mono text-xs leading-relaxed">
              {output}
            </pre>
          </div>
        )}
      </div>
    </ToolPage>
  )
}
