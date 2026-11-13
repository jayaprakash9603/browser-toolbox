import { PlusIcon, Trash2Icon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { newKv } from '@/core/interceptor/apiExplorer'
import type { ExplorerKv } from '@/core/interceptor/apiFinderTypes'
import { Button } from '@/shared/components/ui/button'
import { Checkbox } from '@/shared/components/ui/checkbox'
import { Input } from '@/shared/components/ui/input'

export function KvEditor({
  rows,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}: {
  rows: ExplorerKv[]
  onChange: (rows: ExplorerKv[]) => void
  keyPlaceholder?: string
  valuePlaceholder?: string
}) {
  const { t } = useTranslation()
  const update = (id: string, patch: Partial<ExplorerKv>) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))

  return (
    <div className="flex flex-col gap-1.5">
      {rows.map((row) => (
        <div key={row.id} className="flex items-center gap-1.5">
          <Checkbox
            checked={row.enabled}
            onCheckedChange={(value) => update(row.id, { enabled: value === true })}
            aria-label={t('interceptor.explorer.enableRow')}
          />
          <Input
            value={row.key}
            onChange={(event) => update(row.id, { key: event.target.value })}
            placeholder={keyPlaceholder}
            className="h-7 min-w-0 flex-1 text-xs"
          />
          <Input
            value={row.value}
            onChange={(event) => update(row.id, { value: event.target.value })}
            placeholder={valuePlaceholder}
            className="h-7 min-w-0 flex-1 text-xs"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label={t('interceptor.explorer.removeRow')}
            onClick={() => onChange(rows.filter((item) => item.id !== row.id))}
          >
            <Trash2Icon />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="xs" className="self-start" onClick={() => onChange([...rows, newKv()])}>
        <PlusIcon />
        {t('interceptor.explorer.addRow')}
      </Button>
    </div>
  )
}
