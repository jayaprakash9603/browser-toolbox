import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowLeftRightIcon } from 'lucide-react'

import { convertUnit, UNIT_CATEGORIES } from '@/core/engines/unit'
import { ToolPage } from '@/shared/components/ToolPage'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select'
import { CopyButton } from '@/shared/components/CopyButton'
import { JsonErrorView } from '@/tools/developer/_shared'
import { useCalcTool } from '../_shared'

export default function UnitConverterTool() {
  const { t } = useTranslation()
  const tool = useCalcTool('calculators.unit-converter')
  const [categoryId, setCategoryId] = useState('length')
  const [fromId, setFromId] = useState('km')
  const [toId, setToId] = useState('mi')
  const [value, setValue] = useState('1')

  const category = UNIT_CATEGORIES.find((c) => c.id === categoryId) ?? UNIT_CATEGORIES[0]

  const result = useMemo(() => {
    const num = Number(value)
    if (!value.trim()) return null
    return convertUnit(categoryId, num, fromId, toId)
  }, [categoryId, fromId, toId, value])

  const changeCategory = (id: string) => {
    setCategoryId(id)
    const next = UNIT_CATEGORIES.find((c) => c.id === id)!
    setFromId(next.units[0].id)
    setToId(next.units[1]?.id ?? next.units[0].id)
  }

  return (
    <ToolPage tool={tool}>
      <div className="flex flex-col gap-3">
        <Select value={categoryId} onValueChange={changeCategory}>
          <SelectTrigger aria-label={t('calc.category')}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNIT_CATEGORIES.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-1.5">
          <Input
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="flex-1 font-mono"
            aria-label={t('calc.value')}
          />
          <Select value={fromId} onValueChange={setFromId}>
            <SelectTrigger className="w-28" aria-label={t('calc.from')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {category.units.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => {
              setFromId(toId)
              setToId(fromId)
            }}
            aria-label={t('calc.swap')}
          >
            <ArrowLeftRightIcon />
          </Button>
          <Select value={toId} onValueChange={setToId}>
            <SelectTrigger className="w-28" aria-label={t('calc.to')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {category.units.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {result && !result.ok && <JsonErrorView message={result.error} />}
        {result?.ok && (
          <div className="flex items-center justify-between rounded-md border bg-muted/40 p-2.5">
            <code className="font-mono text-lg font-semibold">{formatNumber(result.value)}</code>
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">
                {category.units.find((u) => u.id === toId)?.name}
              </span>
              <CopyButton text={String(result.value)} />
            </div>
          </div>
        )}
      </div>
    </ToolPage>
  )
}

function formatNumber(value: number): string {
  if (value !== 0 && (Math.abs(value) < 1e-6 || Math.abs(value) >= 1e15))
    return value.toExponential(6)
  return String(Math.round(value * 1e9) / 1e9)
}
