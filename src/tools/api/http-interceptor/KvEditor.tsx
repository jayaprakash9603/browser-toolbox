import { PlusIcon, XIcon } from 'lucide-react'
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
  keyLabel,
  valueLabel,
  footerHint,
}: {
  rows: ExplorerKv[]
  onChange: (rows: ExplorerKv[]) => void
  keyPlaceholder?: string
  valuePlaceholder?: string
  keyLabel?: string
  valueLabel?: string
  footerHint?: string
}) {
  const { t } = useTranslation()
  const update = (id: string, patch: Partial<ExplorerKv>) =>
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)))

  return (
    <div className="overflow-hidden rounded-lg border bg-muted/20">
      <div className="grid grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-center border-b bg-muted/60 px-3 py-2 text-[11px] font-semibold tracking-wider text-muted-foreground uppercase">
        <div className="flex items-center justify-center">
          <Checkbox disabled className="opacity-40" aria-hidden />
        </div>
        <div>{keyLabel ?? t('interceptor.explorer.col.key')}</div>
        <div>{valueLabel ?? t('interceptor.explorer.col.value')}</div>
        <div className="text-right">{t('interceptor.explorer.col.action')}</div>
      </div>
      <div className="divide-y">
        {rows.map((row) => (
          <div
            key={row.id}
            className="grid grid-cols-[2.25rem_minmax(0,1fr)_minmax(0,1fr)_2.5rem] items-center bg-card px-3 py-1.5 hover:bg-muted/40"
          >
            <div className="flex items-center justify-center">
              <Checkbox
                checked={row.enabled}
                onCheckedChange={(value) => update(row.id, { enabled: value === true })}
                aria-label={t('interceptor.explorer.enableRow')}
              />
            </div>
            <Input
              value={row.key}
              onChange={(event) => update(row.id, { key: event.target.value })}
              placeholder={keyPlaceholder}
              className="h-7 border-0 bg-transparent px-2 shadow-none hover:border-transparent focus-visible:bg-background focus-visible:ring-0 font-mono text-xs"
            />
            <Input
              value={row.value}
              onChange={(event) => update(row.id, { value: event.target.value })}
              placeholder={valuePlaceholder}
              className="h-7 border-0 bg-transparent px-2 shadow-none hover:border-transparent focus-visible:bg-background focus-visible:ring-0 font-mono text-xs"
            />
            <div className="flex items-center justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                className="text-muted-foreground hover:text-destructive"
                aria-label={t('interceptor.explorer.removeRow')}
                onClick={() => onChange(rows.filter((item) => item.id !== row.id))}
              >
                <XIcon />
              </Button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3 border-t bg-card px-3 py-2">
        <Button type="button" variant="ghost" size="xs" className="h-7 px-1.5 text-primary" onClick={() => onChange([...rows, newKv()])}>
          <PlusIcon />
          {t('interceptor.explorer.addRow')}
        </Button>
        {footerHint ? <span className="truncate text-[11px] text-muted-foreground">{footerHint}</span> : null}
      </div>
    </div>
  )
}
