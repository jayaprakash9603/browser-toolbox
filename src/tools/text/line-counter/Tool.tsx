import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ToolPage } from '@/shared/components/ToolPage'
import { TextEditor } from '@/shared/components/TextEditor'
import { ToolActions, useTransformTool } from '../_shared'
import { countLines } from '../word-counter/logic'

export default function LineCounterTool() {
  const { t } = useTranslation()
  const tool = useTransformTool('text.line-counter')
  const [input, setInput] = useState('')
  const counts = useMemo(() => countLines(input), [input])

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <TextEditor
          value={input}
          onChange={setInput}
          placeholder={t('text.pasteToCountLines')}
          ariaLabel={t('text.countInput')}
        />
        <div className="grid grid-cols-3 gap-2">
          <StatCard label={t('text.totalLines')} value={counts.total} />
          <StatCard label={t('text.nonBlank')} value={counts.nonBlank} />
          <StatCard label={t('text.blank')} value={counts.blank} />
        </div>
        <ToolActions value={input} onClear={() => setInput('')} />
      </div>
    </ToolPage>
  )
}

export function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border p-2.5 text-center">
      <p className="text-base font-semibold tabular-nums">{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  )
}
