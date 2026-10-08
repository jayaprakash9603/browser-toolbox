import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { BASE_LABELS, bitRepresentation, formatBaseValue, parseBaseValue, type NumberBase } from '@/core/engines/base'
import { ToolPage } from '@/shared/components/ToolPage'
import { Input } from '@/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select'
import { CopyButton } from '@/shared/components/CopyButton'
import { JsonErrorView } from '@/tools/developer/_shared'
import { useCalcTool } from '../_shared'

const BASES: NumberBase[] = [2, 8, 10, 16]

export default function BaseConverterTool() {
  const { t } = useTranslation()
  const tool = useCalcTool('calculators.base-converter')
  const [input, setInput] = useState('')
  const [base, setBase] = useState<NumberBase>(10)

  const parsed = useMemo(() => (input.trim() ? parseBaseValue(input, base) : null), [input, base])

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1.5">
          <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="255" aria-label={t('calc.baseInput')} className="flex-1 font-mono" />
          <Select value={String(base)} onValueChange={(v) => setBase(Number(v) as NumberBase)}>
            <SelectTrigger className="w-32" aria-label={t('calc.fromBase')}><SelectValue /></SelectTrigger>
            <SelectContent>{BASES.map((b) => <SelectItem key={b} value={String(b)}>{BASE_LABELS[b]}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        {parsed && !parsed.ok && <JsonErrorView message={parsed.error} />}
        {parsed?.ok && (
          <div className="space-y-1">
            {BASES.map((b) => (
              <div key={b} className="flex items-center justify-between gap-2 rounded border bg-muted/40 px-2 py-1.5">
                <span className="w-24 text-[11px] font-medium text-muted-foreground">{BASE_LABELS[b]}</span>
                <code className="min-w-0 flex-1 break-all font-mono text-[11px]">{formatBaseValue(parsed.value, b, b === 2 || b === 16)}</code>
                <CopyButton text={formatBaseValue(parsed.value, b)} />
              </div>
            ))}
            <div className="flex items-center justify-between gap-2 rounded border bg-muted/40 px-2 py-1.5">
              <span className="w-24 text-[11px] font-medium text-muted-foreground">{t('calc.bits')}</span>
              <code className="min-w-0 flex-1 break-all font-mono text-[11px]">{bitRepresentation(parsed.value)}</code>
              <CopyButton text={bitRepresentation(parsed.value)} />
            </div>
          </div>
        )}
      </div>
    </ToolPage>
  )
}
