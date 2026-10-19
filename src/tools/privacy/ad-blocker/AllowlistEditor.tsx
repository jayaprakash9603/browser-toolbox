import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { normalizeHostname } from '@/core/adblock'
import { Button } from '@/shared/components/ui/button'
import { Input } from '@/shared/components/ui/input'

export function AllowlistEditor({
  allowlist,
  onChange,
}: {
  allowlist: string[]
  onChange: (next: string[]) => void
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState('')

  const add = () => {
    const host = normalizeHostname(draft)
    if (!host || allowlist.includes(host)) return
    onChange([...allowlist, host])
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder={t('adblock.allowlistPlaceholder')}
          aria-label={t('adblock.allowlistPlaceholder')}
          onKeyDown={(e) => {
            if (e.key === 'Enter') add()
          }}
        />
        <Button type="button" size="sm" variant="outline" onClick={add}>
          {t('adblock.allowlistAdd')}
        </Button>
      </div>
      <ul className="flex flex-col gap-1">
        {allowlist.length === 0 && (
          <li className="text-[11px] text-muted-foreground">{t('adblock.allowlistEmpty')}</li>
        )}
        {allowlist.map((host) => (
          <li
            key={host}
            className="flex items-center justify-between rounded-md border px-2 py-1 text-xs"
          >
            <span className="font-mono">{host}</span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-7 text-destructive"
              onClick={() => onChange(allowlist.filter((h) => h !== host))}
            >
              {t('common.delete')}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
